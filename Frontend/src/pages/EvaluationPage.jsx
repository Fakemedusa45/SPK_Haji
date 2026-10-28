import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical, TrendingUp, BarChart2, ShieldCheck, ChevronDown,
  ChevronRight, AlertCircle, X, Info, Layers,
} from 'lucide-react';
import { fetchEvaluation } from '../services/api';

/* ============================================================
   HELPERS
   ============================================================ */
const f4 = n => (typeof n === 'number' ? n.toFixed(4) : '—');
const f6 = n => (typeof n === 'number' ? n.toFixed(6) : '—');
const fp = n => (typeof n === 'number' ? n.toFixed(2) + '%' : '—');

const BADGE_COLORS = {
  C1: 'ahp-badge-c1', C2: 'ahp-badge-c2', C3: 'ahp-badge-c3',
  C4: 'ahp-badge-c4', C5: 'ahp-badge-c5', C6: 'ahp-badge-c6',
};

function interpClass(v) {
  v = Math.abs(v);
  if (v >= 0.80) return 'ev-interp-strong';
  if (v >= 0.60) return 'ev-interp-good';
  if (v >= 0.40) return 'ev-interp-mid';
  return 'ev-interp-weak';
}

/* ============================================================
   OVERVIEW BANNER
   ============================================================ */
