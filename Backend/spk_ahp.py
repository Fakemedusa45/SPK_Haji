def get_ahp_weights():
    """
    Menghitung bobot kriteria menggunakan Analytical Hierarchy Process (AHP).
    Kriteria:
    C1: Usia
    C2: Kesehatan
    C3: Status Haji
    C4: Pendidikan
    C5: Pekerjaan
    """
    # Matriks perbandingan berpasangan (Pairwise Comparison Matrix)
    # Asumsi skala Saaty: Usia & Kesehatan lebih penting dari yang lain.
    matrix = [
        # C1   C2   C3   C4   C5
        [1,   1,   3,   5,   5], # C1 Usia
        [1,   1,   3,   5,   5], # C2 Kesehatan
        [1/3, 1/3, 1,   3,   3], # C3 Status Haji
        [1/5, 1/5, 1/3, 1,   2], # C4 Pendidikan
        [1/5, 1/5, 1/3, 1/2, 1]  # C5 Pekerjaan
    ]
    
    n = len(matrix)
    
    # 1. Jumlahkan nilai setiap kolom
    col_sums = [sum(matrix[i][j] for i in range(n)) for j in range(n)]
    
    # 2. Normalisasi matriks
    normalized_matrix = [
        [matrix[i][j] / col_sums[j] for j in range(n)] for i in range(n)
    ]
    
    # 3. Hitung bobot rata-rata setiap baris (Eigen Vector)
    weights = [sum(row) / n for row in normalized_matrix]
    
    # Consistency Check (Opsional untuk pembuktian)
    eigenvalue = sum(col_sums[i] * weights[i] for i in range(n))
    ci = (eigenvalue - n) / (n - 1)
    # Nilai RI (Random Index) untuk n=5 adalah 1.12
    cr = ci / 1.12
    print(f"AHP Consistency Ratio (CR): {cr:.4f}")
    
    return {
        "C1": weights[0],
        "C2": weights[1],
        "C3": weights[2],
        "C4": weights[3],
        "C5": weights[4]
    }
