from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from database import create_db_and_tables, get_session
from models import (
    JamaahHaji,
    Kriteria, KriteriaCreate, KriteriaRead, KriteriaWithSubs,
    SubKriteria, SubKriteriaCreate, SubKriteriaRead,
)
from spk_ahp import get_ahp_weights


# ─── Startup seed: populate default criteria if table is empty ─────────────

DEFAULT_KRITERIA = [
    {"kode": "C1", "nama": "Usia",           "scope": "KAROM & KARU"},
    {"kode": "C2", "nama": "Kesehatan",      "scope": "KAROM & KARU"},
    {"kode": "C3", "nama": "Jenis Kelamin",  "scope": "KAROM & KARU"},
    {"kode": "C4", "nama": "Pekerjaan",      "scope": "KAROM & KARU"},
    {"kode": "C5", "nama": "Pendidikan",     "scope": "Khusus KAROM"},
    {"kode": "C6", "nama": "Status Haji",    "scope": "Khusus KAROM"},
]

# Default sub-criteria keyed by kode
DEFAULT_SUB_KRITERIA = {
    "C1": [
        {"rentang_nilai": "≥ 60 tahun",    "keterangan": "Sangat Ideal",   "skor": 5},
        {"rentang_nilai": "50–59 tahun",   "keterangan": "Ideal",          "skor": 4},
        {"rentang_nilai": "40–49 tahun",   "keterangan": "Cukup",          "skor": 3},
        {"rentang_nilai": "30–39 tahun",   "keterangan": "Kurang Ideal",   "skor": 2},
        {"rentang_nilai": "< 30 tahun",    "keterangan": "Tidak Ideal",    "skor": 1},
    ],
    "C2": [
        {"rentang_nilai": "Sehat",                         "keterangan": "Sangat Ideal",   "skor": 5},
        {"rentang_nilai": "Istitha'ah / Istithaah",        "keterangan": "Ideal",          "skor": 4},
        {"rentang_nilai": "Pendampingan",                  "keterangan": "Cukup",          "skor": 3},
        {"rentang_nilai": "Resti (Risiko Tinggi)",         "keterangan": "Kurang Ideal",   "skor": 2},
        {"rentang_nilai": "Lainnya",                       "keterangan": "Tidak Ideal",    "skor": 1},
    ],
    "C3": [
        {"rentang_nilai": "Laki-laki",   "keterangan": "Sangat Ideal",   "skor": 5},
        {"rentang_nilai": "Perempuan",   "keterangan": "Kurang Ideal",   "skor": 2},
    ],
    "C4": [
        {"rentang_nilai": "PNS / TNI / POLRI",              "keterangan": "Sangat Ideal",   "skor": 5},
        {"rentang_nilai": "Guru / Dosen / Pegawai",         "keterangan": "Ideal",          "skor": 4},
        {"rentang_nilai": "Wiraswasta / Swasta / Petani",   "keterangan": "Cukup",          "skor": 3},
        {"rentang_nilai": "Lainnya",                        "keterangan": "Kurang Ideal",   "skor": 2},
    ],
    "C5": [
        {"rentang_nilai": "S2 / S3",    "keterangan": "Sangat Ideal",   "skor": 5},
        {"rentang_nilai": "S1 / D4",    "keterangan": "Ideal",          "skor": 4},
        {"rentang_nilai": "SMA / SMK / D3", "keterangan": "Cukup",     "skor": 3},
        {"rentang_nilai": "SMP",        "keterangan": "Kurang Ideal",   "skor": 2},
        {"rentang_nilai": "SD / Lainnya", "keterangan": "Tidak Ideal",  "skor": 1},
    ],
    "C6": [
        {"rentang_nilai": "Belum Pernah Haji",  "keterangan": "Sangat Ideal",   "skor": 5},
        {"rentang_nilai": "Batal / Proses",     "keterangan": "Cukup",          "skor": 3},
        {"rentang_nilai": "Sudah Pernah Haji",  "keterangan": "Tidak Ideal",    "skor": 1},
    ],
}


