"""
Profile Matching computation — menggunakan rules konversi tepat sesuai data.xlsx (SISKOHAT).
Kolom C2 Kesehatan berasal dari kolom 'Status Risti', bukan 'Kesehatan' umum.
"""
from datetime import date
import json
from models import JamaahHaji
from spk_ahp import get_full_ahp, get_dynamic_ahp, KAROM_CODES, KARU_CODES

# ── Gap → Bobot Nilai table (Tabel 2.2 from thesis) ───────────────────────
GAP_BOBOT = {
    0: 5.0, 1: 4.5, -1: 4.0, 2: 3.5, -2: 3.0,
    3: 2.5, -3: 2.0, 4: 1.5, -4: 1.0, 5: 0.5, -5: 0.0,
}

# Tahun referensi perhitungan usia (tahun keberangkatan haji)
HAJJ_YEAR = 2026

DEFAULT_TARGET = {c: 5 for c in KAROM_CODES}


def hitung_umur(tanggal_lahir: date) -> int:
    """Hitung usia relatif terhadap tahun haji 2026-01-01."""
    ref = date(HAJJ_YEAR, 1, 1)
    return ref.year - tanggal_lahir.year - (
        (ref.month, ref.day) < (tanggal_lahir.month, tanggal_lahir.day)
    )


def hitung_bobot_gap(gap: int) -> float:
    return GAP_BOBOT.get(gap, 0.0)


def konversi_ke_nilai(jamaah: JamaahHaji) -> dict:
    """
    Konversi field jamaah ke skor integer 1–5 sesuai rules data.xlsx (SISKOHAT).

    C1 Usia          — dari tanggal_lahir, referensi tahun 2026
    C2 Kesehatan     — dari kolom 'Status Risti' (tersimpan di field kesehatan)
    C3 Jenis Kelamin — dari kolom 'Jenis Kelamin' (L / P)
    C4 Pekerjaan     — dari kolom 'Pekerjaan' (nilai exact SISKOHAT)
    C5 Pendidikan    — dari kolom 'Pendidikan' (nilai exact SISKOHAT, khusus KAROM)
    C6 Status Haji   — dari kolom 'Status Haji' (Sudah / Belum, khusus KAROM)
    """
    # ── C1: Usia ────────────────────────────────────────────────────────────
    umur = hitung_umur(jamaah.tanggal_lahir)
    if   40 <= umur <= 50: c1 = 5   # Sangat Ideal
    elif 30 <= umur <= 39: c1 = 4   # Ideal
    elif 51 <= umur <= 60: c1 = 3   # Cukup
    elif umur < 30:        c1 = 2   # Kurang Ideal
    else:                  c1 = 1   # Tidak Disarankan (> 60, Lansia)

    # ── C2: Kesehatan (dari Status Risti) ───────────────────────────────────
    kes = jamaah.kesehatan.strip().lower()
    if   "tidak risti" in kes or "tidak risiko" in kes: c2 = 5  # Sangat Baik
    elif "ringan" in kes:                               c2 = 4  # Baik
    elif "sedang" in kes:                               c2 = 3  # Cukup
    elif "berat" in kes:                                c2 = 1  # Kurang
    else:                                               c2 = 3  # fallback Cukup

    # ── C3: Jenis Kelamin ───────────────────────────────────────────────────
    jk = jamaah.jenis_kelamin.strip().upper()
    if   jk in ("L", "LAKI-LAKI"):   c3 = 5   # Sangat Sesuai
    elif jk in ("P", "PEREMPUAN"):   c3 = 3   # Kurang Sesuai
    else:                             c3 = 3

    # ── C4: Pekerjaan ───────────────────────────────────────────────────────
    pek = jamaah.pekerjaan.strip().lower()
    if any(x in pek for x in ["tni", "polri", "pegawai negri sipil",
                               "pegawai negeri", "pns", "asn"]):
        c4 = 5   # Sangat Baik
    elif any(x in pek for x in ["bumn", "bumd", "guru", "dosen"]):
        c4 = 4   # Baik
    elif any(x in pek for x in ["swasta", "dagang", "wiraswasta"]):
        c4 = 3   # Cukup
    elif any(x in pek for x in ["tani", "nelayan", "petani", "buruh",
                                 "pensiunan", "lainnya"]):
        c4 = 2   # Kurang
    elif any(x in pek for x in ["ibu rumah tangga", "pelajar",
                                 "mahasiswa", "tidak bekerja"]):
        c4 = 1   # Sangat Kurang
    else:
        c4 = 2   # fallback

    # ── C5: Pendidikan ──────────────────────────────────────────────────────
    pend = jamaah.pendidikan.strip().lower()
    if any(x in pend for x in ["s3", "s2", "s1"]):
        c5 = 5   # Sangat Baik
    elif any(x in pend for x in ["d1", "d2", "d3", "d4", " sm", "diploma"]):
        c5 = 4   # Baik
    elif any(x in pend for x in ["slta", "sma", "smk"]):
        c5 = 3   # Cukup
    elif any(x in pend for x in ["sltp", "smp"]):
        c5 = 2   # Kurang
    elif any(x in pend for x in ["sd", "tidak tamat"]):
        c5 = 1   # Sangat Kurang
    else:
        c5 = 1   # fallback

    # ── C6: Status Haji ─────────────────────────────────────────────────────
    st = jamaah.status_haji.strip().lower()
    if   "sudah" in st or "pernah" in st: c6 = 5   # Sangat Ideal
    elif "belum" in st:                   c6 = 3   # Cukup
    else:                                 c6 = 3

    res = {"C1": c1, "C2": c2, "C3": c3, "C4": c4, "C5": c5, "C6": c6}
    if getattr(jamaah, "nilai_tambahan", None):
        try:
            extra = json.loads(jamaah.nilai_tambahan) if isinstance(jamaah.nilai_tambahan, str) else jamaah.nilai_tambahan
            if isinstance(extra, dict):
                for k, v in extra.items():
                    try:
                        res[k] = int(v)
                    except (ValueError, TypeError):
                        pass
        except Exception:
            pass
    return res


