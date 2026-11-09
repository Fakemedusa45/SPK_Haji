# ─── Expert pairwise comparison matrices (from thesis Lampiran 3) ──────────
# KAROM model: 6 criteria C1–C6 (Usia, Kesehatan, Jenis Kelamin, Pekerjaan, Pendidikan, Status Haji)
KAROM_MATRIX_EXPERT = [
    #C1    C2    C3    C4    C5    C6
    [1,    2,    5,    5,    7,    7],   # C1 Usia
    [1/2,  1,    4,    4,    6,    6],   # C2 Kesehatan
    [1/5,  1/4,  1,    2,    3,    3],   # C3 Jenis Kelamin
    [1/5,  1/4,  1/2,  1,    2,    3],   # C4 Pekerjaan
    [1/7,  1/6,  1/3,  1/2,  1,    2],   # C5 Pendidikan
    [1/7,  1/6,  1/3,  1/3,  1/2,  1],   # C6 Status Haji
]

# KARU model: 4 criteria C1–C4 (Usia, Kesehatan, Jenis Kelamin, Pekerjaan)
KARU_MATRIX_EXPERT = [
    #C1    C2    C3    C4
    [1,    2,    5,    5],   # C1 Usia
    [1/2,  1,    4,    4],   # C2 Kesehatan
    [1/5,  1/4,  1,    2],   # C3 Jenis Kelamin
    [1/5,  1/4,  1/2,  1],   # C4 Pekerjaan
]

# Saaty RI table: index = n
_RI = {
    1: 0.00, 2: 0.00, 3: 0.58, 4: 0.90, 5: 1.12,
    6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
    11: 1.51, 12: 1.48, 13: 1.56, 14: 1.57, 15: 1.59
}

KAROM_LABELS = ["Usia (C1)", "Kesehatan (C2)", "Jenis Kelamin (C3)",
                "Pekerjaan (C4)", "Pendidikan (C5)", "Status Haji (C6)"]
KARU_LABELS  = ["Usia (C1)", "Kesehatan (C2)", "Jenis Kelamin (C3)", "Pekerjaan (C4)"]
KAROM_CODES  = ["C1", "C2", "C3", "C4", "C5", "C6"]
KARU_CODES   = ["C1", "C2", "C3", "C4"]


def compute_ahp(matrix: list[list[float]]) -> dict:
    """
    Full AHP computation from a pairwise comparison matrix.
    Returns: matrix, col_sums, normalized_matrix, row_sums, weights,
             lambda_max, CI, RI, CR, consistent.
    """
    n = len(matrix)

    # Column sums
    col_sums = [sum(matrix[i][j] for i in range(n)) for j in range(n)]

    # Normalized matrix: each cell / col_sum
    norm = [
        [matrix[i][j] / col_sums[j] for j in range(n)]
        for i in range(n)
    ]

    # Row sums of normalized matrix
    row_sums = [sum(norm[i]) for i in range(n)]

    # Eigen Vector (priority weights) = row_sum / n
    weights = [rs / n for rs in row_sums]

    # λmax = Σ(col_sum[j] * weight[j])
    lambda_max = sum(col_sums[j] * weights[j] for j in range(n))

    # Consistency Index
    ci = (lambda_max - n) / (n - 1)

    # Random Index from Saaty table
    ri = _RI.get(n, 1.24)

    # Consistency Ratio
    cr = ci / ri if ri > 0 else 0.0

    return {
        "matrix":      matrix,
        "col_sums":    col_sums,
        "norm_matrix": norm,
        "row_sums":    row_sums,
        "weights":     weights,
        "lambda_max":  round(lambda_max, 6),
        "CI":          round(ci, 6),
        "RI":          ri,
        "CR":          round(cr, 6),
        "consistent":  cr <= 0.10,
        "n":           n,
    }


def get_ahp_weights():
    """Legacy helper: returns {C1..C6} weight map for KAROM model."""
    result = compute_ahp(KAROM_MATRIX_EXPERT)
    weights = result["weights"]
    codes = KAROM_CODES
    return {codes[i]: weights[i] for i in range(len(codes))}


def get_full_ahp(model: str = "karom") -> dict:
    """
    Returns complete AHP visualisation data for 'karom' or 'karu'.
    """
    if model == "karu":
        matrix = [row[:] for row in KARU_MATRIX_EXPERT]
        labels = KARU_LABELS
        codes  = KARU_CODES
    else:
        matrix = [row[:] for row in KAROM_MATRIX_EXPERT]
        labels = KAROM_LABELS
        codes  = KAROM_CODES

    result = compute_ahp(matrix)
    result["labels"] = labels
    result["codes"]  = codes
    result["model"]  = model
    return result


def get_dynamic_ahp(model: str = "karom", criteria_list: list = None, saved_matrix: list = None) -> dict:
    """
    Returns complete AHP calculation data for 'karom' or 'karu',
    dynamically incorporating any custom criteria from the database
    and any saved custom matrix.
    """
    if not criteria_list:
        return get_full_ahp(model)

    # Filter criteria based on model scope
    if model == "karu":
        active = [k for k in criteria_list if (getattr(k, 'scope', '') or '').strip().upper() == 'KAROM & KARU']
    else:
        active = [k for k in criteria_list if (getattr(k, 'scope', '') or '').strip().upper() in ('KAROM & KARU', 'KHUSUS KAROM')]

    if not active:
        return get_full_ahp(model)

    expert_ref = KARU_MATRIX_EXPERT if model == "karu" else KAROM_MATRIX_EXPERT
    expert_codes = KARU_CODES if model == "karu" else KAROM_CODES

    codes = [k.kode for k in active]
    labels = [f"{k.nama} ({k.kode})" for k in active]
    n = len(codes)

    matrix = [[1.0] * n for _ in range(n)]

    if saved_matrix and isinstance(saved_matrix, list) and len(saved_matrix) > 0:
        sm_len = len(saved_matrix)
        for i in range(n):
            for j in range(n):
                if i == j:
                    matrix[i][j] = 1.0
                elif i < sm_len and j < sm_len and isinstance(saved_matrix[i], list) and j < len(saved_matrix[i]):
                    try:
                        matrix[i][j] = float(saved_matrix[i][j])
                    except (ValueError, TypeError):
                        matrix[i][j] = 1.0
                elif codes[i] in expert_codes and codes[j] in expert_codes:
                    orig_i = expert_codes.index(codes[i])
                    orig_j = expert_codes.index(codes[j])
                    matrix[i][j] = float(expert_ref[orig_i][orig_j])
                else:
                    matrix[i][j] = 1.0
    else:
        for i in range(n):
            ci = codes[i]
            for j in range(n):
                cj = codes[j]
                if i == j:
                    matrix[i][j] = 1.0
                elif ci in expert_codes and cj in expert_codes:
                    orig_i = expert_codes.index(ci)
                    orig_j = expert_codes.index(cj)
                    matrix[i][j] = float(expert_ref[orig_i][orig_j])
                else:
                    matrix[i][j] = 1.0

    result = compute_ahp(matrix)
    result["labels"] = labels
    result["codes"]  = codes
    result["model"]  = model
    return result