def seed_kriteria(session: Session):
    existing = session.exec(select(Kriteria)).all()
    if existing:
        return  # already seeded

    # Fetch AHP weights to attach to default criteria
    try:
        weights = get_ahp_weights()
    except Exception:
        weights = {}

    kode_to_weight = {
        "C1": weights.get("C1"), "C2": weights.get("C2"),
        "C3": None, "C4": weights.get("C4"),
        "C5": weights.get("C3"), "C6": weights.get("C5"),
    }

    for item in DEFAULT_KRITERIA:
        kr = Kriteria(
            kode=item["kode"],
            nama=item["nama"],
            scope=item["scope"],
            bobot=kode_to_weight.get(item["kode"]),
        )
        session.add(kr)
    session.commit()

    # Reload to get IDs
    all_kr = session.exec(select(Kriteria)).all()
    kode_to_id = {kr.kode: kr.id for kr in all_kr}

    for kode, subs in DEFAULT_SUB_KRITERIA.items():
        kr_id = kode_to_id.get(kode)
        if not kr_id:
            continue
        for sub in subs:
            session.add(SubKriteria(
                kriteria_id=kr_id,
                rentang_nilai=sub["rentang_nilai"],
                keterangan=sub["keterangan"],
                skor=sub["skor"],
            ))
    session.commit()


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Auto-seed default kriteria
    from database import engine
    with Session(engine) as session:
        seed_kriteria(session)
    yield