def proses_pm(jamaah_list: list, model: str = "karom",
              target: dict | None = None,
              criteria_list: list | None = None,
              saved_matrix: list | None = None) -> dict:
    """
    Full Profile Matching computation, incorporating dynamic criteria and saved matrix.

    Parameters
    ----------
    jamaah_list   : list[JamaahHaji]
    model         : 'karom' | 'karu'
    target        : override target profile; defaults to semua-5
    criteria_list : list[Kriteria] from database (optional)
    saved_matrix  : custom saved AHP matrix (optional)

    Returns
    -------
    dict dengan model, codes, labels, ahp_weights, target, gap_bobot_table,
    jamaah_results (sorted desc by nilai_akhir, dengan rank)
    """
    ahp_data = get_dynamic_ahp(model, criteria_list, saved_matrix=saved_matrix)
    codes    = ahp_data["codes"]
    weights  = {codes[i]: ahp_data["weights"][i] for i in range(len(codes))}
    labels   = ahp_data["labels"]

    if target is None:
        target = {c: 5 for c in codes}

    results = []
    for jamaah in jamaah_list:
        skala       = konversi_ke_nilai(jamaah)
        skala_model = {c: skala.get(c, 3) for c in codes}
        gap         = {c: skala_model[c] - target.get(c, 5) for c in codes}
        bobot_gap   = {c: hitung_bobot_gap(gap[c])   for c in codes}
        skor_terbobot = {c: round(weights[c] * bobot_gap[c], 6) for c in codes}
        nilai_akhir   = round(sum(skor_terbobot[c] for c in codes), 4)

        results.append({
            "no_porsi":      jamaah.no_porsi,
            "nama":          jamaah.nama,
            "rombongan":     jamaah.rombongan,
            "regu":          jamaah.regu,
            "status_aktual": jamaah.status_aktual,
            "skala":         skala_model,
            "gap":           gap,
            "bobot_gap":     bobot_gap,
            "skor_terbobot": skor_terbobot,
            "nilai_akhir":   nilai_akhir,
        })

    # Sort descending
    results.sort(key=lambda x: x["nilai_akhir"], reverse=True)
    for idx, r in enumerate(results):
        r["rank"] = idx + 1

    return {
        "model":           model,
        "codes":           codes,
        "labels":          labels,
        "ahp_weights":     {c: round(weights[c], 6) for c in codes},
        "target":          target,
        "gap_bobot_table": GAP_BOBOT,
        "jamaah_results":  results,
    }


def proses_spk(jamaah_list: list):
    """Legacy wrapper — returns KAROM results."""
    data = proses_pm(jamaah_list, model="karom")
    return {
        "ahp_weights": data["ahp_weights"],
        "rankings": [
            {
                "no_porsi":       r["no_porsi"],
                "nama":           r["nama"],
                "nilai_konversi": r["skala"],
                "bobot_gap":      r["bobot_gap"],
                "skor_akhir":     r["nilai_akhir"],
                "rank":           r["rank"],
            }
            for r in data["jamaah_results"]
        ],
    }
