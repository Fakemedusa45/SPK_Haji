from datetime import date
from models import JamaahHaji
from spk_ahp import get_full_ahp, KAROM_CODES, KARU_CODES

# ── Gap → Bobot Nilai table (Tabel 2.2 from thesis) ───────────────────────
GAP_BOBOT = {
    0: 5.0, 1: 4.5, -1: 4.0, 2: 3.5, -2: 3.0,
    3: 2.5, -3: 2.0, 4: 1.5, -4: 1.0, 5: 0.5, -5: 0.0,
}

# Default target profile: semua ideal = 5
DEFAULT_TARGET = {c: 5 for c in KAROM_CODES}


def hitung_umur(tanggal_lahir: date) -> int:
    today = date.today()
    return today.year - tanggal_lahir.year - (
        (today.month, today.day) < (tanggal_lahir.month, tanggal_lahir.day)
    )


def hitung_bobot_gap(gap: int) -> float:
    return GAP_BOBOT.get(gap, 0.0)


def konversi_ke_nilai(jamaah: JamaahHaji) -> dict:
    """
    Converts raw jamaah fields to integer scores 1–5.
    Returns dict {C1..C6} matching KAROM criteria order:
      C1 Usia, C2 Kesehatan, C3 Jenis Kelamin, C4 Pekerjaan,
      C5 Pendidikan, C6 Status Haji
    """
    # C1: Usia
    umur = hitung_umur(jamaah.tanggal_lahir)
    if   umur >= 60: c1 = 5
    elif umur >= 50: c1 = 4
    elif umur >= 40: c1 = 3
    elif umur >= 30: c1 = 2
    else:            c1 = 1

    # C2: Kesehatan
    kes = jamaah.kesehatan.lower()
    if   "sehat" in kes:                              c2 = 5
    elif "istitha" in kes:                            c2 = 4
    elif "pendampingan" in kes or "perlu" in kes:     c2 = 3
    elif "resti" in kes or "risiko" in kes:           c2 = 2
    else:                                             c2 = 1

    # C3: Jenis Kelamin
    jk = jamaah.jenis_kelamin.lower()
    if "laki" in jk:   c3 = 5
    elif "pere" in jk: c3 = 2
    else:              c3 = 2

    # C4: Pekerjaan
    pek = jamaah.pekerjaan.lower()
    if   "pns" in pek or "tni" in pek or "polri" in pek:          c4 = 5
    elif "guru" in pek or "dosen" in pek or "pegawai" in pek:     c4 = 4
    elif "wiraswasta" in pek or "swasta" in pek or "petani" in pek or "pedagang" in pek: c4 = 3
    else:                                                          c4 = 2

    # C5: Pendidikan
    pend = jamaah.pendidikan.lower()
    if   "s2" in pend or "s3" in pend:              c5 = 5
    elif "s1" in pend or "d4" in pend:              c5 = 4
    elif "sma" in pend or "smk" in pend or "d3" in pend: c5 = 3
    elif "smp" in pend:                             c5 = 2
    else:                                            c5 = 1

    # C6: Status Haji
    st = jamaah.status_haji.lower()
    if   "belum" in st: c6 = 5
    elif "batal" in st: c6 = 3
    elif "sudah" in st: c6 = 1
    else:               c6 = 3

    return {"C1": c1, "C2": c2, "C3": c3, "C4": c4, "C5": c5, "C6": c6}


def proses_pm(jamaah_list: list[JamaahHaji], model: str = "karom",
              target: dict | None = None) -> dict:
    """
    Full Profile Matching computation for a list of jamaah.

    Parameters
    ----------
    model  : 'karom' (6 criteria) | 'karu' (4 criteria)
    target : override target profile dict; defaults to all-5

    Returns
    -------
    {
      model, codes, labels, ahp_weights,
      target, gap_bobot_table,
      jamaah_results: [{no_porsi, nama, skala, gap, bobot_gap, skor_terbobot, nilai_akhir}, ...],
      rankings: sorted copy with rank field
    }
    """
    codes  = KAROM_CODES if model == "karom" else KARU_CODES

    ahp_data = get_full_ahp(model)
    weights  = {codes[i]: ahp_data["weights"][i] for i in range(len(codes))}
    labels   = ahp_data["labels"]

    if target is None:
        target = {c: 5 for c in codes}

    results = []
    for jamaah in jamaah_list:
        skala = konversi_ke_nilai(jamaah)
        # Only keep codes for the selected model
        skala_model = {c: skala.get(c, 0) for c in codes}

        gap       = {c: skala_model[c] - target[c] for c in codes}
        bobot_gap = {c: hitung_bobot_gap(gap[c])   for c in codes}

        # Ni = Σ(Wj × Bobot_Gap_ij)
        skor_terbobot = {c: round(weights[c] * bobot_gap[c], 6) for c in codes}
        nilai_akhir   = round(sum(skor_terbobot[c] for c in codes), 4)

        results.append({
            "no_porsi":     jamaah.no_porsi,
            "nama":         jamaah.nama,
            "skala":        skala_model,
            "gap":          gap,
            "bobot_gap":    bobot_gap,
            "skor_terbobot": skor_terbobot,
            "nilai_akhir":  nilai_akhir,
        })

    # Sort by nilai_akhir desc
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


def proses_spk(jamaah_list: list[JamaahHaji]):
    """Legacy wrapper used by /spk-result — returns KAROM results."""
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