app = FastAPI(lifespan=lifespan, title="SPK Haji API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Root ─────────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"message": "Hello dari SPK Haji Backend!"}


# ─── Jamaah Haji ──────────────────────────────────────────────────────────────

from datetime import date as date_type
from fastapi import UploadFile, File
import io, openpyxl

class JamaahCreate(JamaahHaji.__bases__[0]):
    no_porsi: str


@app.get("/jamaah-haji", response_model=List[JamaahHaji])
def read_jamaah_haji(session: Session = Depends(get_session)):
    return session.exec(select(JamaahHaji)).all()


@app.get("/jamaah-haji/konversi")
def read_jamaah_konversi(session: Session = Depends(get_session)):
    """Return jamaah list with C1-C6 conversion scores appended."""
    from spk_profile_matching import konversi_ke_nilai, hitung_umur
    jamaah_list = session.exec(select(JamaahHaji)).all()
    result = []
    for j in jamaah_list:
        skala = konversi_ke_nilai(j)
        result.append({
            "no_porsi": j.no_porsi,
            "nama": j.nama,
            "jenis_kelamin": j.jenis_kelamin,
            "pendidikan": j.pendidikan,
            "pekerjaan": j.pekerjaan,
            "status_haji": j.status_haji,
            "tanggal_lahir": str(j.tanggal_lahir),
            "kesehatan": j.kesehatan,
            "usia": hitung_umur(j.tanggal_lahir),
            "skala": skala,
        })
    return result


@app.post("/jamaah-haji", response_model=JamaahHaji, status_code=201)
def create_jamaah(body: JamaahHaji, session: Session = Depends(get_session)):
    existing = session.get(JamaahHaji, body.no_porsi)
    if existing:
        raise HTTPException(status_code=409, detail="No porsi sudah terdaftar")
    session.add(body)
    session.commit()
    session.refresh(body)
    return body


@app.put("/jamaah-haji/{no_porsi}", response_model=JamaahHaji)
def update_jamaah(no_porsi: str, body: JamaahHaji, session: Session = Depends(get_session)):
    j = session.get(JamaahHaji, no_porsi)
    if not j:
        raise HTTPException(status_code=404, detail="Jamaah tidak ditemukan")
    for field, val in body.model_dump(exclude={"no_porsi"}).items():
        setattr(j, field, val)
    session.add(j)
    session.commit()
    session.refresh(j)
    return j


@app.delete("/jamaah-haji/{no_porsi}", status_code=204)
def delete_jamaah(no_porsi: str, session: Session = Depends(get_session)):
    j = session.get(JamaahHaji, no_porsi)
    if not j:
        raise HTTPException(status_code=404, detail="Jamaah tidak ditemukan")
    session.delete(j)
    session.commit()


@app.delete("/jamaah-haji", status_code=204)
def delete_all_jamaah(session: Session = Depends(get_session)):
    """Wipe all jamaah records (for re-upload)."""
    all_j = session.exec(select(JamaahHaji)).all()
    for j in all_j:
        session.delete(j)
    session.commit()


@app.post("/jamaah-haji/upload", status_code=201)
async def upload_jamaah_excel(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    """
    Bulk-import jamaah haji from an Excel (.xlsx) file.
    Expected columns (in any order, header row 1):
      no_porsi, nama, jenis_kelamin, pendidikan, pekerjaan,
      status_haji, tanggal_lahir (YYYY-MM-DD or Excel date), kesehatan
    Returns count of imported rows.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Hanya file .xlsx yang didukung")

    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        ws = wb.active
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file Excel: {e}")

    # Read header row
    headers = [str(cell.value).strip().lower() if cell.value else "" for cell in next(ws.iter_rows(min_row=1, max_row=1))]

    REQUIRED = {"no_porsi", "nama", "jenis_kelamin", "pendidikan",
                "pekerjaan", "status_haji", "tanggal_lahir", "kesehatan"}
    missing = REQUIRED - set(headers)
    if missing:
        raise HTTPException(status_code=422, detail=f"Kolom tidak ditemukan: {missing}")

    idx = {h: i for i, h in enumerate(headers)}

    imported = 0
    skipped = 0
    errors = []

    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        try:
            no_porsi = str(row[idx["no_porsi"]]).strip() if row[idx["no_porsi"]] is not None else None
            if not no_porsi or no_porsi == "None":
                continue  # skip empty rows

            # Parse tanggal_lahir — may be a date object or string
            tl = row[idx["tanggal_lahir"]]
            if isinstance(tl, (date_type,)):
                tgl = tl
            elif hasattr(tl, "date"):  # datetime
                tgl = tl.date()
            else:
                tgl = date_type.fromisoformat(str(tl).strip())

            # Skip duplicate no_porsi
            if session.get(JamaahHaji, no_porsi):
                skipped += 1
                continue

            j = JamaahHaji(
                no_porsi=no_porsi,
                nama=str(row[idx["nama"]]).strip(),
                jenis_kelamin=str(row[idx["jenis_kelamin"]]).strip(),
                pendidikan=str(row[idx["pendidikan"]]).strip(),
                pekerjaan=str(row[idx["pekerjaan"]]).strip(),
                status_haji=str(row[idx["status_haji"]]).strip(),
                tanggal_lahir=tgl,
                kesehatan=str(row[idx["kesehatan"]]).strip(),
            )
            session.add(j)
            imported += 1
        except Exception as e:
            errors.append(f"Baris {row_num}: {e}")

    session.commit()
    return {"imported": imported, "skipped": skipped, "errors": errors}


@app.get("/spk-result")
def read_spk_result(session: Session = Depends(get_session)):
    from spk_profile_matching import proses_spk
    jamaah_list = session.exec(select(JamaahHaji)).all()
    if not jamaah_list:
        return {"ahp_weights": {}, "rankings": []}
    return proses_spk(jamaah_list)


# ─── AHP Visualisasi ──────────────────────────────────────────────────────────

from spk_ahp import get_full_ahp, compute_ahp
from pydantic import BaseModel

class AhpComputeRequest(BaseModel):
    matrix: list[list[float]]
    labels: list[str]
    codes:  list[str]
    model:  str = "karom"

@app.get("/ahp")
def read_ahp(model: str = "karom"):
    """Return full AHP calculation data for 'karom' (6 criteria) or 'karu' (4 criteria)."""
    return get_full_ahp(model)


@app.post("/ahp/compute")
def recompute_ahp(body: AhpComputeRequest):
    """Recompute AHP from a custom pairwise matrix submitted by the user."""
    n = len(body.matrix)
    if n != len(body.labels) or n != len(body.codes):
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Matrix size must match labels/codes length")
    result = compute_ahp(body.matrix)
    result["labels"] = body.labels
    result["codes"]  = body.codes
    result["model"]  = body.model
    return result


# ─── Profile Matching Visualisasi ────────────────────────────────────────────

class PmRequest(BaseModel):
    model:  str = "karom"
    target: dict | None = None   # optional override, e.g. {"C1": 5, "C2": 4, ...}

@app.get("/pm")
def read_pm(model: str = "karom", session: Session = Depends(get_session)):
    """Return full Profile Matching visualisation data."""
    from spk_profile_matching import proses_pm
    jamaah_list = session.exec(select(JamaahHaji)).all()
    if not jamaah_list:
        from spk_ahp import get_full_ahp, KAROM_CODES, KARU_CODES
        codes = KAROM_CODES if model == "karom" else KARU_CODES
        ahp_data = get_full_ahp(model)
        return {
            "model": model,
            "codes": codes,
            "labels": ahp_data["labels"],
            "ahp_weights": {},
            "target": {c: 5 for c in codes},
            "gap_bobot_table": {0:5.0, 1:4.5, -1:4.0, 2:3.5, -2:3.0, 3:2.5, -3:2.0, 4:1.5, -4:1.0},
            "jamaah_results": [],
        }
    return proses_pm(jamaah_list, model=model)


@app.post("/pm/compute")
def compute_pm(body: PmRequest, session: Session = Depends(get_session)):
    """Recompute profile matching with optional custom target."""
    from spk_profile_matching import proses_pm
    jamaah_list = session.exec(select(JamaahHaji)).all()
    return proses_pm(jamaah_list, model=body.model, target=body.target)

# ─── Kriteria CRUD ────────────────────────────────────────────────────────────

@app.get("/kriteria", response_model=List[KriteriaWithSubs])
def list_kriteria(session: Session = Depends(get_session)):
    kriterias = session.exec(select(Kriteria)).all()
    result = []
    for kr in kriterias:
        subs = session.exec(
            select(SubKriteria).where(SubKriteria.kriteria_id == kr.id)
        ).all()
        result.append(KriteriaWithSubs(
            id=kr.id, kode=kr.kode, nama=kr.nama,
            bobot=kr.bobot, scope=kr.scope,
            sub_kriterias=[SubKriteriaRead(**s.model_dump()) for s in subs],
        ))
    return result


@app.post("/kriteria", response_model=KriteriaRead, status_code=201)
def create_kriteria(body: KriteriaCreate, session: Session = Depends(get_session)):
    kr = Kriteria(**body.model_dump())
    session.add(kr)
    session.commit()
    session.refresh(kr)
    return kr


@app.put("/kriteria/{kr_id}", response_model=KriteriaRead)
def update_kriteria(kr_id: int, body: KriteriaCreate, session: Session = Depends(get_session)):
    kr = session.get(Kriteria, kr_id)
    if not kr:
        raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(kr, field, val)
    session.add(kr)
    session.commit()
    session.refresh(kr)
    return kr


@app.delete("/kriteria/{kr_id}", status_code=204)
def delete_kriteria(kr_id: int, session: Session = Depends(get_session)):
    kr = session.get(Kriteria, kr_id)
    if not kr:
        raise HTTPException(status_code=404, detail="Kriteria tidak ditemukan")
    # Cascade delete sub-kriterias
    subs = session.exec(select(SubKriteria).where(SubKriteria.kriteria_id == kr_id)).all()
    for s in subs:
        session.delete(s)
    session.delete(kr)
    session.commit()


# ─── Sub-Kriteria CRUD ────────────────────────────────────────────────────────

@app.post("/sub-kriteria", response_model=SubKriteriaRead, status_code=201)
def create_sub_kriteria(body: SubKriteriaCreate, session: Session = Depends(get_session)):
    sub = SubKriteria(**body.model_dump())
    session.add(sub)
    session.commit()
    session.refresh(sub)
    return sub


@app.put("/sub-kriteria/{sub_id}", response_model=SubKriteriaRead)
def update_sub_kriteria(sub_id: int, body: SubKriteriaCreate, session: Session = Depends(get_session)):
    sub = session.get(SubKriteria, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-Kriteria tidak ditemukan")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(sub, field, val)
    session.add(sub)
    session.commit()
    session.refresh(sub)
    return sub


@app.delete("/sub-kriteria/{sub_id}", status_code=204)
def delete_sub_kriteria(sub_id: int, session: Session = Depends(get_session)):
    sub = session.get(SubKriteria, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-Kriteria tidak ditemukan")
    session.delete(sub)
    session.commit()
