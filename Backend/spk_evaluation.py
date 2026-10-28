"""
Pengujian Sistem — Sensitivity Analysis + Spearman + Pearson
Generates 12 scenarios: +1 and +2 weight modifications on each of C1–C6 (KAROM).
"""
import math
from spk_ahp import get_full_ahp, KAROM_CODES, KAROM_LABELS
from spk_profile_matching import konversi_ke_nilai, hitung_bobot_gap


# ── Correlation helpers ────────────────────────────────────────────────────────

def spearman_rs(rank_x: list, rank_y: list) -> float:
    """Persamaan 2.10: rs = 1 - (6 * Σdi²) / (n*(n²-1))"""
    n = len(rank_x)
    if n <= 1:
        return 1.0
    d2_sum = sum((rank_x[i] - rank_y[i]) ** 2 for i in range(n))
    return 1.0 - (6.0 * d2_sum) / (n * (n ** 2 - 1))


def pearson_r(scores_x: list, scores_y: list) -> float:
    """Standard Pearson r between two score lists."""
    n = len(scores_x)
    if n <= 1:
        return 1.0
    mean_x = sum(scores_x) / n
    mean_y = sum(scores_y) / n
    num    = sum((scores_x[i] - mean_x) * (scores_y[i] - mean_y) for i in range(n))
    den_x  = math.sqrt(sum((v - mean_x) ** 2 for v in scores_x))
    den_y  = math.sqrt(sum((v - mean_y) ** 2 for v in scores_y))
    if den_x == 0 or den_y == 0:
        return 1.0
    return num / (den_x * den_y)


def sensitivity_pct(score_orig: float, score_sim: float) -> float:
    """Persamaan 2.9: S% = |Y - X| / X * 100"""
    if score_orig == 0:
        return 0.0
    return abs(score_sim - score_orig) / abs(score_orig) * 100.0


def interpret_correlation(r: float) -> str:
    r = abs(r)
    if   r >= 0.80: return "Sangat Kuat"
    elif r >= 0.60: return "Kuat"
    elif r >= 0.40: return "Sedang"
    elif r >= 0.20: return "Lemah"
    else:           return "Sangat Lemah"


# ── Modified weight computation ────────────────────────────────────────────────

def modified_weights(base_weights: list, mod_idx: int, delta: float) -> list:
    """Adds delta to weight at mod_idx, then re-normalises so Σw = 1."""
    w = list(base_weights)
    w[mod_idx] = max(0.0, w[mod_idx] + delta)
    total = sum(w)
    return [v / total for v in w]


def score_with_weights(jamaah_list, codes, w_dict: dict) -> list:
    """Re-score all jamaah using overridden weights."""
    target = {c: 5 for c in codes}
    results = []
    for jamaah in jamaah_list:
        skala = konversi_ke_nilai(jamaah)
        skala_model = {c: skala.get(c, 0) for c in codes}
        gap = {c: skala_model[c] - target[c] for c in codes}
        bobot_gap = {c: hitung_bobot_gap(gap[c]) for c in codes}
        nilai_akhir = sum(w_dict[c] * bobot_gap[c] for c in codes)
        results.append({
            "no_porsi":    jamaah.no_porsi,
            "nama":        jamaah.nama,
            "nilai_akhir": round(nilai_akhir, 6),
        })
    return results


# ── Main evaluation function ───────────────────────────────────────────────────

