from contextlib import asynccontextmanager
from typing import List
import json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from database import create_db_and_tables, get_session
from models import (
    JamaahHaji,
    Kriteria, KriteriaCreate, KriteriaRead, KriteriaWithSubs,
    SubKriteria, SubKriteriaCreate, SubKriteriaRead,
    AhpSetting,
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
        {"rentang_nilai": "Sudah Pernah Haji",  "keterangan": "Sangat Ideal",   "skor": 5},
        {"rentang_nilai": "Belum Pernah Haji",  "keterangan": "Cukup",          "skor": 3},
        {"rentang_nilai": "Batal / Proses",     "keterangan": "Tidak Ideal",    "skor": 1},
    ],
}


def seed_kriteria(session: Session, force: bool = False):
    existing = session.exec(select(Kriteria)).all()
    if existing and not force:
        return  # already seeded

    if force:
        subs = session.exec(select(SubKriteria)).all()
        for s in subs:
            session.delete(s)
        for k in existing:
            session.delete(k)
        session.commit()

        # Reset ahp_setting so pairwise matrix starts fresh from expert baseline
        ahp_settings = session.exec(select(AhpSetting)).all()
        for a in ahp_settings:
            session.delete(a)
        session.commit()

    # Fetch AHP weights to attach to default criteria
    try:
        weights = get_ahp_weights()
    except Exception:
        weights = {}

    for item in DEFAULT_KRITERIA:
        kr = Kriteria(
            kode=item["kode"],
            nama=item["nama"],
            scope=item["scope"],
            bobot=weights.get(item["kode"]),
        )
        session.add(kr)
    session.commit()

    # Reload to get IDs
    all_kr = session.exec(select(Kriteria).order_by(Kriteria.kode.asc())).all()
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
    return session.exec(
        select(JamaahHaji).order_by(
            JamaahHaji.rombongan.asc(),
            JamaahHaji.regu.asc(),
            JamaahHaji.no_porsi.asc()
        )
    ).all()


