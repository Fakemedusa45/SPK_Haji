import { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Crown, Users, ArrowUpDown, SlidersHorizontal,
  Medal, Star, ChevronDown, AlertCircle, Info, Award,
} from 'lucide-react';
import { fetchPm } from '../services/api';

/* ============================================================
   CONSTANTS
   ============================================================ */
const REGU_SIZE  = 11;   // ~10-11 jemaah per regu
const ROMB_SIZE  = 44;   // ~4 regu per rombongan

const BADGE_COLORS = {
  C1: 'ahp-badge-c1', C2: 'ahp-badge-c2', C3: 'ahp-badge-c3',
  C4: 'ahp-badge-c4', C5: 'ahp-badge-c5', C6: 'ahp-badge-c6',
};

const f4 = n => (typeof n === 'number' ? n.toFixed(4) : '—');

function toKode(idx) { return `A${String(idx + 1).padStart(3, '0')}`; }

/* ============================================================
   STATUS BADGE helpers
   ============================================================ */
function getStatus(rank, model) {
  if (rank === 1) return { label: `Direkomendasikan sebagai ${model.toUpperCase()}`, cls: 'rk-badge-top' };
  if (rank <= 3)  return { label: 'Kandidat Cadangan',                               cls: 'rk-badge-cad' };
  return          { label: 'Anggota',                                                 cls: 'rk-badge-angg' };
}

function getRankStyle(rank) {
  if (rank === 1) return 'rk-rank-gold';
  if (rank === 2) return 'rk-rank-silver';
  if (rank === 3) return 'rk-rank-bronze';
  return 'rk-rank-plain';
}

function RankIcon({ rank }) {
  if (rank === 1) return <Trophy size={16} className="rk-icon-gold" />;
  if (rank === 2) return <Medal  size={16} className="rk-icon-silver" />;
  if (rank === 3) return <Award  size={16} className="rk-icon-bronze" />;
  return null;
}

/* ============================================================
   TOP SUMMARY CARDS
   ============================================================ */
