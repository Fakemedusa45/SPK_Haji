"""
Pengujian Sistem — Sensitivity Analysis + Spearman + Pearson
Generates 12 scenarios: +5% and +10% weight perturbations on each of C1–C6 (KAROM).

Delta values used: 0.05 (5%) and 0.10 (10%) of total normalized weight.
This follows the standard MCDM sensitivity analysis approach where a small
perturbation is added to one criterion's weight and the remaining weights are
re-normalized so that Σwj = 1. Moderate perturbations (5–10%) are common in
AHP thesis work (e.g. Triantaphyllou & Sanchez 1997, Saltelli 2004).
"""
import math
from spk_ahp import get_full_ahp, get_dynamic_ahp, KAROM_CODES, KAROM_LABELS
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


def score_with_weights(jamaah_list, codes, w_dict: dict, sub_criteria_map: dict | None = None, target: dict | None = None) -> list:
    """Re-score all jamaah using overridden weights and matching sub_criteria_map."""
    if target is None:
        target = {c: 5 for c in codes}
    results = []
    for jamaah in jamaah_list:
        skala = konversi_ke_nilai(jamaah, sub_criteria_map=sub_criteria_map)
        skala_model = {c: skala.get(c, 3) for c in codes}
        gap = {c: skala_model[c] - target.get(c, 5) for c in codes}
        bobot_gap = {c: hitung_bobot_gap(gap[c]) for c in codes}
        skor_terbobot = {c: round(w_dict[c] * bobot_gap[c], 6) for c in codes}
        nilai_akhir = round(sum(skor_terbobot[c] for c in codes), 4)
        results.append({
            "no_porsi":    jamaah.no_porsi,
            "nama":        jamaah.nama,
            "nilai_akhir": nilai_akhir,
        })
    return results


# ── Confusion Matrix (Uji Validitas) ──────────────────────────────────────────

