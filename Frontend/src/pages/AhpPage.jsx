import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, RefreshCw, RotateCcw, AlertCircle,
  CheckCircle2, Calculator, Info,
} from 'lucide-react';
import { fetchAhp, recomputeAhp } from '../services/api';

/* ============================================================
   CONSTANTS — Expert matrices (Lampiran 3 thesis)
   ============================================================ */

const KAROM_EXPERT = [
  [1,    2,    5,    5,    7,    7   ],
  [0.5,  1,    4,    4,    6,    6   ],
  [0.2,  0.25, 1,    2,    3,    3   ],
  [0.2,  0.25, 0.5,  1,    2,    3   ],
  [1/7,  1/6,  1/3,  0.5,  1,    2   ],
  [1/7,  1/6,  1/3,  1/3,  0.5,  1   ],
];

const KARU_EXPERT = [
  [1,    2,    5,    5  ],
  [0.5,  1,    4,    4  ],
  [0.2,  0.25, 1,    2  ],
  [0.2,  0.25, 0.5,  1  ],
];

const KAROM_LABELS = ['Usia (C1)', 'Kesehatan (C2)', 'Jenis Kelamin (C3)', 'Pekerjaan (C4)', 'Pendidikan (C5)', 'Status Haji (C6)'];
const KARU_LABELS  = ['Usia (C1)', 'Kesehatan (C2)', 'Jenis Kelamin (C3)', 'Pekerjaan (C4)'];
const KAROM_CODES  = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
const KARU_CODES   = ['C1', 'C2', 'C3', 'C4'];

const SAATY_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/* ============================================================
   PURE MATH — local AHP computation (mirrors backend)
   ============================================================ */
const RI_TABLE = { 1:0, 2:0, 3:0.58, 4:0.90, 5:1.12, 6:1.24, 7:1.32, 8:1.41 };

function computeAhpLocal(matrix) {
  const n = matrix.length;
  const colSums = Array.from({ length: n }, (_, j) =>
    matrix.reduce((s, row) => s + row[j], 0)
  );
  const norm = matrix.map(row => row.map((v, j) => v / colSums[j]));
  const rowSums  = norm.map(row => row.reduce((s, v) => s + v, 0));
  const weights  = rowSums.map(rs => rs / n);
  const lambdaMax = colSums.reduce((s, cs, j) => s + cs * weights[j], 0);
  const ci = (lambdaMax - n) / (n - 1);
  const ri = RI_TABLE[n] ?? 1.24;
  const cr = ri > 0 ? ci / ri : 0;
  return {
    n, colSums, norm_matrix: norm, row_sums: rowSums,
    weights, lambda_max: lambdaMax, CI: ci, RI: ri, CR: cr,
    consistent: cr <= 0.1,
  };
}

function fmtFraction(v) {
  if (v >= 1) return v % 1 === 0 ? String(Math.round(v)) : v.toFixed(2);
  const inv = Math.round(1 / v);
  if (Math.abs(v - 1 / inv) < 0.001) return `1/${inv}`;
  return v.toFixed(3);
}

const f4  = n => (typeof n === 'number' ? n.toFixed(4) : '—');
const f6  = n => (typeof n === 'number' ? n.toFixed(6) : '—');
const pct = n => (typeof n === 'number' ? (n * 100).toFixed(2) + '%' : '—');

/* ============================================================
   SECTION 1 — Pairwise Comparison Matrix
   ============================================================ */