function SummaryCards({ karomTop, karuTop, total, model }) {
  const code1 = karomTop ? toKode(karomTop._origIdx ?? 0) : '—';
  const code2 = karuTop  ? toKode(karuTop._origIdx  ?? 0) : '—';

  return (
    <div className="rk-summary-row">
      {/* KAROM winner */}
      <div className="rk-summary-card rk-card-karom">
        <div className="rk-summary-tag">
          <Crown size={14} />
          Rekomendasi KAROM
        </div>
        <div className="rk-summary-name">{karomTop?.nama ?? 'Belum ada data'}</div>
        <div className="rk-summary-meta">
          <span className="rk-summary-kode">{code1}</span>
          {karomTop && (
            <span className="rk-summary-score">
              Nᵢ = <strong>{f4(karomTop.nilai_akhir)}</strong>
            </span>
          )}
        </div>
        <div className="rk-summary-sub">Ketua Rombongan · 6 Kriteria C1–C6</div>
      </div>

      {/* KARU winner */}
      <div className="rk-summary-card rk-card-karu">
        <div className="rk-summary-tag">
          <Star size={14} />
          Rekomendasi KARU
        </div>
        <div className="rk-summary-name">{karuTop?.nama ?? 'Belum ada data'}</div>
        <div className="rk-summary-meta">
          <span className="rk-summary-kode">{code2}</span>
          {karuTop && (
            <span className="rk-summary-score">
              Nᵢ = <strong>{f4(karuTop.nilai_akhir)}</strong>
            </span>
          )}
        </div>
        <div className="rk-summary-sub">Ketua Regu · 4 Kriteria C1–C4</div>
      </div>

      {/* Total */}
      <div className="rk-summary-card rk-card-total">
        <div className="rk-summary-tag">
          <Users size={14} />
          Total Dievaluasi
        </div>
        <div className="rk-summary-big-num">{total}</div>
        <div className="rk-summary-sub">
          {model === 'karom'
            ? 'Jemaah dalam Rombongan · Skala KAROM'
            : 'Jemaah dalam Regu · Skala KARU'}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TOOLBAR
   ============================================================ */
function Toolbar({
  model, setModel,
  reguList, selectedRegu, setSelectedRegu,
  ascending, setAscending,
  limitN, setLimitN,
}) {
  const [showLimit, setShowLimit] = useState(false);
  const LIMIT_OPTS = [5, 10, 15, 20, 50, 999];

  return (
    <div className="rk-toolbar">
      {/* Left: mode toggle + regu selector */}
      <div className="rk-toolbar-left">
        <div className="rk-mode-toggle">
          <button
            id="rk-toggle-karom"
            className={`rk-mode-btn ${model === 'karom' ? 'active' : ''}`}
            onClick={() => setModel('karom')}
          >
            <Crown size={13} />
            Pemeringkatan KAROM
            <span className="rk-mode-sub">Rombongan · 6 Kriteria</span>
          </button>
          <button
            id="rk-toggle-karu"
            className={`rk-mode-btn ${model === 'karu' ? 'active' : ''}`}
            onClick={() => setModel('karu')}
          >
            <Star size={13} />
            Pemeringkatan KARU
            <span className="rk-mode-sub">Regu · 4 Kriteria</span>
          </button>
        </div>

        {model === 'karu' && reguList.length > 0 && (
          <div className="rk-regu-wrap">
            <label className="rk-regu-label">Regu:</label>
            <select
              id="rk-regu-select"
              className="rk-regu-select"
              value={selectedRegu}
              onChange={e => setSelectedRegu(Number(e.target.value))}
            >
              <option value={0}>Semua Regu</option>
              {reguList.map(r => (
                <option key={r} value={r}>Regu {r}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: sort + limit */}
      <div className="rk-toolbar-right">
        <button
          id="rk-sort-btn"
          className="rk-tool-btn"
          onClick={() => setAscending(a => !a)}
          title={ascending ? 'Urutkan Tertinggi' : 'Urutkan Terendah'}
        >
          <ArrowUpDown size={14} />
          {ascending ? 'Urutkan Terendah' : 'Urutkan Tertinggi'}
        </button>

        <div className="rk-limit-wrap">
          <button
            id="rk-limit-btn"
            className="rk-tool-btn"
            onClick={() => setShowLimit(s => !s)}
          >
            <SlidersHorizontal size={14} />
            Edit Jumlah
            {limitN < 999 && <span className="rk-limit-badge">Top {limitN}</span>}
          </button>
          {showLimit && (
            <div className="rk-limit-panel">
              <p className="rk-limit-title">Tampilkan Top N</p>
              {LIMIT_OPTS.map(n => (
                <button
                  key={n}
                  className={`rk-limit-opt ${limitN === n ? 'active' : ''}`}
                  onClick={() => { setLimitN(n); setShowLimit(false); }}
                >
                  {n >= 999 ? 'Semua' : `Top ${n}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LEADERBOARD TABLE
   ============================================================ */
function LeaderboardTable({ rows, codes, labels, ahpWeights, model, origIndexMap }) {
  if (rows.length === 0) {
    return (
      <div className="rk-card rk-empty">
        <Users size={36} className="rk-empty-icon" />
        <p className="rk-empty-text">Belum ada data jemaah untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="rk-card rk-table-card">
      <div className="rk-table-wrap">
        <table className="rk-table">
          <thead>
            <tr>
              <th className="rk-th rk-th-rank">Peringkat</th>
              <th className="rk-th rk-th-kode">Kode</th>
              <th className="rk-th rk-th-nama">Nama Jemaah</th>
              {codes.map(c => (
                <th key={c} className="rk-th rk-th-skor">
                  <div className="rk-th-skor-inner">
                    <span className={`ahp-code-badge ${BADGE_COLORS[c]}`}>{c}</span>
                    <span className="rk-th-skor-label">Skor Wⱼ×Gap</span>
                  </div>
                </th>
              ))}
              <th className="rk-th rk-th-nilai">Nilai Akhir (Nᵢ)</th>
              <th className="rk-th rk-th-status">Status Rekomendasi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const origIdx = origIndexMap[row.no_porsi] ?? i;
              const kode    = toKode(origIdx);
              const rank    = row.rank;
              const status  = getStatus(rank, model);
              const isTop3  = rank <= 3;

              return (
                <tr key={row.no_porsi} className={`rk-tr ${isTop3 ? 'rk-tr-top' : ''}`}>
                  {/* Peringkat */}
                  <td className={`rk-td rk-td-rank ${getRankStyle(rank)}`}>
                    <div className="rk-rank-cell">
                      <RankIcon rank={rank} />
                      <span className="rk-rank-num">#{rank}</span>
                    </div>
                  </td>

                  {/* Kode */}
                  <td className="rk-td rk-td-kode">
                    <span className="rk-kode-chip">{kode}</span>
                  </td>

                  {/* Nama */}
                  <td className="rk-td rk-td-nama">
                    <span className={`rk-nama ${isTop3 ? 'rk-nama-bold' : ''}`}>{row.nama}</span>
                  </td>

                  {/* Skor per kriteria */}
                  {codes.map(c => (
                    <td key={c} className="rk-td rk-td-skor">
                      <span className="rk-skor-val">
                        {typeof row.skor_terbobot?.[c] === 'number'
                          ? row.skor_terbobot[c].toFixed(4)
                          : '—'}
                      </span>
                    </td>
                  ))}

                  {/* Nilai Akhir */}
                  <td className="rk-td rk-td-nilai">
                    <span className={`rk-nilai-chip rk-nilai-${rank <= 3 ? 'top' : 'plain'}`}>
                      {f4(row.nilai_akhir)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="rk-td rk-td-status">
                    <span className={`rk-status-badge ${status.cls}`}>
                      {status.label}
                    </span>
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

/* ============================================================
   BOTTOM — Penjelasan Status + Informasi Penting
   ============================================================ */
function BottomPanel({ codes, ahpWeights }) {
  return (
    <div className="rk-bottom">
      {/* Penjelasan Status Rekomendasi */}
      <div className="rk-card rk-explain-card">
        <h4 className="rk-explain-title">Penjelasan Status Rekomendasi</h4>
        <div className="rk-explain-grid">
          <div className="rk-explain-col">
            <div className="rk-explain-head karom">
              <Crown size={15} /> KAROM (Ketua Rombongan)
            </div>
            <ul className="rk-explain-list">
              <li>Dievaluasi pada skala <strong>rombongan (±44 jemaah)</strong> menggunakan <strong>6 kriteria C1–C6</strong></li>
              <li>Peringkat #1 mendapat status <em>"Direkomendasikan sebagai KAROM"</em></li>
              <li>Peringkat #2–#3 mendapat status <em>"Kandidat Cadangan"</em></li>
              <li>Selain itu mendapat status <em>"Anggota"</em></li>
              <li>Skor dihitung: Nᵢ = Σ(Wⱼ × Bobot Gap) berdasarkan bobot AHP</li>
            </ul>
          </div>
          <div className="rk-explain-col">
            <div className="rk-explain-head karu">
              <Star size={15} /> KARU (Ketua Regu)
            </div>
            <ul className="rk-explain-list">
              <li>Dievaluasi pada skala <strong>regu (±11 jemaah)</strong> menggunakan <strong>4 kriteria C1–C4</strong></li>
              <li>Peringkat #1 per regu mendapat status <em>"Direkomendasikan sebagai KARU"</em></li>
              <li>Peringkat #2–#3 per regu mendapat status <em>"Kandidat Cadangan"</em></li>
              <li>Selain itu mendapat status <em>"Anggota"</em></li>
              <li>Gunakan filter <em>"Regu"</em> di toolbar untuk melihat perankingan per regu</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Informasi Penting */}
      <div className="rk-card rk-info-card">
        <div className="rk-info-head">
          <Info size={15} />
          Informasi Penting
        </div>
        <div className="rk-info-body">
          <p>
            Sistem ini menggunakan metode <strong>AHP + Profile Matching</strong> untuk menghasilkan perankingan objektif.
            Bobot prioritas AHP (Wⱼ) berasal dari penilaian pakar Kemenag Kab. Kutai Kartanegara berdasarkan skala Saaty 1–9.
            Nilai akhir Nᵢ = Σ(Wⱼ × Bobot Gap ᵢⱼ) merupakan akumulasi skor terbobot seluruh kriteria.
          </p>
          <p>
            Kriteria meliputi: <strong>C1 Usia</strong>, <strong>C2 Kesehatan</strong>,
            <strong> C3 Jenis Kelamin</strong>, <strong>C4 Pekerjaan</strong> (untuk KAROM & KARU),
            serta <strong>C5 Pendidikan</strong> dan <strong>C6 Status Haji</strong> (khusus KAROM).
            Profil ideal target = 5 untuk semua kriteria sesuai Lampiran 3 skripsi.
          </p>
          {ahpWeights && Object.keys(ahpWeights).length > 0 && (
            <div className="rk-info-weights">
              <span className="rk-info-weights-label">Bobot AHP aktif:</span>
              {Object.entries(ahpWeights).map(([c, w]) => (
                <span key={c} className="rk-info-weight-item">
                  <span className={`ahp-code-badge ${BADGE_COLORS[c]}`}>{c}</span>
                  {f4(w)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function RankingPage() {
  const [model,       setModel]       = useState('karom');
  const [pmData,      setPmData]      = useState(null);       // karom data
  const [pmDataKaru,  setPmDataKaru]  = useState(null);       // karu data (for summary card)
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [ascending,   setAscending]   = useState(false);
  const [limitN,      setLimitN]      = useState(999);
  const [selectedRegu, setSelectedRegu] = useState(0);        // 0 = all regu

  /* ── Load both KAROM and KARU for summary cards ── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [karom, karu] = await Promise.all([fetchPm('karom'), fetchPm('karu')]);
      setPmData(karom);
      setPmDataKaru(karu);
    } catch {
      setError('Gagal memuat data. Pastikan backend berjalan dan data jemaah tersedia.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Derived display data ── */
  const activePm = model === 'karom' ? pmData : pmDataKaru;
  const codes    = activePm?.codes  || [];
  const labels   = activePm?.labels || [];
  const weights  = activePm?.ahp_weights || {};

  /* ── Build original index map (stable across sorts) ── */
  const origIndexMap = {};
  if (pmData?.jamaah_results) {
    pmData.jamaah_results.forEach((j, i) => { origIndexMap[j.no_porsi] = i; });
  }
  if (pmDataKaru?.jamaah_results) {
    pmDataKaru.jamaah_results.forEach((j, i) => {
      if (!(j.no_porsi in origIndexMap)) origIndexMap[j.no_porsi] = i;
    });
  }

  /* ── Regu list for KARU filter ── */
  const reguList = (() => {
    if (!pmDataKaru?.jamaah_results) return [];
    const regs = new Set();
    pmDataKaru.jamaah_results.forEach((_, i) => regs.add(Math.floor(i / REGU_SIZE) + 1));
    return [...regs].sort((a, b) => a - b);
  })();

  /* ── Filter + sort rows ── */
  let rows = [...(activePm?.jamaah_results || [])];

  if (model === 'karu' && selectedRegu > 0) {
    rows = rows.filter(r => {
      const origIdx = origIndexMap[r.no_porsi] ?? 0;
      return Math.floor(origIdx / REGU_SIZE) + 1 === selectedRegu;
    });
    // Re-rank within regu
    rows.sort((a, b) => b.nilai_akhir - a.nilai_akhir);
    rows = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  if (ascending) rows = [...rows].sort((a, b) => a.nilai_akhir - b.nilai_akhir);
  if (limitN < 999) rows = rows.slice(0, limitN);

  /* ── Summary data ── */
  const karomTop = pmData?.jamaah_results?.[0];
  const karuTop  = pmDataKaru?.jamaah_results?.[0];
  const total    = activePm?.jamaah_results?.length ?? 0;

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="rk-page-head">
        <div className="rk-head-left">
          <div className="rk-head-icon"><Trophy size={22} /></div>
          <div>
            <h1 className="rk-head-title">Hasil Akhir (Perankingan)</h1>
            <p className="rk-head-sub">
              Perankingan jemaah berdasarkan Nilai Akhir Nᵢ = Σ(Wⱼ × Bobot Gap) · AHP + Profile Matching
            </p>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="ahp-error-banner" style={{ marginBottom: 20 }}>
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="ahp-loading">
          <div className="loading-spinner" />
          <span className="loading-text">Menghitung Perankingan…</span>
        </div>
      )}

      {!loading && (pmData || pmDataKaru) && (
        <>
          {/* Summary Cards */}
          <SummaryCards
            karomTop={karomTop}
            karuTop={karuTop}
            total={total}
            model={model}
          />

          {/* Toolbar */}
          <Toolbar
            model={model} setModel={m => { setModel(m); setSelectedRegu(0); }}
            reguList={reguList}
            selectedRegu={selectedRegu} setSelectedRegu={setSelectedRegu}
            ascending={ascending} setAscending={setAscending}
            limitN={limitN} setLimitN={setLimitN}
          />

          {/* Leaderboard */}
          <LeaderboardTable
            rows={rows}
            codes={codes}
            labels={labels}
            ahpWeights={weights}
            model={model}
            origIndexMap={origIndexMap}
          />

          {/* Bottom panels */}
          <BottomPanel codes={codes} ahpWeights={weights} />
        </>
      )}
    </div>
  );
}