def compute_confusion_matrix(
    jamaah_list,
    criteria_list: list | None = None,
    saved_matrix_karom: list | None = None,
    target_karom: dict | None = None,
    saved_matrix_karu: list | None = None,
    target_karu: dict | None = None,
) -> dict:
    """
    Menghitung Confusion Matrix (Uji Validitas) membandingkan rekomendasi sistem
    (Peringkat #1 per Rombongan/Regu) dengan data pemilihan manual SISKOHAT/Kemenhaj
    (status_aktual) untuk 3 mode: karom, karu, dan gabungan.
    """
    from spk_profile_matching import proses_pm

    # Deterministic kode A001..An based on initial jamaah_list order
    kode_map = {j.no_porsi: f"A{str(i + 1).zfill(3)}" for i, j in enumerate(jamaah_list)}

    # Run PM for KAROM (6 kriteria) and KARU (4 kriteria)
    pm_karom = proses_pm(
        jamaah_list,
        model="karom",
        criteria_list=criteria_list,
        saved_matrix=saved_matrix_karom,
        target=target_karom,
    )
    pm_karu = proses_pm(
        jamaah_list,
        model="karu",
        criteria_list=criteria_list,
        saved_matrix=saved_matrix_karu,
        target=target_karu,
    )

    karom_res = pm_karom["jamaah_results"]
    karu_res = pm_karu["jamaah_results"]

    # 1. KAROM (Evaluasi per Rombongan)
    rombs: dict = {}
    for r in karom_res:
        romb_id = r.get("rombongan") if r.get("rombongan") is not None else 1
        rombs.setdefault(romb_id, []).append(r)

    karom_items = []
    karom_group_comparisons = []
    karom_tp = karom_tn = karom_fp = karom_fn = 0

    for romb_id in sorted(rombs.keys()):
        group = sorted(rombs[romb_id], key=lambda x: x["nilai_akhir"], reverse=True)
        manual_leader = None
        system_leader = None

        for idx, g in enumerate(group):
            rank_in_group = idx + 1
            is_pred_pos = (rank_in_group == 1)
            pred_label = "4-KAROM" if is_pred_pos else "0-Jamaah"

            st = (g.get("status_aktual") or "").upper()
            is_act_pos = ("4-KAROM" in st or "KAROM" in st)

            if is_act_pos and is_pred_pos:
                quadrant = "TP"
                karom_tp += 1
            elif not is_act_pos and not is_pred_pos:
                quadrant = "TN"
                karom_tn += 1
            elif not is_act_pos and is_pred_pos:
                quadrant = "FP"
                karom_fp += 1
            else:
                quadrant = "FN"
                karom_fn += 1

            karom_items.append({
                "kode": kode_map.get(g["no_porsi"], f"A{str(idx + 1).zfill(3)}"),
                "no_porsi": g["no_porsi"],
                "nama": g["nama"],
                "rombongan": g.get("rombongan"),
                "regu": g.get("regu"),
                "nilai_akhir": g["nilai_akhir"],
                "rank_in_group": rank_in_group,
                "status_aktual": g.get("status_aktual") or "0-Jamaah",
                "prediksi_sistem": pred_label,
                "quadrant": quadrant,
            })

            if rank_in_group == 1:
                system_leader = {
                    "no_porsi": g["no_porsi"],
                    "nama": g["nama"],
                    "nilai_akhir": g["nilai_akhir"],
                    "rank_in_group": 1,
                    "status_aktual": g.get("status_aktual") or "0-Jamaah",
                }
            if is_act_pos and manual_leader is None:
                manual_leader = {
                    "no_porsi": g["no_porsi"],
                    "nama": g["nama"],
                    "nilai_akhir": g["nilai_akhir"],
                    "rank_in_group": rank_in_group,
                }

        is_match = bool(manual_leader and system_leader and manual_leader["no_porsi"] == system_leader["no_porsi"])
        karom_group_comparisons.append({
            "group_id": romb_id,
            "total_members": len(group),
            "manual_leader": manual_leader,
            "system_leader": system_leader,
            "is_match": is_match,
        })

    karom_total = karom_tp + karom_tn + karom_fp + karom_fn
    karom_acc = ((karom_tp + karom_tn) / karom_total * 100.0) if karom_total else 0.0
    karom_prec = (karom_tp / (karom_tp + karom_fp) * 100.0) if (karom_tp + karom_fp) else 0.0
    karom_rec = (karom_tp / (karom_tp + karom_fn) * 100.0) if (karom_tp + karom_fn) else 0.0
    karom_f1 = (2.0 * karom_prec * karom_rec / (karom_prec + karom_rec)) if (karom_prec + karom_rec) else 0.0

    # 2. KARU (Evaluasi per Regu)
    regus: dict = {}
    for r in karu_res:
        regu_id = r.get("regu") if r.get("regu") is not None else 1
        regus.setdefault(regu_id, []).append(r)

    karu_items = []
    karu_group_comparisons = []
    karu_tp = karu_tn = karu_fp = karu_fn = 0

    for regu_id in sorted(regus.keys()):
        group = sorted(regus[regu_id], key=lambda x: x["nilai_akhir"], reverse=True)
        manual_leader = None
        system_leader = None

        for idx, g in enumerate(group):
            rank_in_group = idx + 1
            is_pred_pos = (rank_in_group == 1)
            pred_label = "5-KARU" if is_pred_pos else "0-Jamaah"

            st = (g.get("status_aktual") or "").upper()
            is_act_pos = ("5-KARU" in st or "KARU" in st)

            if is_act_pos and is_pred_pos:
                quadrant = "TP"
                karu_tp += 1
            elif not is_act_pos and not is_pred_pos:
                quadrant = "TN"
                karu_tn += 1
            elif not is_act_pos and is_pred_pos:
                quadrant = "FP"
                karu_fp += 1
            else:
                quadrant = "FN"
                karu_fn += 1

            karu_items.append({
                "kode": kode_map.get(g["no_porsi"], f"A{str(idx + 1).zfill(3)}"),
                "no_porsi": g["no_porsi"],
                "nama": g["nama"],
                "rombongan": g.get("rombongan"),
                "regu": g.get("regu"),
                "nilai_akhir": g["nilai_akhir"],
                "rank_in_group": rank_in_group,
                "status_aktual": g.get("status_aktual") or "0-Jamaah",
                "prediksi_sistem": pred_label,
                "quadrant": quadrant,
            })

            if rank_in_group == 1:
                system_leader = {
                    "no_porsi": g["no_porsi"],
                    "nama": g["nama"],
                    "nilai_akhir": g["nilai_akhir"],
                    "rank_in_group": 1,
                    "status_aktual": g.get("status_aktual") or "0-Jamaah",
                }
            if is_act_pos and manual_leader is None:
                manual_leader = {
                    "no_porsi": g["no_porsi"],
                    "nama": g["nama"],
                    "nilai_akhir": g["nilai_akhir"],
                    "rank_in_group": rank_in_group,
                }

        is_match = bool(manual_leader and system_leader and manual_leader["no_porsi"] == system_leader["no_porsi"])
        karu_group_comparisons.append({
            "group_id": regu_id,
            "total_members": len(group),
            "manual_leader": manual_leader,
            "system_leader": system_leader,
            "is_match": is_match,
        })

    karu_total = karu_tp + karu_tn + karu_fp + karu_fn
    karu_acc = ((karu_tp + karu_tn) / karu_total * 100.0) if karu_total else 0.0
    karu_prec = (karu_tp / (karu_tp + karu_fp) * 100.0) if (karu_tp + karu_fp) else 0.0
    karu_rec = (karu_tp / (karu_tp + karu_fn) * 100.0) if (karu_tp + karu_fn) else 0.0
    karu_f1 = (2.0 * karu_prec * karu_rec / (karu_prec + karu_rec)) if (karu_prec + karu_rec) else 0.0

    # 3. GABUNGAN (Evaluasi Karom & Karu pada Seluruh Jemaah)
    karom_rank1_porsi = {
        gc["system_leader"]["no_porsi"]
        for gc in karom_group_comparisons
        if gc["system_leader"]
    }
    karu_rank1_porsi = {
        gc["system_leader"]["no_porsi"]
        for gc in karu_group_comparisons
        if gc["system_leader"]
    }

    karom_by_porsi = {it["no_porsi"]: it for it in karom_items}
    karu_by_porsi = {it["no_porsi"]: it for it in karu_items}

    gab_items = []
    gab_tp = gab_tn = gab_fp = gab_fn = 0

    for idx, j in enumerate(jamaah_list):
        porsi = j.no_porsi
        k_it = karom_by_porsi.get(porsi, {})
        r_it = karu_by_porsi.get(porsi, {})

        is_k1 = porsi in karom_rank1_porsi
        is_r1 = porsi in karu_rank1_porsi
        is_pred_pos = (is_k1 or is_r1)

        if is_k1 and is_r1:
            pred_label = "4-KAROM & 5-KARU"
        elif is_k1:
            pred_label = "4-KAROM"
        elif is_r1:
            pred_label = "5-KARU"
        else:
            pred_label = "0-Jamaah"

        st = (j.status_aktual or "").upper()
        is_act_pos = ("4-KAROM" in st or "KAROM" in st or "5-KARU" in st or "KARU" in st)

        if is_act_pos and is_pred_pos:
            quadrant = "TP"
            gab_tp += 1
        elif not is_act_pos and not is_pred_pos:
            quadrant = "TN"
            gab_tn += 1
        elif not is_act_pos and is_pred_pos:
            quadrant = "FP"
            gab_fp += 1
        else:
            quadrant = "FN"
            gab_fn += 1

        gab_items.append({
            "kode": kode_map.get(porsi, f"A{str(idx + 1).zfill(3)}"),
            "no_porsi": porsi,
            "nama": j.nama,
            "rombongan": j.rombongan,
            "regu": j.regu,
            "nilai_akhir": k_it.get("nilai_akhir", 0.0),
            "rank_in_group": k_it.get("rank_in_group", 0),
            "rank_in_rombongan": k_it.get("rank_in_group", 0),
            "rank_in_regu": r_it.get("rank_in_group", 0),
            "status_aktual": j.status_aktual or "0-Jamaah",
            "prediksi_sistem": pred_label,
            "quadrant": quadrant,
        })

    gab_total = gab_tp + gab_tn + gab_fp + gab_fn
    gab_acc = ((gab_tp + gab_tn) / gab_total * 100.0) if gab_total else 0.0
    gab_prec = (gab_tp / (gab_tp + gab_fp) * 100.0) if (gab_tp + gab_fp) else 0.0
    gab_rec = (gab_tp / (gab_tp + gab_fn) * 100.0) if (gab_tp + gab_fn) else 0.0
    gab_f1 = (2.0 * gab_prec * gab_rec / (gab_prec + gab_rec)) if (gab_prec + gab_rec) else 0.0

    return {
        "karom": {
            "tp": karom_tp,
            "tn": karom_tn,
            "fp": karom_fp,
            "fn": karom_fn,
            "total": karom_total,
            "accuracy": round(karom_acc, 2),
            "precision": round(karom_prec, 2),
            "recall": round(karom_rec, 2),
            "f1_score": round(karom_f1, 2),
            "group_comparisons": karom_group_comparisons,
            "items": karom_items,
        },
        "karu": {
            "tp": karu_tp,
            "tn": karu_tn,
            "fp": karu_fp,
            "fn": karu_fn,
            "total": karu_total,
            "accuracy": round(karu_acc, 2),
            "precision": round(karu_prec, 2),
            "recall": round(karu_rec, 2),
            "f1_score": round(karu_f1, 2),
            "group_comparisons": karu_group_comparisons,
            "items": karu_items,
        },
        "gabungan": {
            "tp": gab_tp,
            "tn": gab_tn,
            "fp": gab_fp,
            "fn": gab_fn,
            "total": gab_total,
            "accuracy": round(gab_acc, 2),
            "precision": round(gab_prec, 2),
            "recall": round(gab_rec, 2),
            "f1_score": round(gab_f1, 2),
            "group_comparisons": [],
            "items": gab_items,
        },
    }


