import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FlaskConical, TrendingUp, BarChart2, ShieldCheck,
  ChevronRight, AlertCircle, X, Info, Layers,
  CheckCircle2, AlertTriangle, Search, Filter, Crown, Star,
  Target, Check, Users, ArrowUpRight
} from 'lucide-react';
import { fetchEvaluation } from '../services/api';

/* ============================================================
   HELPERS & FORMATTERS
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

function getF1Badge(f1) {
  if (f1 >= 80) return { label: 'Sangat Baik', cls: 'high' };
  if (f1 >= 60) return { label: 'Baik', cls: 'high' };
  if (f1 >= 40) return { label: 'Cukup', cls: 'mid' };
  return { label: 'Evaluasi Lanjut', cls: 'low' };
}

/* ============================================================
   TAB 1: CONFUSION MATRIX (UJI VALIDITAS) COMPONENTS
   ============================================================ */

function ConfusionMatrixBanner() {
  return (
    <div className="cm-banner">
      <div className="cm-banner-icon">
        <Target size={22} />
      </div>
      <div className="cm-banner-body">
        <h2 className="cm-banner-title">
          Uji Validitas Rekomendasi SPK — Confusion Matrix
        </h2>
        <p className="cm-banner-text">
          Pengujian ini memvalidasi keakuratan rekomendasi sistem (AHP + Profile Matching)
          terhadap data penetapan ketua aktual dari <strong>Kantor Kementerian Haji dan Umrah Kab. Kutai Kartanegara</strong> yang tersimpan pada manifest SISKOHAT (<code>status_aktual</code>).
          Sistem mengevaluasi apakah kandidat <strong>Peringkat #1</strong> pada masing-masing grup (Rombongan / Regu) sesuai dengan ketua yang ditunjuk secara manual.
        </p>
        <div className="cm-banner-badges">
          <span className="cm-banner-pill">
            <Crown size={13} /> KAROM: 6 Kriteria (C1–C6) · Seleksi per Rombongan
          </span>
          <span className="cm-banner-pill">
            <Star size={13} /> KARU: 4 Kriteria (C1–C4) · Seleksi per Regu
          </span>
          <span className="cm-banner-pill">
            <Users size={13} /> Acuan: SISKOHAT Manifest (4-KAROM, 5-KARU, 0-Jamaah)
          </span>
        </div>
      </div>
    </div>
  );
}

function CmKpiCards({ accuracy, precision, recall, f1_score, tp, tn, fpVal, fn, total }) {
  const f1Badge = getF1Badge(f1_score);

  return (
    <div className="cm-kpi-grid">
      {/* Accuracy */}
      <div className="cm-kpi-card cm-kpi-acc">
        <div className="cm-kpi-header">
          <span className="cm-kpi-title">Accuracy</span>
          <span className="cm-kpi-formula">(TP + TN) / Total</span>
        </div>
        <div className="cm-kpi-value-row">
          <span className="cm-kpi-value">{fp(accuracy)}</span>
        </div>
        <div className="cm-kpi-sub">
          <strong>{tp + tn}</strong> dari <strong>{total}</strong> klasifikasi jemaah tepat secara keseluruhan
        </div>
      </div>

      {/* Precision */}
      <div className="cm-kpi-card cm-kpi-prec">
        <div className="cm-kpi-header">
          <span className="cm-kpi-title">Precision</span>
          <span className="cm-kpi-formula">TP / (TP + FP)</span>
        </div>
        <div className="cm-kpi-value-row">
          <span className="cm-kpi-value">{fp(precision)}</span>
        </div>
        <div className="cm-kpi-sub">
          <strong>{tp}</strong> tepat dari <strong>{tp + fpVal}</strong> kandidat yang direkomendasikan sistem
        </div>
      </div>

      {/* Recall */}
      <div className="cm-kpi-card cm-kpi-rec">
        <div className="cm-kpi-header">
          <span className="cm-kpi-title">Recall (Sensitivitas)</span>
          <span className="cm-kpi-formula">TP / (TP + FN)</span>
        </div>
        <div className="cm-kpi-value-row">
          <span className="cm-kpi-value">{fp(recall)}</span>
        </div>
        <div className="cm-kpi-sub">
          <strong>{tp}</strong> terpilih dari <strong>{tp + fn}</strong> ketua aktual pada manifest manual
        </div>
      </div>

      {/* F1-Score */}
      <div className="cm-kpi-card cm-kpi-f1">
        <div className="cm-kpi-header">
          <span className="cm-kpi-title">F1-Score</span>
          <span className="cm-kpi-formula">2 × (P × R) / (P + R)</span>
        </div>
        <div className="cm-kpi-value-row">
          <span className="cm-kpi-value">{fp(f1_score)}</span>
          <span className={`cm-kpi-badge ${f1Badge.cls}`}>{f1Badge.label}</span>
        </div>
        <div className="cm-kpi-sub">
          Harmonic mean antara presisi rekomendasi dan sensitivitas seleksi
        </div>
      </div>
    </div>
  );
}

