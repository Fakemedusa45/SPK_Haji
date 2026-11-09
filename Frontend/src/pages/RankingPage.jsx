import { useState, useEffect, useCallback, useMemo } from 'react';
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
  C7: 'ahp-badge-c7', C8: 'ahp-badge-c8', C9: 'ahp-badge-c9',
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
function SummaryCards({ karomTop, karuTop, total, model, effectiveRomb, effectiveRegu }) {
  const code1 = karomTop ? toKode(karomTop._origIdx ?? 0) : '—';
  const code2 = karuTop  ? toKode(karuTop._origIdx  ?? 0) : '—';

  return (
    <div className="rk-summary-row">
      {/* KAROM winner */}
      <div className="rk-summary-card rk-card-karom">
        <div className="rk-summary-tag">
          <Crown size={14} />
          Rekomendasi KAROM {effectiveRomb ? `(Rombongan ${effectiveRomb})` : ''}
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
        <div className="rk-summary-sub">
          {effectiveRomb ? `Peringkat #1 di Rombongan ${effectiveRomb} · 6 Kriteria` : 'Ketua Rombongan · 6 Kriteria C1–C6'}
        </div>
      </div>

      {/* KARU winner */}
      <div className="rk-summary-card rk-card-karu">
        <div className="rk-summary-tag">
          <Star size={14} />
          Rekomendasi KARU {effectiveRegu ? `(Regu ${effectiveRegu})` : ''}
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
        <div className="rk-summary-sub">
          {effectiveRegu ? `Peringkat #1 di Regu ${effectiveRegu} · 4 Kriteria` : 'Ketua Regu · 4 Kriteria C1–C4'}
        </div>
      </div>

      {/* Total */}
      <div className="rk-summary-card rk-card-total">
        <div className="rk-summary-tag">
          <Users size={14} />
          Total Anggota
        </div>
        <div className="rk-summary-big-num">{total}</div>
        <div className="rk-summary-sub">
          {model === 'karom'
            ? `Jemaah dalam Rombongan ${effectiveRomb || ''} · Skala KAROM`
            : `Jemaah dalam Regu ${effectiveRegu || ''} · Skala KARU`}
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
  rombList, selectedRomb, setSelectedRomb,
  ascending, setAscending,
  limitN, setLimitN,
}) {
  const [showLimit, setShowLimit] = useState(false);
  const LIMIT_OPTS = [5, 10, 15, 20, 50, 999];

  return (
    <div className="rk-toolbar">
      {/* Left: mode toggle + rombongan/regu selector */}
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

        {/* Filter Rombongan untuk KAROM */}
        {model === 'karom' && rombList?.length > 0 && (
          <div className="rk-regu-wrap">
            <label className="rk-regu-label">Rombongan:</label>
            <select
              id="rk-romb-select"
              className="rk-regu-select"
              value={selectedRomb || rombList[0]}
              onChange={e => setSelectedRomb(Number(e.target.value))}
            >
              {rombList.map(r => (
                <option key={r} value={r}>Rombongan {r}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filter Regu untuk KARU */}
        {model === 'karu' && reguList?.length > 0 && (
          <div className="rk-regu-wrap">
            <label className="rk-regu-label">Regu:</label>
            <select
              id="rk-regu-select"
              className="rk-regu-select"
              value={selectedRegu || reguList[0]}
              onChange={e => setSelectedRegu(Number(e.target.value))}
            >
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
                    <span className={`ahp-code-badge ${BADGE_COLORS[c] || 'ahp-badge-c7'}`}>{c}</span>
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
                    {(row.rombongan != null || row.regu != null) && (
                      <div className="rk-group-tags">
                        {row.rombongan != null && <span className="rk-group-tag romb">Romb. {row.rombongan}</span>}
                        {row.regu != null && <span className="rk-group-tag regu">Regu {row.regu}</span>}
                      </div>
                    )}
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
                  <span className={`ahp-code-badge ${BADGE_COLORS[c] || 'ahp-badge-c7'}`}>{c}</span>
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
  const [selectedRomb, setSelectedRomb] = useState(0);        // 0 = all rombongan

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

  /* ── Regu list for KARU filter (actual data: 17–35) ── */
  const reguList = useMemo(() => {
    const list = pmDataKaru?.jamaah_results || [];
    const regs = new Set();
    list.forEach(r => { if (r.regu != null) regs.add(r.regu); });
    return [...regs].sort((a, b) => a - b);
  }, [pmDataKaru]);

  /* ── Rombongan list for KAROM filter (actual data: 5–9) ── */
  const rombList = useMemo(() => {
    const list = pmData?.jamaah_results || [];
    const rombs = new Set();
    list.forEach(r => { if (r.rombongan != null) rombs.add(r.rombongan); });
    return [...rombs].sort((a, b) => a - b);
  }, [pmData]);

  // Set default selection when lists become available
  useEffect(() => {
    if (rombList.length > 0 && (!selectedRomb || !rombList.includes(selectedRomb))) {
      setSelectedRomb(rombList[0]);
    }
  }, [rombList, selectedRomb]);

  useEffect(() => {
    if (reguList.length > 0 && (!selectedRegu || !reguList.includes(selectedRegu))) {
      setSelectedRegu(reguList[0]);
    }
  }, [reguList, selectedRegu]);

  const effectiveRomb = selectedRomb || (rombList[0] ?? 0);
  const effectiveRegu = selectedRegu || (reguList[0] ?? 0);

  /* ── Filter + sort rows ── */
  let rows = [...(activePm?.jamaah_results || [])];

  if (model === 'karom') {
    if (effectiveRomb > 0) {
      rows = rows.filter(r => r.rombongan === effectiveRomb);
    }
    // Re-rank within selected rombongan
    rows.sort((a, b) => b.nilai_akhir - a.nilai_akhir);
    rows = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  } else {
    // model === 'karu'
    if (effectiveRegu > 0) {
      rows = rows.filter(r => r.regu === effectiveRegu);
    }
    // Re-rank within selected regu
    rows.sort((a, b) => b.nilai_akhir - a.nilai_akhir);
    rows = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  if (ascending) rows = [...rows].sort((a, b) => a.nilai_akhir - b.nilai_akhir);
  if (limitN < 999) rows = rows.slice(0, limitN);

  /* ── Summary data ── */
  const karomCandidates = (pmData?.jamaah_results || []).filter(r => r.rombongan === effectiveRomb);
  const karomTop = [...karomCandidates].sort((a, b) => b.nilai_akhir - a.nilai_akhir)[0] || pmData?.jamaah_results?.[0];

  const karuCandidates = (pmDataKaru?.jamaah_results || []).filter(r => r.regu === effectiveRegu);
  const karuTop = [...karuCandidates].sort((a, b) => b.nilai_akhir - a.nilai_akhir)[0] || pmDataKaru?.jamaah_results?.[0];

  const total = rows.length;

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
            effectiveRomb={effectiveRomb}
            effectiveRegu={effectiveRegu}
          />

          {/* Toolbar */}
          <Toolbar
            model={model} setModel={setModel}
            reguList={reguList}
            selectedRegu={selectedRegu || reguList[0] || 0} setSelectedRegu={setSelectedRegu}
            rombList={rombList}
            selectedRomb={selectedRomb || rombList[0] || 0} setSelectedRomb={setSelectedRomb}
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