function OverviewBanner() {
  return (
    <div className="ev-banner">
      <div className="ev-banner-icon"><FlaskConical size={20} /></div>
      <div className="ev-banner-body">
        <h2 className="ev-banner-title">Pengujian Sistem — Tujuan & Metodologi</h2>
        <p className="ev-banner-text">
          Pengujian ini memvalidasi <strong>keandalan algoritma SPK</strong> melalui tiga ukuran statistik:
        </p>
        <div className="ev-banner-points">
          <div className="ev-banner-point">
            <span className="ev-bp-num">12</span>
            <div>
              <strong>Skenario Analisis Sensitivitas</strong> — Modifikasi bobot AHP (+1 dan +2)
              pada masing-masing kriteria C1–C6, lalu hitung persentase deviasi skor
              <em> S% = |Y–X|/X × 100</em> (Persamaan 2.9)
            </div>
          </div>
          <div className="ev-banner-point">
            <span className="ev-bp-num">rₛ</span>
            <div>
              <strong>Koefisien Korelasi Spearman</strong> — Stabilitas urutan peringkat jemaah
              antara skenario vs baseline. Target: r ≥ 0.80 (Sangat Kuat) · Persamaan 2.10
            </div>
          </div>
          <div className="ev-banner-point">
            <span className="ev-bp-num">r</span>
            <div>
              <strong>Koefisien Korelasi Pearson</strong> — Linieritas nilai skor antara
              skenario vs baseline. Target: r ≥ 0.80 (Sangat Kuat)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   KPI CARDS
   ============================================================ */
function KpiCards({ summary }) {
  const { avg_sensitivity, avg_spearman, avg_pearson,
          interp_spearman, interp_pearson, robust } = summary;

  return (
    <div className="ev-kpi-row">
      {/* Deviasi */}
      <div className="ev-kpi-card ev-kpi-deviasi">
        <div className="ev-kpi-icon"><TrendingUp size={18} /></div>
        <div className="ev-kpi-label">Rata-rata Deviasi (S̄)</div>
        <div className="ev-kpi-value">{fp(avg_sensitivity)}</div>
        <div className="ev-kpi-sub">Rata-rata selisih skor 12 skenario vs baseline</div>
      </div>

      {/* Spearman */}
      <div className="ev-kpi-card ev-kpi-spearman">
        <div className="ev-kpi-icon"><BarChart2 size={18} /></div>
        <div className="ev-kpi-label">Rata-rata Spearman (r̄ₛ)</div>
        <div className="ev-kpi-value">{f4(avg_spearman)}</div>
        <span className={`ev-kpi-badge ${interpClass(avg_spearman)}`}>{interp_spearman}</span>
        <div className="ev-kpi-sub">Stabilitas urutan peringkat · target ≥ 0.80</div>
      </div>

      {/* Pearson */}
      <div className="ev-kpi-card ev-kpi-pearson">
        <div className="ev-kpi-icon"><BarChart2 size={18} /></div>
        <div className="ev-kpi-label">Rata-rata Pearson (r̄)</div>
        <div className="ev-kpi-value">{f4(avg_pearson)}</div>
        <span className={`ev-kpi-badge ${interpClass(avg_pearson)}`}>{interp_pearson}</span>
        <div className="ev-kpi-sub">Linieritas skor · target ≥ 0.80</div>
      </div>

      {/* Status */}
      <div className={`ev-kpi-card ev-kpi-status ${robust ? 'ev-kpi-robust' : 'ev-kpi-fragile'}`}>
        <div className="ev-kpi-icon"><ShieldCheck size={18} /></div>
        <div className="ev-kpi-label">Status Keandalan Sistem</div>
        <div className={`ev-status-badge ${robust ? 'ev-status-robust' : 'ev-status-fragile'}`}>
          {robust ? '✓ KOKOH / ROBUST' : '⚠ PERLU PENINJAUAN'}
        </div>
        <div className="ev-kpi-sub">
          {robust ? 'Layak Implementasi — Hasil konsisten terhadap variasi bobot'
                  : 'Sensitivitas tinggi — periksa parameter kriteria'}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SCENARIO DRILL-DOWN MODAL
   ============================================================ */
function DrilldownModal({ scenario, onClose }) {
  const { scenario_no, criteria_label, delta, spearman_rs, pearson_r,
          avg_sensitivity_pct, category, detail, modified_weights, base_weights } = scenario;

  const codes = Object.keys(modified_weights || {});

  return (
    <div className="ev-modal-overlay" onClick={onClose}>
      <div className="ev-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ev-modal-head">
          <div className="ev-modal-title-wrap">
            <div className="ev-modal-icon"><Layers size={16} /></div>
            <div>
              <h3 className="ev-modal-title">
                Skenario {scenario_no} — Modifikasi {criteria_label} (+{delta})
              </h3>
              <p className="ev-modal-sub">
                Detail perbandingan skor dan peringkat baseline vs simulasi
              </p>
            </div>
          </div>
          <button className="ev-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Scenario Stats */}
        <div className="ev-modal-stats">
          <div className="ev-modal-stat">
            <span className="ev-ms-label">S̄%</span>
            <span className="ev-ms-val">{fp(avg_sensitivity_pct)}</span>
          </div>
          <div className="ev-modal-stat">
            <span className="ev-ms-label">rₛ (Spearman)</span>
            <span className={`ev-ms-val ${interpClass(spearman_rs)}`}>{f4(spearman_rs)}</span>
          </div>
          <div className="ev-modal-stat">
            <span className="ev-ms-label">r (Pearson)</span>
            <span className={`ev-ms-val ${interpClass(pearson_r)}`}>{f4(pearson_r)}</span>
          </div>
          <div className="ev-modal-stat">
            <span className="ev-ms-label">Kategori</span>
            <span className={`ev-kpi-badge ${interpClass(spearman_rs)}`}>{category}</span>
          </div>
        </div>

        {/* Weight comparison */}
        <div className="ev-modal-weights">
          <div className="ev-mw-title">Perbandingan Bobot AHP</div>
          <div className="ev-mw-grid">
            {codes.map(c => (
              <div key={c} className="ev-mw-item">
                <span className={`ahp-code-badge ${BADGE_COLORS[c] || 'ahp-badge-c1'}`}>{c}</span>
                <span className="ev-mw-base">{f6(base_weights?.[c])}</span>
                <span className="ev-mw-arrow">→</span>
                <span className={`ev-mw-new ${c === scenario.criteria_modified ? 'ev-mw-highlight' : ''}`}>
                  {f6(modified_weights?.[c])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail table */}
        <div className="ev-modal-table-wrap">
          <table className="ev-detail-table">
            <thead>
              <tr>
                <th className="ev-dth">Kode</th>
                <th className="ev-dth">Nama Jemaah</th>
                <th className="ev-dth ev-dth-num">Skor Awal (X)</th>
                <th className="ev-dth ev-dth-num">Peringkat Awal</th>
                <th className="ev-dth ev-dth-num">Skor Simulasi (Y)</th>
                <th className="ev-dth ev-dth-num">Peringkat Simulasi</th>
                <th className="ev-dth ev-dth-num">dᵢ</th>
                <th className="ev-dth ev-dth-num">dᵢ²</th>
                <th className="ev-dth ev-dth-num">S%</th>
              </tr>
            </thead>
            <tbody>
              {detail.map(row => (
                <tr key={row.no_porsi} className={`ev-dtr ${row.di !== 0 ? 'ev-dtr-changed' : ''}`}>
                  <td className="ev-dtd"><span className="rk-kode-chip">{row.kode}</span></td>
                  <td className="ev-dtd ev-dtd-nama">{row.nama}</td>
                  <td className="ev-dtd ev-dtd-num ev-score-x">{f4(row.score_orig)}</td>
                  <td className="ev-dtd ev-dtd-num">
                    <span className="ev-rank-pill">#{row.rank_orig}</span>
                  </td>
                  <td className="ev-dtd ev-dtd-num ev-score-y">{f4(row.score_sim)}</td>
                  <td className="ev-dtd ev-dtd-num">
                    <span className={`ev-rank-pill ${row.rank_sim !== row.rank_orig ? 'ev-rank-changed' : ''}`}>
                      #{row.rank_sim}
                    </span>
                  </td>
                  <td className="ev-dtd ev-dtd-num">
                    <span className={`ev-di-val ${row.di > 0 ? 'pos' : row.di < 0 ? 'neg' : 'zero'}`}>
                      {row.di > 0 ? `+${row.di}` : row.di}
                    </span>
                  </td>
                  <td className="ev-dtd ev-dtd-num ev-di2">{row.di2}</td>
                  <td className="ev-dtd ev-dtd-num">
                    <span className={`ev-spct ${row.sensitivity_pct > 5 ? 'ev-spct-high' : 'ev-spct-ok'}`}>
                      {fp(row.sensitivity_pct)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="ev-dtr-total">
                <td className="ev-dtd" colSpan={6}><strong>Σdᵢ²</strong></td>
                <td className="ev-dtd ev-dtd-num" colSpan={1}></td>
                <td className="ev-dtd ev-dtd-num">
                  <strong>{detail.reduce((s, r) => s + r.di2, 0)}</strong>
                </td>
                <td className="ev-dtd ev-dtd-num">
                  <strong>{fp(avg_sensitivity_pct)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Spearman formula */}
        <div className="ev-modal-formula">
          <Info size={13} />
          <span>
            rₛ = 1 − (6 × Σdᵢ²) / (n × (n²−1)) = <strong>{f4(spearman_rs)}</strong>
            &nbsp;·&nbsp;
            S% = |Y−X| / X × 100 &nbsp;·&nbsp;
            Kategori: <strong>{category}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SCENARIO TABLE
   ============================================================ */
function ScenarioTable({ scenarios, onSelect }) {
  return (
    <div className="ev-card ev-table-card">
      <div className="ev-card-head">
        <div className="ev-card-head-left">
          <div className="ev-card-icon"><Layers size={15} /></div>
          <div>
            <h3 className="ev-card-title">Tabel Master 12 Skenario Pengujian</h3>
            <p className="ev-card-sub">
              Klik baris untuk melihat detail perbandingan peringkat setiap skenario
            </p>
          </div>
        </div>
      </div>
      <div className="ev-table-wrap">
        <table className="ev-table">
          <thead>
            <tr>
              <th className="ev-th ev-th-center">Skenario</th>
              <th className="ev-th">Kriteria Dimodifikasi</th>
              <th className="ev-th ev-th-center">Besaran</th>
              <th className="ev-th ev-th-center">Bobot Baru (Wmod)</th>
              <th className="ev-th">Kandidat #1</th>
              <th className="ev-th ev-th-center">S̄%</th>
              <th className="ev-th ev-th-center">rₛ (Spearman)</th>
              <th className="ev-th ev-th-center">r (Pearson)</th>
              <th className="ev-th ev-th-center">Kategori</th>
              <th className="ev-th ev-th-center"></th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map(s => (
              <tr
                key={s.scenario_no}
                className="ev-tr ev-tr-clickable"
                onClick={() => onSelect(s)}
              >
                <td className="ev-td ev-td-center">
                  <span className="ev-sno-chip">Sk-{s.scenario_no}</span>
                </td>
                <td className="ev-td">
                  <div className="ev-td-criteria">
                    <span className={`ahp-code-badge ${BADGE_COLORS[s.criteria_modified] || 'ahp-badge-c1'}`}>
                      {s.criteria_modified}
                    </span>
                    <span className="ev-crit-label">{s.criteria_label}</span>
                  </div>
                </td>
                <td className="ev-td ev-td-center">
                  <span className="ev-delta-chip">+{s.delta}</span>
                </td>
                <td className="ev-td ev-td-center">
                  <span className="ev-wnorm">
                    {f4(s.modified_weights?.[s.criteria_modified])}
                  </span>
                </td>
                <td className="ev-td ev-td-nama">{s.rank1_candidate}</td>
                <td className="ev-td ev-td-center">
                  <span className={`ev-spct-cell ${s.avg_sensitivity_pct > 5 ? 'ev-spct-high' : 'ev-spct-ok'}`}>
                    {fp(s.avg_sensitivity_pct)}
                  </span>
                </td>
                <td className="ev-td ev-td-center">
                  <span className={`ev-corr-val ${interpClass(s.spearman_rs)}`}>
                    {f4(s.spearman_rs)}
                  </span>
                </td>
                <td className="ev-td ev-td-center">
                  <span className={`ev-corr-val ${interpClass(s.pearson_r)}`}>
                    {f4(s.pearson_r)}
                  </span>
                </td>
                <td className="ev-td ev-td-center">
                  <span className={`ev-cat-badge ${interpClass(s.spearman_rs)}`}>
                    {s.category}
                  </span>
                </td>
                <td className="ev-td ev-td-center">
                  <ChevronRight size={16} className="ev-row-arrow" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyState() {
  return (
    <div className="ev-empty">
      <FlaskConical size={40} className="ev-empty-icon" />
      <p className="ev-empty-title">Belum Ada Data Jemaah</p>
      <p className="ev-empty-sub">
        Tambahkan data jemaah di <strong>Data Master</strong> agar pengujian dapat dijalankan.
      </p>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function EvaluationPage() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);   // drill-down scenario

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchEvaluation();
      setData(d);
    } catch {
      setError('Gagal memuat data pengujian. Pastikan backend berjalan dan data jemaah tersedia.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasData = data && data.scenarios && data.scenarios.length > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="ev-page-head">
        <div className="ev-head-left">
          <div className="ev-head-icon"><FlaskConical size={22} /></div>
          <div>
            <h1 className="ev-head-title">Pengujian Sistem</h1>
            <p className="ev-head-sub">
              Sensitivity Analysis · Spearman Correlation · Pearson Correlation · Subbab 3.8
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="ahp-error-banner" style={{ marginBottom: 20 }}>
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="ahp-loading">
          <div className="loading-spinner" />
          <span className="loading-text">Menjalankan 12 skenario pengujian…</span>
        </div>
      )}

      {!loading && data && (
        <>
          <OverviewBanner />

          {!hasData ? <EmptyState /> : (
            <>
              <KpiCards summary={data.summary} />
              <ScenarioTable scenarios={data.scenarios} onSelect={setSelected} />
            </>
          )}
        </>
      )}

      {/* Drill-down Modal */}
      {selected && (
        <DrilldownModal scenario={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