# ── Main evaluation function ───────────────────────────────────────────────────

def run_evaluation(
    jamaah_list,
    criteria_list: list | None = None,
    saved_matrix: list | None = None,
    target: dict | None = None,
    saved_matrix_karu: list | None = None,
    target_karu: dict | None = None,
) -> dict:
    """Run the full evaluation with dynamic criteria, saved matrix, and target profile."""
    from spk_profile_matching import proses_pm

    model    = "karom"
    ahp_data = get_dynamic_ahp(model, criteria_list=criteria_list, saved_matrix=saved_matrix)
    codes    = ahp_data["codes"]
    labels   = ahp_data["labels"]
    base_w   = ahp_data["weights"]   # list[float]
    base_dict = {codes[i]: base_w[i] for i in range(len(codes))}

    sub_criteria_map = {}
    if criteria_list:
        for kr in criteria_list:
            if getattr(kr, "sub_kriterias", None):
                sub_criteria_map[kr.kode] = kr.sub_kriterias

    if target is None:
        target = {c: 5 for c in codes}

    # Baseline rankings
    base_pm  = proses_pm(jamaah_list, model=model, criteria_list=criteria_list, saved_matrix=saved_matrix, target=target)
    base_res = base_pm["jamaah_results"]  # sorted desc by nilai_akhir
    n = len(base_res)
    porsi_order  = [r["no_porsi"] for r in base_res]  # baseline rank-1 first
    base_by_porsi = {r["no_porsi"]: r for r in base_res}

    scenarios = []
    scenario_no = 1

    for ci, code in enumerate(codes):
        for delta in [0.05, 0.10]:
            delta_label = "+5%" if delta == 0.05 else "+10%"
            new_w_list = modified_weights(base_w, ci, delta)
            new_w_dict = {codes[i]: new_w_list[i] for i in range(len(codes))}

            sim_results = score_with_weights(jamaah_list, codes, new_w_dict, sub_criteria_map=sub_criteria_map, target=target)
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
                "delta_label":         delta_label,
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

    cm = compute_confusion_matrix(
        jamaah_list,
        criteria_list=criteria_list,
        saved_matrix_karom=saved_matrix,
        target_karom=target,
        saved_matrix_karu=saved_matrix_karu,
        target_karu=target_karu,
    )

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
        "confusion_matrix": cm,
    }