def run_evaluation(jamaah_list) -> dict:
    """Run the full 12-scenario evaluation."""
    from spk_profile_matching import proses_pm

    model    = "karom"
    codes    = KAROM_CODES
    labels   = KAROM_LABELS
    ahp_data = get_full_ahp(model)
    base_w   = ahp_data["weights"]   # list[float]
    base_dict = {codes[i]: base_w[i] for i in range(len(codes))}

    # Baseline rankings
    base_pm  = proses_pm(jamaah_list, model=model)
    base_res = base_pm["jamaah_results"]  # sorted desc by nilai_akhir
    n = len(base_res)
    porsi_order  = [r["no_porsi"] for r in base_res]  # baseline rank-1 first
    base_by_porsi = {r["no_porsi"]: r for r in base_res}

    scenarios = []
    scenario_no = 1

    for ci, code in enumerate(codes):
        for delta in [1, 2]:
            new_w_list = modified_weights(base_w, ci, delta)
            new_w_dict = {codes[i]: new_w_list[i] for i in range(len(codes))}

            sim_results = score_with_weights(jamaah_list, codes, new_w_dict)
            sim_sorted  = sorted(sim_results, key=lambda x: x["nilai_akhir"], reverse=True)
            sim_rank_map  = {r["no_porsi"]: (idx + 1) for idx, r in enumerate(sim_sorted)}
            sim_score_map = {r["no_porsi"]: r["nilai_akhir"]  for r in sim_sorted}
            rank1_candidate = sim_sorted[0]["nama"] if sim_sorted else "—"

            detail = []
            sens_list, rank_x, rank_y, scores_x, scores_y = [], [], [], [], []

            for idx, porsi in enumerate(porsi_order):
                base_r   = base_by_porsi[porsi]
                score_x  = base_r["nilai_akhir"]
                rank_orig = base_r["rank"]
                score_y  = sim_score_map.get(porsi, 0.0)
                rank_sim = sim_rank_map.get(porsi, 0)
                di       = rank_orig - rank_sim
                di2      = di ** 2
                s_pct    = sensitivity_pct(score_x, score_y)

                detail.append({
                    "no_porsi":        porsi,
                    "nama":            base_r["nama"],
                    "kode":            f"A{str(idx + 1).zfill(3)}",
                    "score_orig":      round(score_x, 6),
                    "rank_orig":       rank_orig,
                    "score_sim":       round(score_y, 6),
                    "rank_sim":        rank_sim,
                    "di":              di,
                    "di2":             di2,
                    "sensitivity_pct": round(s_pct, 4),
                })
                sens_list.append(s_pct)
                rank_x.append(rank_orig)
                rank_y.append(rank_sim)
                scores_x.append(score_x)
                scores_y.append(score_y)

            rs    = spearman_rs(rank_x, rank_y)
            r     = pearson_r(scores_x, scores_y)
            avg_s = sum(sens_list) / len(sens_list) if sens_list else 0.0

            scenarios.append({
                "scenario_no":         scenario_no,
                "criteria_modified":   code,
                "criteria_label":      labels[ci],
                "delta":               delta,
                "base_weights":        {c: round(base_dict[c], 6) for c in codes},
                "modified_weights":    {c: round(new_w_dict[c], 6) for c in codes},
                "rank1_candidate":     rank1_candidate,
                "avg_sensitivity_pct": round(avg_s, 4),
                "spearman_rs":         round(rs, 6),
                "pearson_r":           round(r,  6),
                "category":            interpret_correlation(rs),
                "detail":              detail,
            })
            scenario_no += 1

    all_sens = [s["avg_sensitivity_pct"] for s in scenarios]
    all_rs   = [s["spearman_rs"]         for s in scenarios]
    all_r    = [s["pearson_r"]           for s in scenarios]

    avg_s_total = round(sum(all_sens) / len(all_sens), 4) if all_sens else 0.0
    avg_rs      = round(sum(all_rs)   / len(all_rs),   6) if all_rs   else 0.0
    avg_r_total = round(sum(all_r)    / len(all_r),    6) if all_r    else 0.0
    robust      = abs(avg_rs) >= 0.80 and abs(avg_r_total) >= 0.80

    return {
        "model":        model,
        "codes":        codes,
        "labels":       labels,
        "base_weights": {c: round(base_dict[c], 6) for c in codes},
        "n_scenarios":  len(scenarios),
        "scenarios":    scenarios,
        "summary": {
            "avg_sensitivity":  avg_s_total,
            "avg_spearman":     avg_rs,
            "avg_pearson":      avg_r_total,
            "interp_spearman":  interpret_correlation(avg_rs),
            "interp_pearson":   interpret_correlation(avg_r_total),
            "robust":           robust,
            "model":            model,
        },
    }