@app.get("/jamaah-haji/konversi")
def read_jamaah_konversi(session: Session = Depends(get_session)):
    """Return jamaah list with C1-C6 conversion scores, rombongan, regu, status_aktual."""
    from spk_profile_matching import konversi_ke_nilai, hitung_umur
    jamaah_list = session.exec(
        select(JamaahHaji).order_by(
            JamaahHaji.rombongan.asc(),
            JamaahHaji.regu.asc(),
            JamaahHaji.no_porsi.asc()
        )
    ).all()
    result = []
    for j in jamaah_list:
        skala = konversi_ke_nilai(j)
        result.append({
            "no_porsi":       j.no_porsi,
            "nama":           j.nama,
            "jenis_kelamin":  j.jenis_kelamin,
            "pendidikan":     j.pendidikan,
            "pekerjaan":      j.pekerjaan,
            "status_haji":    j.status_haji,
            "tanggal_lahir":  str(j.tanggal_lahir),
            "kesehatan":      j.kesehatan,
            "usia":           hitung_umur(j.tanggal_lahir),
            "rombongan":      j.rombongan,
            "regu":           j.regu,
            "status_aktual":  j.status_aktual,
            "nilai_tambahan": j.nilai_tambahan,
            "skala":          skala,
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
    from sqlalchemy import text
    session.execute(text("DELETE FROM jamaahhaji;"))
    session.commit()
    return None


@app.post("/jamaah-haji/upload", status_code=201)
async def upload_jamaah_excel(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    """
    Bulk-import jamaah haji dari file Excel SISKOHAT/SISKOHATKES (data.xlsx).

    Kolom dibaca berdasarkan INDEX (bukan header name) karena ada kolom tanpa nama:
      0=No, 1=No Porsi, 2=Nama, 3=Rombongan, 4=Regu,
      5=Status_Aktual (0-Jamaah/5-KARU/4-KAROM), 6=Kabupaten,
      7=Jenis_Kelamin, 8=Tanggal_Lahir, 9=Pendidikan,
      10=Pekerjaan, 11=Status_Haji, 12=Status_Risti

    Data Cleaning: baris dengan '#N/A' atau None di kolom inti (index 7-12) dibuang.
    Nama jemaah disimpan lengkap sesuai data SISKOHAT.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Hanya file .xlsx yang didukung")

    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        ws = wb.active
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file Excel: {e}")

    # Helper — deteksi nilai kosong/tidak valid
    def _is_missing(v) -> bool:
        if v is None:
            return True
        s = str(v).strip()
        return s in ("#N/A", "", "None", "nan", "NaN", "N/A")

    imported          = 0
    skipped_incomplete = 0
    skipped_duplicate  = 0
    errors            = []

    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        # Skip completely blank rows
        if all(v is None for v in row[:13]):
            continue

        try:
            # ── Read by column index ──────────────────────────────────────
            no_porsi_raw  = row[1]
            nama_raw      = row[2]
            rombongan_raw = row[3]
            regu_raw      = row[4]
            status_aktual = str(row[5]).strip() if row[5] is not None else "0-Jamaah"
            # col 6 = Kabupaten — skipped
            jenis_kelamin = row[7]
            tanggal_lahir = row[8]
            pendidikan    = row[9]
            pekerjaan     = row[10]
            status_haji   = row[11]
            status_risti  = row[12]

            # ── Data Cleaning: drop incomplete rows ───────────────────────
            core = [jenis_kelamin, tanggal_lahir, pendidikan,
                    pekerjaan, status_haji, status_risti]
            if any(_is_missing(v) for v in core):
                skipped_incomplete += 1
                continue

            # ── No Porsi & Nama Lengkap ───────────────────────────────────
            if _is_missing(no_porsi_raw):
                continue
            no_porsi = str(no_porsi_raw).strip()
            nama_full = str(nama_raw).strip() if nama_raw else "UNKNOWN"

            # ── Parse tanggal_lahir ───────────────────────────────────────
            if isinstance(tanggal_lahir, date_type):
                tgl = tanggal_lahir
            elif hasattr(tanggal_lahir, "date"):
                tgl = tanggal_lahir.date()
            else:
                tgl = date_type.fromisoformat(str(tanggal_lahir).strip())

            # ── Skip duplicate ────────────────────────────────────────────
            if session.get(JamaahHaji, no_porsi):
                skipped_duplicate += 1
                continue

            j = JamaahHaji(
                no_porsi=no_porsi,
                nama=nama_full,
                jenis_kelamin=str(jenis_kelamin).strip(),
                pendidikan=str(pendidikan).strip(),
                pekerjaan=str(pekerjaan).strip(),
                status_haji=str(status_haji).strip(),
                tanggal_lahir=tgl,
                kesehatan=str(status_risti).strip(),   # Status Risti → field kesehatan
                rombongan=int(rombongan_raw) if rombongan_raw is not None else None,
                regu=int(regu_raw) if regu_raw is not None else None,
                status_aktual=status_aktual,
            )
            session.add(j)
            imported += 1

        except Exception as e:
            errors.append(f"Baris {row_num}: {e}")

    session.commit()

    total_raw = imported + skipped_incomplete + skipped_duplicate + len(errors)
    return {
        "imported":           imported,
        "skipped":            skipped_duplicate,          # backward compat
        "skipped_incomplete": skipped_incomplete,
        "skipped_duplicate":  skipped_duplicate,
        "errors":             errors,
        "preprocessing_summary": {
            "total_baris_mentah":        total_raw,
            "data_tidak_lengkap_dibuang": skipped_incomplete,
            "data_duplikat_dilewati":    skipped_duplicate,
            "data_bersih_siap_hitung":   imported,
        },
    }


@app.get("/spk-result")
def read_spk_result(session: Session = Depends(get_session)):
    from spk_profile_matching import proses_spk
    jamaah_list = session.exec(
        select(JamaahHaji).order_by(
            JamaahHaji.rombongan.asc(),
            JamaahHaji.regu.asc(),
            JamaahHaji.no_porsi.asc()
        )
    ).all()
    if not jamaah_list:
        return {"ahp_weights": {}, "rankings": []}
    criteria_list = session.exec(select(Kriteria).order_by(Kriteria.id.asc())).all()
    setting = session.get(AhpSetting, "karom")
    saved_matrix = json.loads(setting.matrix_json) if (setting and setting.matrix_json) else None
    saved_target = json.loads(setting.target_json) if (setting and setting.target_json) else None
    return proses_spk(jamaah_list, criteria_list=criteria_list, saved_matrix=saved_matrix, target=saved_target)


# ─── AHP Visualisasi ──────────────────────────────────────────────────────────

from spk_ahp import get_full_ahp, compute_ahp
from pydantic import BaseModel

class AhpComputeRequest(BaseModel):
    matrix: list[list[float]]
    labels: list[str]
    codes:  list[str]
    model:  str = "karom"

@app.get("/ahp")
def read_ahp(model: str = "karom", session: Session = Depends(get_session)):
    """Return full AHP calculation data for 'karom' or 'karu' dynamically incorporating any custom criteria and saved matrix."""
    from spk_ahp import get_dynamic_ahp
    criteria_list = session.exec(select(Kriteria).order_by(Kriteria.id.asc())).all()
    setting = session.get(AhpSetting, model)
    saved_matrix = None
    if setting and setting.matrix_json:
        try:
            saved_matrix = json.loads(setting.matrix_json)
        except Exception:
            saved_matrix = None
    return get_dynamic_ahp(model, criteria_list, saved_matrix=saved_matrix)


@app.post("/ahp/compute")
def recompute_ahp(body: AhpComputeRequest, session: Session = Depends(get_session)):
    """Recompute AHP from a custom pairwise matrix submitted by the user and persist matrix and weights."""
    n = len(body.matrix)
    if n != len(body.labels) or n != len(body.codes):
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Matrix size must match labels/codes length")
    result = compute_ahp(body.matrix)
    result["labels"] = body.labels
    result["codes"]  = body.codes
    result["model"]  = body.model

    is_consistent = result.get("consistent", False)

    # 1. Save matrix draft into ahp_setting table so edits persist across visits
    setting = session.get(AhpSetting, body.model)
    if not setting:
        setting = AhpSetting(model=body.model, matrix_json=json.dumps(body.matrix))
    else:
        setting.matrix_json = json.dumps(body.matrix)

    if is_consistent:
        # Only lock and propagate weights when CR <= 0.10
        setting.weights_json = json.dumps(result["weights"])
        session.add(setting)

        # 2. Persist updated weights into kriteria table
        for idx, c in enumerate(body.codes):
            kr = session.exec(select(Kriteria).where(Kriteria.kode == c)).first()
            if kr:
                kr.bobot = result["weights"][idx]
                session.add(kr)
        session.commit()
        result["saved"] = True
        result["locked"] = True
        result["message"] = "Matriks konsisten (CR ≤ 0.10). Bobot berhasil dikunci dan disimpan ke database."
    else:
        # Inconsistent matrix: save draft matrix, but block locking invalid weights into system
        session.add(setting)
        session.commit()
        result["saved"] = False
        result["locked"] = False
        result["message"] = f"Matriks tidak konsisten (CR = {result['CR']:.4f} > 0.10). Bobot tidak dikunci ke sistem sampai matriks diperbaiki."

    return result


@app.post("/ahp/reset")
def reset_ahp(model: str = "karom", session: Session = Depends(get_session)):
    """Reset AHP matrix for the given model back to the default expert matrix."""
    setting = session.get(AhpSetting, model)
    if setting:
        session.delete(setting)
        session.commit()
    from spk_ahp import get_dynamic_ahp
    criteria_list = session.exec(select(Kriteria).order_by(Kriteria.id.asc())).all()
    data = get_dynamic_ahp(model, criteria_list, saved_matrix=None)
    for idx, c in enumerate(data["codes"]):
        kr = session.exec(select(Kriteria).where(Kriteria.kode == c)).first()
        if kr:
            kr.bobot = data["weights"][idx]
            session.add(kr)
    session.commit()
    return data


# ─── Profile Matching Visualisasi ────────────────────────────────────────────

class PmRequest(BaseModel):
    model:  str = "karom"
    target: dict | None = None   # optional override, e.g. {"C1": 5, "C2": 4, ...}

@app.get("/pm")
def read_pm(model: str = "karom", session: Session = Depends(get_session)):
    """Return full Profile Matching visualisation data with persisted custom target."""
    from spk_profile_matching import proses_pm
    jamaah_list = session.exec(
        select(JamaahHaji).order_by(
            JamaahHaji.rombongan.asc(),
            JamaahHaji.regu.asc(),
            JamaahHaji.no_porsi.asc()
        )
    ).all()
    criteria_list = session.exec(select(Kriteria).order_by(Kriteria.id.asc())).all()
    setting = session.get(AhpSetting, model)
    saved_matrix = None
    saved_target = None
    if setting:
        if setting.matrix_json:
            try:
                saved_matrix = json.loads(setting.matrix_json)
            except Exception:
                saved_matrix = None
        if setting.target_json:
            try:
                saved_target = json.loads(setting.target_json)
            except Exception:
                saved_target = None

    if not jamaah_list:
        from spk_ahp import get_dynamic_ahp
        ahp_data = get_dynamic_ahp(model, criteria_list, saved_matrix=saved_matrix)
        codes = ahp_data["codes"]
        target_val = saved_target or {c: 5 for c in codes}
        return {
            "model": model,
            "codes": codes,
            "labels": ahp_data["labels"],
            "ahp_weights": {codes[i]: ahp_data["weights"][i] for i in range(len(codes))},
            "target": target_val,
            "gap_bobot_table": {0:5.0, 1:4.5, -1:4.0, 2:3.5, -2:3.0, 3:2.5, -3:2.0, 4:1.5, -4:1.0},
            "jamaah_results": [],
        }
    return proses_pm(jamaah_list, model=model, target=saved_target, criteria_list=criteria_list, saved_matrix=saved_matrix)


@app.post("/pm/compute")
def compute_pm(body: PmRequest, session: Session = Depends(get_session)):
    """Recompute profile matching with custom target and persist target across pages."""
    from spk_profile_matching import proses_pm
    jamaah_list = session.exec(
        select(JamaahHaji).order_by(
            JamaahHaji.rombongan.asc(),
            JamaahHaji.regu.asc(),
            JamaahHaji.no_porsi.asc()
        )
    ).all()
    criteria_list = session.exec(select(Kriteria).order_by(Kriteria.id.asc())).all()
    setting = session.get(AhpSetting, body.model)
    saved_matrix = None
    if not setting:
        setting = AhpSetting(model=body.model, matrix_json="")
    else:
        if setting.matrix_json:
            try:
                saved_matrix = json.loads(setting.matrix_json)
            except Exception:
                saved_matrix = None

    if body.target:
        setting.target_json = json.dumps(body.target)
        session.add(setting)
        session.commit()

    return proses_pm(jamaah_list, model=body.model, target=body.target, criteria_list=criteria_list, saved_matrix=saved_matrix)


@app.post("/pm/reset-target")
def reset_pm_target(model: str = "karom", session: Session = Depends(get_session)):
    """Reset Profile Matching target profile back to default (all 5)."""
    setting = session.get(AhpSetting, model)
    if setting and setting.target_json:
        setting.target_json = None
        session.add(setting)
        session.commit()
    return read_pm(model=model, session=session)

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
    existing = session.exec(select(Kriteria)).all()
    existing_codes = {k.kode.upper() for k in existing}
    kode = (body.kode or "").strip().upper()
    if not kode or kode in existing_codes:
        import re
        nums = []
        for k in existing:
            m = re.match(r"C(\d+)", k.kode, re.IGNORECASE)
            if m:
                nums.append(int(m.group(1)))
        next_num = (max(nums) + 1) if nums else 1
        kode = f"C{next_num}"

    kr_data = body.model_dump()
    kr_data["kode"] = kode
    kr = Kriteria(**kr_data)
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


@app.post("/kriteria/reset-default", response_model=List[KriteriaWithSubs])
def reset_kriteria_to_default(session: Session = Depends(get_session)):
    """Reset all criteria and sub-criteria back to the 6 default criteria and baseline weights."""
    seed_kriteria(session, force=True)
    return list_kriteria(session)


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


# ─── Pengujian Sistem — Sensitivity + Spearman + Pearson ─────────────────────

@app.get("/evaluation")
def read_evaluation(session: Session = Depends(get_session)):
    """
    Run 12-scenario sensitivity analysis (±1 / ±2 on each of C1–C6 for KAROM),
    compute Spearman (rank stability) and Pearson (score linearity) correlations,
    incorporating dynamic criteria and active AHP weights.
    Subbab 3.8 — Persamaan 2.9 (S%) & Persamaan 2.10 (rₛ).
    """
    from spk_evaluation import run_evaluation
    jamaah_list = session.exec(
        select(JamaahHaji).order_by(
            JamaahHaji.rombongan.asc(),
            JamaahHaji.regu.asc(),
            JamaahHaji.no_porsi.asc()
        )
    ).all()
    criteria_list = session.exec(select(Kriteria).order_by(Kriteria.id.asc())).all()
    setting = session.get(AhpSetting, "karom")
    saved_matrix = json.loads(setting.matrix_json) if (setting and setting.matrix_json) else None
    target = json.loads(setting.target_json) if (setting and getattr(setting, "target_json", None)) else None

    setting_karu = session.get(AhpSetting, "karu")
    saved_matrix_karu = json.loads(setting_karu.matrix_json) if (setting_karu and setting_karu.matrix_json) else None
    target_karu = json.loads(setting_karu.target_json) if (setting_karu and getattr(setting_karu, "target_json", None)) else None

    if not jamaah_list:
        empty_cm_mode = {
            "tp": 0, "tn": 0, "fp": 0, "fn": 0, "total": 0,
            "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1_score": 0.0,
            "group_comparisons": [], "items": [],
        }
        return {
            "model": "karom",
            "codes": [],
            "labels": [],
            "base_weights": {},
            "n_scenarios": 0,
            "scenarios": [],
            "summary": {
                "avg_sensitivity": 0.0,
                "avg_spearman": 0.0,
                "avg_pearson": 0.0,
                "interp_spearman": "—",
                "interp_pearson": "—",
                "robust": False,
                "model": "karom",
            },
            "confusion_matrix": {
                "karom": empty_cm_mode,
                "karu": empty_cm_mode,
                "gabungan": empty_cm_mode,
            },
        }
    return run_evaluation(
        jamaah_list,
        criteria_list=criteria_list,
        saved_matrix=saved_matrix,
        target=target,
        saved_matrix_karu=saved_matrix_karu,
        target_karu=target_karu,
    )
