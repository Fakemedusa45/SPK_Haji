from datetime import date
from models import JamaahHaji
from spk_ahp import get_ahp_weights

def hitung_umur(tanggal_lahir: date) -> int:
    today = date.today()
    return today.year - tanggal_lahir.year - ((today.month, today.day) < (tanggal_lahir.month, tanggal_lahir.day))

def konversi_ke_nilai(jamaah: JamaahHaji):
    # C1: Usia
    umur = hitung_umur(jamaah.tanggal_lahir)
    if umur >= 60: c1 = 5
    elif umur >= 50: c1 = 4
    elif umur >= 40: c1 = 3
    elif umur >= 30: c1 = 2
    else: c1 = 1
    
    # C2: Kesehatan
    kesehatan = jamaah.kesehatan.lower()
    if "sehat" in kesehatan: c2 = 5
    elif "istitha'ah" in kesehatan or "istithaah" in kesehatan: c2 = 4
    elif "pendampingan" in kesehatan: c2 = 3
    elif "resti" in kesehatan: c2 = 2
    else: c2 = 1

    # C3: Status Haji
    status = jamaah.status_haji.lower()
    if "belum" in status: c3 = 5
    elif "batal" in status: c3 = 3
    elif "sudah" in status: c3 = 1
    else: c3 = 3

    # C4: Pendidikan
    pend = jamaah.pendidikan.lower()
    if "s2" in pend or "s3" in pend: c4 = 5
    elif "s1" in pend or "d4" in pend: c4 = 4
    elif "sma" in pend or "smk" in pend or "d3" in pend: c4 = 3
    elif "smp" in pend: c4 = 2
    else: c4 = 1

    # C5: Pekerjaan
    pek = jamaah.pekerjaan.lower()
    if "pns" in pek or "tni" in pek or "polri" in pek: c5 = 5
    elif "guru" in pek or "dosen" in pek or "pegawai" in pek: c5 = 4
    elif "wiraswasta" in pek or "swasta" in pek or "petani" in pek or "pedagang" in pek: c5 = 3
    else: c5 = 2

    return {"C1": c1, "C2": c2, "C3": c3, "C4": c4, "C5": c5}

def hitung_bobot_gap(gap: int) -> float:
    # Tabel Bobot GAP standar Profile Matching
    bobot_gap = {
        0: 5.0, 1: 4.5, -1: 4.0, 2: 3.5, -2: 3.0,
        3: 2.5, -3: 2.0, 4: 1.5, -4: 1.0, 5: 0.5, -5: 0.0
    }
    return bobot_gap.get(gap, 0.0)

def proses_spk(jamaah_list: list[JamaahHaji]):
    # Target Nilai Profil ideal untuk masing-masing kriteria
    target = {"C1": 5, "C2": 5, "C3": 5, "C4": 4, "C5": 4}
    
    # Ambil bobot prioritas kriteria dari AHP
    ahp_weights = get_ahp_weights()
    
    hasil = []
    
    for jamaah in jamaah_list:
        nilai = konversi_ke_nilai(jamaah)
        
        # 1. Hitung GAP dan Bobot GAP untuk Profile Matching
        bobot_gap = {}
        for c in ["C1", "C2", "C3", "C4", "C5"]:
            gap = nilai[c] - target[c]
            bobot_gap[c] = hitung_bobot_gap(gap)
            
        # 2. Perhitungan Total Skor Gabungan (AHP x Profile Matching Gap)
        skor_akhir = (
            (ahp_weights["C1"] * bobot_gap["C1"]) +
            (ahp_weights["C2"] * bobot_gap["C2"]) +
            (ahp_weights["C3"] * bobot_gap["C3"]) +
            (ahp_weights["C4"] * bobot_gap["C4"]) +
            (ahp_weights["C5"] * bobot_gap["C5"])
        )
        
        hasil.append({
            "no_porsi": jamaah.no_porsi,
            "nama": jamaah.nama,
            "usia": hitung_umur(jamaah.tanggal_lahir),
            "kesehatan": jamaah.kesehatan,
            "status_haji": jamaah.status_haji,
            "nilai_konversi": nilai,
            "bobot_gap": bobot_gap,
            "skor_akhir": round(skor_akhir, 4)
        })
        
    # 3. Urutkan berdasarkan skor_akhir tertinggi (Perankingan)
    hasil.sort(key=lambda x: x["skor_akhir"], reverse=True)
    
    # Tambahkan informasi rank
    for idx, item in enumerate(hasil):
        item["rank"] = idx + 1
        
    return {
        "ahp_weights": {k: round(v, 4) for k, v in ahp_weights.items()},
        "rankings": hasil
    }