function ConfusionMatrixGrid({ tp, tn, fpVal, fn, total }) {
  const actualPos = tp + fn;
  const actualNeg = fpVal + tn;
  const predPos = tp + fpVal;
  const predNeg = fn + tn;

  const pct = v => (total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%');

  return (
    <div className="cm-matrix-card">
      <div className="cm-matrix-head">
        <div className="cm-matrix-title-wrap">
          <div className="ev-card-icon"><Target size={18} /></div>
          <div>
            <h3 className="cm-matrix-title">Visualisasi Matriks Kontingensi 2×2 (Confusion Matrix)</h3>
            <p className="cm-matrix-subtitle">
              Sumbu Baris: Keputusan Aktual Manual Kemenhaj · Sumbu Kolom: Prediksi Rekomendasi Sistem SPK
            </p>
          </div>
        </div>
      </div>

      <div className="cm-matrix-wrapper">
        <table className="cm-table-grid">
          <thead>
            <tr>
              <th rowSpan={2} colSpan={2} style={{ border: 'none', background: 'transparent' }}></th>
              <th colSpan={2} className="cm-axis-top-title">
                PREDIKSI SISTEM SPK (AHP + PROFILE MATCHING)
              </th>
              <th rowSpan={2} className="cm-axis-col-header" style={{ minWidth: 120 }}>
                Total Aktual
              </th>
            </tr>
            <tr>
              <th className="cm-axis-col-header pos">
                POSITIF (Calon Ketua #1)
              </th>
              <th className="cm-axis-col-header neg">
                NEGATIF (Anggota Biasa)
              </th>
            </tr>
          </thead>
          <tbody>
            {/* ROW 1: AKTUAL POSITIF */}
            <tr>
              <td
                rowSpan={2}
                className="cm-axis-row-header"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  textAlign: 'center',
                  background: '#f8fafc',
                  fontWeight: 800,
                  color: '#4338ca',
                  letterSpacing: '1px',
                  minWidth: 40,
                  padding: '10px 4px'
                }}
              >
                AKTUAL KEMENHAJ
              </td>
              <td className="cm-axis-row-header pos">
                <strong>POSITIF</strong>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#166534', marginTop: 2 }}>
                  Terpilih Manual (Ketua)
                </div>
              </td>
              {/* CELL: TP */}
              <td>
                <div className="cm-cell-box cm-box-tp">
                  <div className="cm-box-tag">
                    <CheckCircle2 size={12} /> True Positive (TP)
                  </div>
                  <div className="cm-box-count">{tp}</div>
                  <div className="cm-box-desc">
                    Terpilih manual oleh Kemenhaj <strong>DAN</strong> direkomendasikan #1 oleh sistem
                  </div>
                  <div className="cm-box-share">{pct(tp)} dari populasi</div>
                </div>
              </td>
              {/* CELL: FN */}
              <td>
                <div className="cm-cell-box cm-box-fn">
                  <div className="cm-box-tag">
                    <AlertTriangle size={12} /> False Negative (FN)
                  </div>
                  <div className="cm-box-count">{fn}</div>
                  <div className="cm-box-desc">
                    Terpilih manual oleh Kemenhaj, <strong>TETAPI</strong> bukan peringkat #1 di sistem
                  </div>
                  <div className="cm-box-share">{pct(fn)} dari populasi</div>
                </div>
              </td>
              {/* MARGINAL: TOTAL ACTUAL POS */}
              <td>
                <div className="cm-marginal-cell">
                  <div className="cm-marginal-val" style={{ color: '#15803d' }}>{actualPos}</div>
                  <div className="cm-marginal-label">Aktual Ketua</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    TP + FN
                  </div>
                </div>
              </td>
            </tr>

            {/* ROW 2: AKTUAL NEGATIF */}
            <tr>
              <td className="cm-axis-row-header neg">
                <strong>NEGATIF</strong>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', marginTop: 2 }}>
                  Anggota Biasa
                </div>
              </td>
              {/* CELL: FP */}
              <td>
                <div className="cm-cell-box cm-box-fp">
                  <div className="cm-box-tag">
                    <AlertCircle size={12} /> False Positive (FP)
                  </div>
                  <div className="cm-box-count">{fpVal}</div>
                  <div className="cm-box-desc">
                    Anggota biasa pada manual, <strong>TETAPI</strong> direkomendasikan #1 oleh sistem
                  </div>
                  <div className="cm-box-share">{pct(fpVal)} dari populasi</div>
                </div>
              </td>
              {/* CELL: TN */}
              <td>
                <div className="cm-cell-box cm-box-tn">
                  <div className="cm-box-tag">
                    <Check size={12} /> True Negative (TN)
                  </div>
                  <div className="cm-box-count">{tn}</div>
                  <div className="cm-box-desc">
                    Anggota biasa pada pemilihan manual <strong>DAN</strong> anggota biasa pada sistem
                  </div>
                  <div className="cm-box-share">{pct(tn)} dari populasi</div>
                </div>
              </td>
              {/* MARGINAL: TOTAL ACTUAL NEG */}
              <td>
                <div className="cm-marginal-cell">
                  <div className="cm-marginal-val" style={{ color: '#475569' }}>{actualNeg}</div>
                  <div className="cm-marginal-label">Aktual Anggota</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    FP + TN
                  </div>
                </div>
              </td>
            </tr>

            {/* MARGINAL BOTTOM: TOTAL PREDICTIONS */}
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', paddingRight: 14, fontWeight: 700, fontSize: 12, color: 'var(--color-text-muted)' }}>
                Total Prediksi Sistem:
              </td>
              <td>
                <div className="cm-marginal-cell">
                  <div className="cm-marginal-val" style={{ color: '#4338ca' }}>{predPos}</div>
                  <div className="cm-marginal-label">Rekomendasi Ketua (TP + FP)</div>
                </div>
              </td>
              <td>
                <div className="cm-marginal-cell">
                  <div className="cm-marginal-val" style={{ color: '#64748b' }}>{predNeg}</div>
                  <div className="cm-marginal-label">Rekomendasi Anggota (FN + TN)</div>
                </div>
              </td>
              <td>
                <div className="cm-marginal-cell" style={{ background: '#eef2ff', borderColor: '#c7d2fe' }}>
                  <div className="cm-marginal-val" style={{ color: '#312e81', fontSize: 20 }}>{total}</div>
                  <div className="cm-marginal-label" style={{ color: '#4338ca', fontWeight: 800 }}>Total Jemaah</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupComparisonTable({ mode, groupComparisons, selectedGroup }) {
  if (!groupComparisons || groupComparisons.length === 0) return null;

  const filteredGroups = selectedGroup && selectedGroup !== 'all'
    ? groupComparisons.filter(g => String(g.group_id) === String(selectedGroup))
    : groupComparisons;

  const isKarom = mode === 'karom';
  const groupLabel = isKarom ? 'Rombongan' : 'Regu';

  return (
    <div className="cm-group-card">
      <div className="ev-card-head" style={{ marginBottom: 16 }}>
        <div className="ev-card-head-left">
          <div className="ev-card-icon">
            {isKarom ? <Crown size={16} /> : <Star size={16} />}
          </div>
          <div>
            <h3 className="ev-card-title">
              Tabel Komparasi Pemilihan Manual vs Rekomendasi Sistem ({groupLabel})
            </h3>
            <p className="ev-card-sub">
              Membandingkan kandidat ketua yang dipilih manual oleh Kemenhaj vs Rekomendasi #1 Sistem pada setiap {groupLabel.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="ev-table-wrap">
        <table className="ev-table">
          <thead>
            <tr>
              <th className="ev-th ev-th-center" style={{ width: 110 }}>{groupLabel}</th>
              <th className="ev-th ev-th-center" style={{ width: 100 }}>Anggota</th>
              <th className="ev-th">Pilihan Manual Kemenhaj (Aktual)</th>
              <th className="ev-th">Rekomendasi #1 Sistem (Prediksi)</th>
              <th className="ev-th ev-th-center" style={{ width: 150 }}>Status Validasi</th>
            </tr>
          </thead>
          <tbody>
            {filteredGroups.map(g => {
              const manual = g.manual_leader;
              const sys = g.system_leader;
              const isMatch = g.is_match;

              return (
                <tr key={g.group_id} className="ev-tr" style={{ background: isMatch ? '#f0fdf4' : undefined }}>
                  <td className="ev-td ev-td-center">
                    <span className="rk-badge-top" style={{ fontSize: 11.5, padding: '4px 10px' }}>
                      {groupLabel} {g.group_id}
                    </span>
                  </td>
                  <td className="ev-td ev-td-center">
                    <span style={{ fontWeight: 700, color: 'var(--color-text-muted)' }}>
                      {g.total_members} jemaah
                    </span>
                  </td>
                  <td className="ev-td">
                    {manual ? (
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {manual.nama}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          No. Porsi: <span style={{ fontFamily: 'var(--font-mono)' }}>{manual.no_porsi}</span>
                          &nbsp;·&nbsp;
                          Skor: <strong>{f4(manual.nilai_akhir)}</strong>
                          &nbsp;·&nbsp;
                          Peringkat di grup: <span className="ev-rank-pill">#{manual.rank_in_group}</span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: 12 }}>
                        — Tidak ada penunjukan ketua manual pada grup ini
                      </span>
                    )}
                  </td>
                  <td className="ev-td">
                    {sys ? (
                      <div>
                        <div style={{ fontWeight: 700, color: isMatch ? '#15803d' : '#4338ca' }}>
                          {sys.nama}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          No. Porsi: <span style={{ fontFamily: 'var(--font-mono)' }}>{sys.no_porsi}</span>
                          &nbsp;·&nbsp;
                          Skor: <strong>{f4(sys.nilai_akhir)}</strong>
                          &nbsp;·&nbsp;
                          Status Manifest: <span className="rk-summary-kode">{sys.status_aktual}</span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="ev-td ev-td-center">
                    {isMatch ? (
                      <span className="cm-match-badge">
                        <CheckCircle2 size={13} /> Sesuai (TP)
                      </span>
                    ) : (
                      <span className="cm-nomatch-badge">
                        <AlertTriangle size={13} /> Berbeda ({manual ? 'FP & FN' : 'FP'})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailClassificationTable({ items, quadrantCounts }) {
  const [qFilter, setQFilter] = useState('ALL');
  const [search, setSearch]   = useState('');

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      if (qFilter !== 'ALL' && it.quadrant !== qFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const mNama = (it.nama || '').toLowerCase().includes(q);
        const mPorsi = (it.no_porsi || '').toLowerCase().includes(q);
        const mKode = (it.kode || '').toLowerCase().includes(q);
        if (!mNama && !mPorsi && !mKode) return false;
      }
      return true;
    });
  }, [items, qFilter, search]);

  const getQBadge = q => {
    switch (q) {
      case 'TP': return <span className="cm-qbadge cm-qbadge-tp" title="True Positive">TP</span>;
      case 'TN': return <span className="cm-qbadge cm-qbadge-tn" title="True Negative">TN</span>;
      case 'FP': return <span className="cm-qbadge cm-qbadge-fp" title="False Positive">FP</span>;
      case 'FN': return <span className="cm-qbadge cm-qbadge-fn" title="False Negative">FN</span>;
      default:   return null;
    }
  };

  return (
    <div className="cm-detail-card">
      <div className="ev-card-head" style={{ marginBottom: 16 }}>
        <div className="ev-card-head-left">
          <div className="ev-card-icon"><Users size={16} /></div>
          <div>
            <h3 className="ev-card-title">Tabel Detail Klasifikasi Seluruh Jemaah</h3>
            <p className="ev-card-sub">
              Daftar klasifikasi setiap jemaah dengan filter kuadran (TP, FP, FN, TN) dan pencarian nama
            </p>
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="cm-detail-filters">
        <div className="cm-quadrant-btn-group">
          <button
            className={`cm-qbtn ${qFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setQFilter('ALL')}
          >
            Semua <span className="cm-qcount">{items.length}</span>
          </button>
          <button
            className={`cm-qbtn q-tp ${qFilter === 'TP' ? 'active' : ''}`}
            onClick={() => setQFilter('TP')}
          >
            TP (Sesuai Ketua) <span className="cm-qcount">{quadrantCounts.tp}</span>
          </button>
          <button
            className={`cm-qbtn q-fp ${qFilter === 'FP' ? 'active' : ''}`}
            onClick={() => setQFilter('FP')}
          >
            FP (Rekomendasi Baru) <span className="cm-qcount">{quadrantCounts.fp}</span>
          </button>
          <button
            className={`cm-qbtn q-fn ${qFilter === 'FN' ? 'active' : ''}`}
            onClick={() => setQFilter('FN')}
          >
            FN (Ketua Manual Kalah Skor) <span className="cm-qcount">{quadrantCounts.fn}</span>
          </button>
          <button
            className={`cm-qbtn q-tn ${qFilter === 'TN' ? 'active' : ''}`}
            onClick={() => setQFilter('TN')}
          >
            TN (Anggota Biasa) <span className="cm-qcount">{quadrantCounts.tn}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="cm-search-input"
            placeholder="Cari nama, nomor porsi, atau kode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="ev-table-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
        <table className="ev-table">
          <thead>
            <tr>
              <th className="ev-th ev-th-center" style={{ width: 80 }}>Kode</th>
              <th className="ev-th">Nama Jemaah</th>
              <th className="ev-th ev-th-center">Romb / Regu</th>
              <th className="ev-th ev-th-center">Skor Akhir (Ni)</th>
              <th className="ev-th ev-th-center">Peringkat di Grup</th>
              <th className="ev-th">Status Manual (Aktual)</th>
              <th className="ev-th">Prediksi Sistem</th>
              <th className="ev-th ev-th-center" style={{ width: 90 }}>Kuadran</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--color-text-muted)' }}>
                  Tidak ada jemaah yang sesuai dengan filter filter yang dipilih
                </td>
              </tr>
            ) : (
              filteredItems.map(it => (
                <tr key={it.no_porsi} className="ev-tr">
                  <td className="ev-td ev-td-center">
                    <span className="rk-kode-chip">{it.kode}</span>
                  </td>
                  <td className="ev-td ev-td-nama">
                    <div>{it.nama}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {it.no_porsi}
                    </div>
                  </td>
                  <td className="ev-td ev-td-center">
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      Romb {it.rombongan || '—'} · Regu {it.regu || '—'}
                    </span>
                  </td>
                  <td className="ev-td ev-td-center">
                    <span className="ev-score-x" style={{ fontWeight: 700 }}>
                      {f4(it.nilai_akhir)}
                    </span>
                  </td>
                  <td className="ev-td ev-td-center">
                    <span className={`ev-rank-pill ${it.rank_in_group === 1 ? 'rk-badge-top' : ''}`} style={{ fontSize: 11 }}>
                      #{it.rank_in_group}
                    </span>
                  </td>
                  <td className="ev-td">
                    <span className={`cm-role-badge ${
                      it.status_aktual.includes('KAROM') ? 'cm-role-karom' :
                      it.status_aktual.includes('KARU') ? 'cm-role-karu' : 'cm-role-angg'
                    }`}>
                      {it.status_aktual}
                    </span>
                  </td>
                  <td className="ev-td">
                    <span className={`cm-role-badge ${
                      it.prediksi_sistem.includes('KAROM') ? 'cm-role-karom' :
                      it.prediksi_sistem.includes('KARU') ? 'cm-role-karu' : 'cm-role-angg'
                    }`}>
                      {it.prediksi_sistem}
                    </span>
                  </td>
                  <td className="ev-td ev-td-center">
                    {getQBadge(it.quadrant)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 12, textAlign: 'right' }}>
        Menampilkan <strong>{filteredItems.length}</strong> dari <strong>{items.length}</strong> jemaah
      </div>
    </div>
  );
}

/* ============================================================
   TAB 2: SENSITIVITY & STABILITY COMPONENTS (ORIGINAL INTACT)
   ============================================================ */

function OverviewBanner() {
  return (
    <div className="ev-banner">
      <div className="ev-banner-icon"><FlaskConical size={20} /></div>
      <div className="ev-banner-body">
        <h2 className="ev-banner-title">Pengujian Stabilitas Sistem — Tujuan & Metodologi</h2>
        <p className="ev-banner-text">
          Pengujian ini memvalidasi <strong>keandalan dan ketahanan algoritma SPK</strong> terhadap variasi bobot kriteria melalui tiga ukuran statistik:
        </p>
        <div className="ev-banner-points">
          <div className="ev-banner-point">
            <span className="ev-bp-num">12</span>
            <div>
              <strong>Skenario Analisis Sensitivitas</strong> — Modifikasi bobot AHP (+5% dan +10%)
              pada masing-masing kriteria C1–C6 (bobot ditambah, lalu dinormalisasi ulang agar Σwⱼ = 1),
              lalu hitung persentase deviasi skor
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

function KpiCards({ summary }) {
  const { avg_sensitivity, avg_spearman, avg_pearson,
          interp_spearman, interp_pearson, robust } = summary;

  return (
    <div className="ev-kpi-row">
      <div className="ev-kpi-card ev-kpi-deviasi">
        <div className="ev-kpi-icon"><TrendingUp size={18} /></div>
        <div className="ev-kpi-label">Rata-rata Deviasi (S̄)</div>
        <div className="ev-kpi-value">{fp(avg_sensitivity)}</div>
        <div className="ev-kpi-sub">Rata-rata selisih skor 12 skenario vs baseline</div>
      </div>

      <div className="ev-kpi-card ev-kpi-spearman">
        <div className="ev-kpi-icon"><BarChart2 size={18} /></div>
        <div className="ev-kpi-label">Rata-rata Spearman (r̄ₛ)</div>
        <div className="ev-kpi-value">{f4(avg_spearman)}</div>
        <span className={`ev-kpi-badge ${interpClass(avg_spearman)}`}>{interp_spearman}</span>
        <div className="ev-kpi-sub">Stabilitas urutan peringkat · target ≥ 0.80</div>
      </div>

      <div className="ev-kpi-card ev-kpi-pearson">
        <div className="ev-kpi-icon"><BarChart2 size={18} /></div>
        <div className="ev-kpi-label">Rata-rata Pearson (r̄)</div>
        <div className="ev-kpi-value">{f4(avg_pearson)}</div>
        <span className={`ev-kpi-badge ${interpClass(avg_pearson)}`}>{interp_pearson}</span>
        <div className="ev-kpi-sub">Linieritas skor · target ≥ 0.80</div>
      </div>

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

function DrilldownModal({ scenario, onClose }) {
  const { scenario_no, criteria_label, delta, delta_label, spearman_rs, pearson_r,
          avg_sensitivity_pct, category, detail, modified_weights, base_weights } = scenario;

  const dLabel = delta_label || `+${delta}`;
  const codes = Object.keys(modified_weights || {});

  return (
    <div className="ev-modal-overlay" onClick={onClose}>
      <div className="ev-modal" onClick={e => e.stopPropagation()}>
        <div className="ev-modal-head">
          <div className="ev-modal-title-wrap">
            <div className="ev-modal-icon"><Layers size={16} /></div>
            <div>
              <h3 className="ev-modal-title">
                Skenario {scenario_no} — Modifikasi {criteria_label} ({dLabel})
              </h3>
              <p className="ev-modal-sub">
                Detail perbandingan skor dan peringkat baseline vs simulasi
              </p>
            </div>
          </div>
          <button className="ev-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

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

function ScenarioTable({ scenarios, onSelect }) {
  return (
    <div className="ev-card ev-table-card">
      <div className="ev-card-head">
        <div className="ev-card-head-left">
          <div className="ev-card-icon"><Layers size={15} /></div>
          <div>
            <h3 className="ev-card-title">Tabel Master 12 Skenario Pengujian Stabilitas</h3>
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
                  <span className="ev-delta-chip">{s.delta_label || `+${s.delta}`}</span>
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
   MAIN EVALUATION PAGE
   ============================================================ */

export default function EvaluationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tab state: 'validitas' (Confusion Matrix) | 'stabilitas' (Sensitivity/Spearman/Pearson)
  const [activeTab, setActiveTab] = useState('validitas');

  // Confusion Matrix mode: 'karom' | 'karu' | 'gabungan'
  const [cmMode, setCmMode] = useState('karom');
  const [selectedGroup, setSelectedGroup] = useState('all');

  // Stability Drilldown Modal
  const [selectedScenario, setSelectedScenario] = useState(null);

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

  useEffect(() => {
    load();
  }, [load]);

  // Reset group filter when switching CM mode
  const handleModeChange = newMode => {
    setCmMode(newMode);
    setSelectedGroup('all');
  };

  const cmData = data?.confusion_matrix?.[cmMode];
  const allItems = cmData?.items || [];
  const groupComparisons = cmData?.group_comparisons || [];

  // Extract unique groups for the dropdown
  const uniqueGroups = useMemo(() => {
    if (cmMode === 'karom') {
      const set = new Set();
      allItems.forEach(i => { if (i.rombongan != null) set.add(i.rombongan); });
      return Array.from(set).sort((a, b) => a - b);
    } else if (cmMode === 'karu') {
      const set = new Set();
      allItems.forEach(i => { if (i.regu != null) set.add(i.regu); });
      return Array.from(set).sort((a, b) => a - b);
    } else {
      // Gabungan: list of rombongans
      const set = new Set();
      allItems.forEach(i => { if (i.rombongan != null) set.add(i.rombongan); });
      return Array.from(set).sort((a, b) => a - b);
    }
  }, [allItems, cmMode]);

  // Reactive items filtered by group dropdown
  const filteredByGroup = useMemo(() => {
    if (!selectedGroup || selectedGroup === 'all') return allItems;
    if (cmMode === 'karom') {
      return allItems.filter(i => String(i.rombongan) === String(selectedGroup));
    } else if (cmMode === 'karu') {
      return allItems.filter(i => String(i.regu) === String(selectedGroup));
    } else {
      return allItems.filter(i => String(i.rombongan) === String(selectedGroup));
    }
  }, [allItems, selectedGroup, cmMode]);

  // Dynamically recalculated CM metrics based on active filter
  const dynamicMetrics = useMemo(() => {
    const tp = filteredByGroup.filter(i => i.quadrant === 'TP').length;
    const tn = filteredByGroup.filter(i => i.quadrant === 'TN').length;
    const fpVal = filteredByGroup.filter(i => i.quadrant === 'FP').length;
    const fn = filteredByGroup.filter(i => i.quadrant === 'FN').length;
    const total = tp + tn + fpVal + fn;

    const accuracy = total > 0 ? ((tp + tn) / total) * 100 : 0;
    const precision = (tp + fpVal) > 0 ? (tp / (tp + fpVal)) * 100 : 0;
    const recall = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 0;
    const f1_score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return { tp, tn, fpVal, fn, total, accuracy, precision, recall, f1_score };
  }, [filteredByGroup]);

  const hasData = data && data.scenarios && data.scenarios.length > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="ev-page-head">
        <div className="ev-head-left">
          <div className="ev-head-icon"><FlaskConical size={22} /></div>
          <div>
            <h1 className="ev-head-title">Pengujian Sistem SPK</h1>
            <p className="ev-head-sub">
              Validasi Akurasi (Confusion Matrix) &amp; Uji Ketahanan Algoritma (Sensitivity Analysis · Spearman · Pearson)
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="ev-tab-bar">
        <button
          className={`ev-tab-btn ${activeTab === 'validitas' ? 'active' : ''}`}
          onClick={() => setActiveTab('validitas')}
        >
          <span className="ev-tab-icon"><Target size={16} /></span>
          Uji Validitas (Confusion Matrix)
        </button>
        <button
          className={`ev-tab-btn ${activeTab === 'stabilitas' ? 'active' : ''}`}
          onClick={() => setActiveTab('stabilitas')}
        >
          <span className="ev-tab-icon"><BarChart2 size={16} /></span>
          Uji Stabilitas (Analisis Sensitivitas &amp; Korelasi)
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="ahp-error-banner" style={{ marginBottom: 20 }}>
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="ahp-loading">
          <div className="loading-spinner" />
          <span className="loading-text">Memuat hasil pengujian dan validasi data…</span>
        </div>
      )}

      {!loading && data && (
        <>
          {/* TAB 1: CONFUSION MATRIX */}
          {activeTab === 'validitas' && (
            <div>
              <ConfusionMatrixBanner />

              {/* Toolbar: Mode Toggle & Group Filter */}
              <div className="cm-toolbar">
                <div className="cm-mode-toggle">
                  <button
                    className={`cm-mode-btn ${cmMode === 'karom' ? 'active' : ''}`}
                    onClick={() => handleModeChange('karom')}
                  >
                    Seleksi KAROM (6 Kriteria · Rombongan)
                  </button>
                  <button
                    className={`cm-mode-btn ${cmMode === 'karu' ? 'active' : ''}`}
                    onClick={() => handleModeChange('karu')}
                  >
                    Seleksi KARU (4 Kriteria · Regu)
                  </button>
                  <button
                    className={`cm-mode-btn ${cmMode === 'gabungan' ? 'active' : ''}`}
                    onClick={() => handleModeChange('gabungan')}
                  >
                    Gabungan KAROM &amp; KARU
                  </button>
                </div>

                <div className="cm-filter-wrap">
                  <span className="cm-filter-label">
                    <Filter size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    Filter {cmMode === 'karu' ? 'Regu' : 'Rombongan'}:
                  </span>
                  <select
                    className="cm-filter-select"
                    value={selectedGroup}
                    onChange={e => setSelectedGroup(e.target.value)}
                  >
                    <option value="all">
                      Semua {cmMode === 'karu' ? 'Regu' : 'Rombongan'} ({allItems.length} Jemaah)
                    </option>
                    {uniqueGroups.map(grp => (
                      <option key={grp} value={grp}>
                        {cmMode === 'karu' ? `Regu ${grp}` : `Rombongan ${grp}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4 KPI Cards */}
              <CmKpiCards
                accuracy={dynamicMetrics.accuracy}
                precision={dynamicMetrics.precision}
                recall={dynamicMetrics.recall}
                f1_score={dynamicMetrics.f1_score}
                tp={dynamicMetrics.tp}
                tn={dynamicMetrics.tn}
                fpVal={dynamicMetrics.fpVal}
                fn={dynamicMetrics.fn}
                total={dynamicMetrics.total}
              />

              {/* 2x2 Confusion Matrix Grid */}
              <ConfusionMatrixGrid
                tp={dynamicMetrics.tp}
                tn={dynamicMetrics.tn}
                fpVal={dynamicMetrics.fpVal}
                fn={dynamicMetrics.fn}
                total={dynamicMetrics.total}
              />

              {/* Group Comparison Table (per Rombongan / Regu) */}
              {cmMode !== 'gabungan' && (
                <GroupComparisonTable
                  mode={cmMode}
                  groupComparisons={groupComparisons}
                  selectedGroup={selectedGroup}
                />
              )}

              {/* Detail Classification Table with Quadrant Filters */}
              <DetailClassificationTable
                items={filteredByGroup}
                quadrantCounts={{
                  tp: dynamicMetrics.tp,
                  tn: dynamicMetrics.tn,
                  fp: dynamicMetrics.fpVal,
                  fn: dynamicMetrics.fn,
                }}
              />
            </div>
          )}

          {/* TAB 2: STABILITY / SENSITIVITY ANALYSIS */}
          {activeTab === 'stabilitas' && (
            <div>
              <OverviewBanner />

              {!hasData ? (
                <EmptyState />
              ) : (
                <>
                  <KpiCards summary={data.summary} />
                  <ScenarioTable scenarios={data.scenarios} onSelect={setSelectedScenario} />
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Drilldown Modal for Stability Scenarios */}
      {selectedScenario && (
        <DrilldownModal
          scenario={selectedScenario}
          onClose={() => setSelectedScenario(null)}
        />
      )}
    </div>
  );
}