function PairwiseMatrix({ matrix, labels, codes, onMatrixChange, onRecalculate, onReset, loading }) {
  const n = matrix.length;
  const colSums = Array.from({ length: n }, (_, j) =>
    matrix.reduce((s, row) => s + row[j], 0)
  );

  function handleUpperChange(i, j, val) {
    const next = matrix.map(row => [...row]);
    next[i][j] = val;
    next[j][i] = 1 / val;
    onMatrixChange(next);
  }

  return (
    <div className="ahp-card">
      <div className="ahp-card-header">
        <div className="ahp-card-title-wrap">
          <div className="ahp-card-icon indigo">
            <Calculator size={16} />
          </div>
          <div>
            <h3 className="ahp-card-title">Matriks Perbandingan Berpasangan Pakar</h3>
            <p className="ahp-card-sub">
              Skala Saaty 1–9. Edit nilai segitiga atas — reciprocal otomatis dihitung.
            </p>
          </div>
        </div>
        <div className="ahp-matrix-actions">
          <button className="ahp-btn-reset" onClick={onReset}>
            <RotateCcw size={14} />
            Reset ke Matriks Pakar (Lampiran 3)
          </button>
          <button className="ahp-btn-recalc" onClick={onRecalculate} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'ahp-spin' : ''} />
            Hitung Ulang AHP
          </button>
        </div>
      </div>

      <div className="ahp-table-wrap">
        <table className="ahp-matrix-table">
          <thead>
            <tr>
              <th className="ahp-th-label">Kriteria</th>
              {codes.map(c => <th key={c} className="ahp-th">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="ahp-td-label">
                  <span className={`ahp-code-badge ahp-badge-${codes[i].toLowerCase()}`}>{codes[i]}</span>
                  <span className="ahp-td-label-name">{labels[i]}</span>
                </td>
                {row.map((val, j) => {
                  const isDiag  = i === j;
                  const isLower = i > j;
                  return (
                    <td key={j} className={`ahp-td ${isDiag ? 'ahp-td-diag' : isLower ? 'ahp-td-lower' : 'ahp-td-upper'}`}>
                      {isDiag ? (
                        <span className="ahp-cell-diagonal">1</span>
                      ) : isLower ? (
                        <span className="ahp-cell-lower">{fmtFraction(val)}</span>
                      ) : (
                        <select
                          className="ahp-cell-select"
                          value={Math.round(val)}
                          onChange={e => handleUpperChange(i, j, Number(e.target.value))}
                        >
                          {SAATY_SCALE.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="ahp-tr-total">
              <td className="ahp-td-label"><strong>Total Kolom</strong></td>
              {colSums.map((cs, j) => (
                <td key={j} className="ahp-td ahp-td-sum">{f4(cs)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   SECTION 2 — Weight Priority Bars
   ============================================================ */
function WeightBars({ weights, labels, codes }) {
  const maxW = Math.max(...weights);

  return (
    <div className="ahp-card">
      <div className="ahp-card-header">
        <div className="ahp-card-title-wrap">
          <div className="ahp-card-icon purple">
            <BarChart3 size={16} />
          </div>
          <div>
            <h3 className="ahp-card-title">Hasil Normalisasi &amp; Bobot Prioritas</h3>
            <p className="ahp-card-sub">
              Eigen Vector / Bobot Prioritas (W<sub>i</sub>) — rata-rata baris matriks ternormalisasi.
            </p>
          </div>
        </div>
      </div>
      <div className="ahp-bars-grid">
        {weights.map((w, i) => (
          <div key={i} className="ahp-bar-row">
            <div className="ahp-bar-label-wrap">
              <span className={`ahp-code-badge ahp-badge-${codes[i].toLowerCase()}`}>{codes[i]}</span>
              <span className="ahp-bar-label-name">{labels[i]}</span>
            </div>
            <div className="ahp-bar-track">
              <div className="ahp-bar-fill" style={{ width: `${(w / maxW) * 100}%` }} />
            </div>
            <div className="ahp-bar-values">
              <span className="ahp-bar-pct">{pct(w)}</span>
              <span className="ahp-bar-exact">{f4(w)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SECTION 3 — Normalized Matrix Table
   ============================================================ */
function NormMatrix({ norm, rowSums, weights, labels, codes }) {
  return (
    <div className="ahp-card">
      <div className="ahp-card-header">
        <div className="ahp-card-title-wrap">
          <div className="ahp-card-icon emerald">
            <Info size={16} />
          </div>
          <div>
            <h3 className="ahp-card-title">Tabel Matriks Normalisasi</h3>
            <p className="ahp-card-sub">
              X<sub>ij</sub> = a<sub>ij</sub> / Σa<sub>ij</sub> &nbsp;·&nbsp; W<sub>i</sub> = (Σ baris) / n
            </p>
          </div>
        </div>
      </div>
      <div className="ahp-table-wrap">
        <table className="ahp-norm-table">
          <thead>
            <tr>
              <th className="ahp-th-label">Kriteria</th>
              {codes.map(c => <th key={c} className="ahp-th">{c}</th>)}
              <th className="ahp-th ahp-th-sum">Jumlah Baris</th>
              <th className="ahp-th ahp-th-wi">W<sub>i</sub></th>
            </tr>
          </thead>
          <tbody>
            {norm.map((row, i) => (
              <tr key={i}>
                <td className="ahp-td-label">
                  <span className={`ahp-code-badge ahp-badge-${codes[i].toLowerCase()}`}>{codes[i]}</span>
                  <span className="ahp-td-label-name">{labels[i]}</span>
                </td>
                {row.map((v, j) => (
                  <td key={j} className={`ahp-td ahp-td-norm ${i === j ? 'ahp-td-diag' : ''}`}>
                    {f4(v)}
                  </td>
                ))}
                <td className="ahp-td ahp-td-rowsum">{f4(rowSums[i])}</td>
                <td className="ahp-td ahp-td-weight"><strong>{f4(weights[i])}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   SECTION 4 — Consistency Ratio Panel
   ============================================================ */
function ConsistencyPanel({ n, lambdaMax, CI, RI, CR, consistent }) {
  const items = [
    { label: 'Jumlah Kriteria (n)',     value: n            },
    { label: 'Lambda Max (λmax)',        value: f6(lambdaMax) },
    { label: 'Consistency Index (CI)',   value: f6(CI)       },
    { label: 'Random Index (RI)',        value: RI           },
    { label: 'Consistency Ratio (CR)',   value: f6(CR), highlight: !consistent },
    { label: 'Batas Konsistensi',        value: '≤ 0.10'    },
  ];

  return (
    <div className="ahp-card">
      <div className="ahp-card-header">
        <div className="ahp-card-title-wrap">
          <div className={`ahp-card-icon ${consistent ? 'emerald' : 'rose'}`}>
            {consistent ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          </div>
          <div>
            <h3 className="ahp-card-title">Detail Rasio Konsistensi</h3>
            <p className="ahp-card-sub">CI = (λmax − n) / (n − 1) &nbsp;·&nbsp; CR = CI / RI</p>
          </div>
        </div>
        <div className={`ahp-cr-badge ${consistent ? 'ok' : 'fail'}`}>
          {consistent ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {consistent ? 'KONSISTEN' : 'TIDAK KONSISTEN'}
        </div>
      </div>

      <div className="ahp-cr-grid">
        {items.map((item, idx) => (
          <div key={idx} className="ahp-cr-item">
            <span className="ahp-cr-label">{item.label}</span>
            <span className={`ahp-cr-value mono ${item.highlight ? 'highlight-red' : ''}`}>
              {String(item.value)}
            </span>
          </div>
        ))}
        <div className="ahp-cr-item ahp-cr-status-item">
          <span className="ahp-cr-label">Status</span>
          <span className={`ahp-status-badge ${consistent ? 'ok' : 'fail'}`}>
            {consistent
              ? '✓ KONSISTEN (Dapat Diterima)'
              : '✗ TIDAK KONSISTEN (Revisi Matriks!)'}
          </span>
        </div>
      </div>

      {!consistent && (
        <div className="ahp-cr-warning">
          <AlertCircle size={14} />
          <span>
            CR = {f4(CR)} melebihi batas 0.10. Silakan revisi nilai matriks perbandingan
            agar penilaian pakar lebih konsisten.
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function AhpPage() {
  const [model,   setModel]   = useState('karom');
  const [matrix,  setMatrix]  = useState(KAROM_EXPERT.map(r => [...r]));
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const labels = model === 'karom' ? KAROM_LABELS : KARU_LABELS;
  const codes  = model === 'karom' ? KAROM_CODES  : KARU_CODES;

  const loadAhp = useCallback(async (mdl) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAhp(mdl);
      setMatrix(data.matrix);
      setResult(data);
    } catch {
      const fallback = mdl === 'karom'
        ? KAROM_EXPERT.map(r => [...r])
        : KARU_EXPERT.map(r => [...r]);
      setMatrix(fallback);
      const local = computeAhpLocal(fallback);
      setResult({
        ...local,
        labels: mdl === 'karom' ? KAROM_LABELS : KARU_LABELS,
        codes:  mdl === 'karom' ? KAROM_CODES  : KARU_CODES,
        model: mdl,
      });
      setError('Backend tidak dapat dihubungi. Menampilkan hasil perhitungan lokal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const expert = model === 'karom' ? KAROM_EXPERT.map(r => [...r]) : KARU_EXPERT.map(r => [...r]);
    setMatrix(expert);
    loadAhp(model);
  }, [model, loadAhp]);

  async function handleRecalculate() {
    setLoading(true);
    setError(null);
    try {
      const data = await recomputeAhp({ matrix, labels, codes, model });
      setResult(data);
    } catch {
      const local = computeAhpLocal(matrix);
      setResult({ ...local, labels, codes, model });
      setError('Menggunakan perhitungan lokal (backend tidak tersedia).');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    const expert = model === 'karom' ? KAROM_EXPERT.map(r => [...r]) : KARU_EXPERT.map(r => [...r]);
    setMatrix(expert);
    loadAhp(model);
  }

  function handleMatrixChange(next) {
    setMatrix(next);
    const local = computeAhpLocal(next);
    setResult(prev => prev ? { ...prev, ...local, matrix: next } : { ...local, labels, codes, model });
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="ahp-page-head">
        <div className="ahp-head-left">
          <div className="ahp-head-icon">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="ahp-head-title">Visualisasi Perhitungan AHP</h1>
            <p className="ahp-head-sub">
              Analytical Hierarchy Process · Transparansi matematika pembobotan kriteria
            </p>
          </div>
        </div>

        {/* Model Toggle */}
        <div className="ahp-model-toggle">
          <button
            id="ahp-toggle-karom"
            className={`ahp-toggle-btn ${model === 'karom' ? 'active' : ''}`}
            onClick={() => setModel('karom')}
          >
            Model KAROM
            <span className="ahp-toggle-sub">6 Kriteria: C1–C6</span>
          </button>
          <button
            id="ahp-toggle-karu"
            className={`ahp-toggle-btn ${model === 'karu' ? 'active' : ''}`}
            onClick={() => setModel('karu')}
          >
            Model KARU
            <span className="ahp-toggle-sub">4 Kriteria: C1–C4</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="ahp-error-banner">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !result && (
        <div className="ahp-loading">
          <div className="loading-spinner" />
          <span className="loading-text">Menghitung AHP…</span>
        </div>
      )}

      {/* Sections */}
      <div className="ahp-sections">
        <PairwiseMatrix
          matrix={matrix}
          labels={labels}
          codes={codes}
          onMatrixChange={handleMatrixChange}
          onRecalculate={handleRecalculate}
          onReset={handleReset}
          loading={loading}
        />

        {result && (
          <>
            <WeightBars
              weights={result.weights}
              labels={labels}
              codes={codes}
            />
            <NormMatrix
              norm={result.norm_matrix ?? result.norm}
              rowSums={result.row_sums ?? result.rowSums}
              weights={result.weights}
              labels={labels}
              codes={codes}
            />
            <ConsistencyPanel
              n={result.n}
              lambdaMax={result.lambda_max ?? result.lambdaMax}
              CI={result.CI}
              RI={result.RI}
              CR={result.CR}
              consistent={result.consistent}
            />
          </>
        )}
      </div>
    </div>
  );
}
