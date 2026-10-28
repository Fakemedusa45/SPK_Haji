import { useState, useEffect, useCallback } from 'react';
import {
  GitCompare, Search, RefreshCw, AlertCircle, CheckCircle2,
  Pencil, X, ChevronDown, Info, Target, Users,
} from 'lucide-react';
import { fetchPm, computePm } from '../services/api';

/* ============================================================
   CONSTANTS
   ============================================================ */

// Gap → Bobot Nilai lookup (Tabel 2.2 thesis)
const GAP_BOBOT_REF = [
  { gap: 0,  bobot: 5.0, keterangan: 'Tidak ada gap (sesuai target)' },
  { gap: 1,  bobot: 4.5, keterangan: 'Kelebihan 1 tingkat' },
  { gap: -1, bobot: 4.0, keterangan: 'Kekurangan 1 tingkat' },
  { gap: 2,  bobot: 3.5, keterangan: 'Kelebihan 2 tingkat' },
  { gap: -2, bobot: 3.0, keterangan: 'Kekurangan 2 tingkat' },
  { gap: 3,  bobot: 2.5, keterangan: 'Kelebihan 3 tingkat' },
  { gap: -3, bobot: 2.0, keterangan: 'Kekurangan 3 tingkat' },
  { gap: 4,  bobot: 1.5, keterangan: 'Kelebihan 4 tingkat' },
  { gap: -4, bobot: 1.0, keterangan: 'Kekurangan 4 tingkat' },
];

const GAP_COLOR = {
  0: 'pm-gap-zero', 1: 'pm-gap-pos', 2: 'pm-gap-pos',
  3: 'pm-gap-pos', 4: 'pm-gap-pos',
  '-1': 'pm-gap-neg', '-2': 'pm-gap-neg', '-3': 'pm-gap-neg', '-4': 'pm-gap-neg',
};

const BADGE_COLORS = {
  C1: 'ahp-badge-c1', C2: 'ahp-badge-c2', C3: 'ahp-badge-c3',
  C4: 'ahp-badge-c4', C5: 'ahp-badge-c5', C6: 'ahp-badge-c6',
};

const f4 = n => (typeof n === 'number' ? n.toFixed(4) : '—');
const f6 = n => (typeof n === 'number' ? n.toFixed(6) : '—');

/* ============================================================
   EDIT TARGET MODAL
   ============================================================ */
function EditTargetModal({ codes, labels, target, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...target });

  return (
    <div className="pm-modal-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={e => e.stopPropagation()}>
        <div className="pm-modal-header">
          <h3 className="pm-modal-title">
            <Target size={16} /> Edit Nilai Target (Profil Ideal)
          </h3>
          <button className="pm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="pm-modal-desc">
          Nilai target ideal dari penilaian pakar (Lampiran 3). Default semua = 5.
        </p>
        <div className="pm-modal-fields">
          {codes.map((c, i) => (
            <div key={c} className="pm-modal-field-row">
              <label className="pm-modal-label">
                <span className={`ahp-code-badge ${BADGE_COLORS[c] || 'ahp-badge-c1'}`}>{c}</span>
                {labels[i]}
              </label>
              <select
                className="pm-modal-select"
                value={draft[c]}
                onChange={e => setDraft(prev => ({ ...prev, [c]: Number(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="pm-modal-footer">
          <button className="pm-modal-cancel" onClick={onClose}>Batal</button>
          <button className="pm-modal-save" onClick={() => onSave(draft)}>
            <CheckCircle2 size={14} /> Simpan Target
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CARD 1 — Pemetaan Gap
   ============================================================ */
function GapCard({ jamaah, codes, labels, target, ahpWeights, onEditTarget }) {
  if (!jamaah) return null;
  const { skala, gap, bobot_gap } = jamaah;

  return (
    <div className="pm-card">
      <div className="pm-card-header">
        <div className="pm-card-title-wrap">
          <div className="pm-card-icon indigo"><GitCompare size={16} /></div>
          <div>
            <h3 className="pm-card-title">Pemetaan Gap (Kesenjangan)</h3>
            <p className="pm-card-sub">
              Gap = Nilai Aktual − Nilai Target &nbsp;·&nbsp; Persamaan 2.5
            </p>
          </div>
        </div>
        <button className="pm-btn-edit-target" onClick={onEditTarget}>
          <Pencil size={13} /> Edit Target
        </button>
      </div>

      <div className="pm-table-wrap">
        <table className="pm-table">
          <thead>
            <tr>
              <th className="pm-th pm-th-label">Kriteria</th>
              <th className="pm-th pm-th-center">Nilai Target (Ideal)</th>
              <th className="pm-th pm-th-center">Nilai Aktual</th>
              <th className="pm-th pm-th-center">Gap</th>
              <th className="pm-th pm-th-center">Bobot Gap</th>
              <th className="pm-th pm-th-right">Bobot Prioritas AHP (Wⱼ)</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c, i) => {
              const g = gap[c];
              const gStr = String(g);
              return (
                <tr key={c} className="pm-tr">
                  <td className="pm-td pm-td-label">
                    <span className={`ahp-code-badge ${BADGE_COLORS[c] || 'ahp-badge-c1'}`}>{c}</span>
                    <span className="pm-td-name">{labels[i]}</span>
                  </td>
                  <td className="pm-td pm-td-center">
                    <span className="pm-target-chip">{target[c]}</span>
                  </td>
                  <td className="pm-td pm-td-center">
                    <span className={`pm-skala-chip pm-skala-${skala[c]}`}>{skala[c]}</span>
                  </td>
                  <td className="pm-td pm-td-center">
                    <span className={`pm-gap-chip ${GAP_COLOR[gStr] ?? 'pm-gap-zero'}`}>
                      {g > 0 ? `+${g}` : g}
                    </span>
                  </td>
                  <td className="pm-td pm-td-center">
                    <strong className="pm-bobot-val">{bobot_gap[c]?.toFixed(1)}</strong>
                  </td>
                  <td className="pm-td pm-td-right">
                    <span className="pm-weight-val">{f4(ahpWeights[c])}</span>
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
   CARD 2 — Konversi Gap ke Bobot Nilai
   ============================================================ */
function KonversiCard({ jamaah, codes, labels, gap_bobot_table }) {
  return (
    <div className="pm-card">
      <div className="pm-card-header">
        <div className="pm-card-title-wrap">
          <div className="pm-card-icon amber"><Info size={16} /></div>
          <div>
            <h3 className="pm-card-title">Tabel Konversi Gap ke Bobot Nilai</h3>
            <p className="pm-card-sub">Tabel 2.2 — Standar konversi Gap → Bobot Nilai Profile Matching</p>
          </div>
        </div>
      </div>

      <div className="pm-konversi-grid">
        {/* Reference table left */}
        <div className="pm-konversi-ref">
          <h4 className="pm-konversi-ref-title">Tabel Referensi Gap</h4>
          <table className="pm-ref-table">
            <thead>
              <tr>
                <th className="pm-ref-th">Nilai Gap</th>
                <th className="pm-ref-th">Bobot Nilai</th>
                <th className="pm-ref-th">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {GAP_BOBOT_REF.map(row => (
                <tr key={row.gap} className={`pm-ref-tr ${row.gap === 0 ? 'pm-ref-highlight' : ''}`}>
                  <td className="pm-ref-td pm-ref-td-gap">
                    <span className={`pm-gap-chip ${GAP_COLOR[String(row.gap)] ?? 'pm-gap-zero'}`}>
                      {row.gap > 0 ? `+${row.gap}` : row.gap}
                    </span>
                  </td>
                  <td className="pm-ref-td pm-ref-td-bobot">
                    <strong>{row.bobot.toFixed(1)}</strong>
                  </td>
                  <td className="pm-ref-td pm-ref-td-ket">{row.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected jamaah result right */}
        {jamaah && (
          <div className="pm-konversi-result">
            <h4 className="pm-konversi-ref-title">
              Hasil Konversi: <span className="pm-jamaah-name">{jamaah.nama}</span>
            </h4>
            <table className="pm-ref-table">
              <thead>
                <tr>
                  <th className="pm-ref-th">Kriteria</th>
                  <th className="pm-ref-th">Gap</th>
                  <th className="pm-ref-th">Bobot Nilai Gap</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c, i) => {
                  const g = jamaah.gap[c];
                  const bg = jamaah.bobot_gap[c];
                  return (
                    <tr key={c} className="pm-ref-tr">
                      <td className="pm-ref-td">
                        <span className={`ahp-code-badge ${BADGE_COLORS[c] || 'ahp-badge-c1'}`}>{c}</span>
                        <span className="pm-ref-label-name">{labels[i]}</span>
                      </td>
                      <td className="pm-ref-td pm-ref-td-gap">
                        <span className={`pm-gap-chip ${GAP_COLOR[String(g)] ?? 'pm-gap-zero'}`}>
                          {g > 0 ? `+${g}` : g}
                        </span>
                      </td>
                      <td className="pm-ref-td pm-ref-td-bobot"><strong>{bg?.toFixed(1)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CARD 3 — Nilai Final
   ============================================================ */
function NilaiFinalCard({ jamaah, codes, labels, ahpWeights }) {
  if (!jamaah) return null;
  const { bobot_gap, skor_terbobot, nilai_akhir } = jamaah;

  return (
    <div className="pm-card pm-card-final">
      <div className="pm-card-header">
        <div className="pm-card-title-wrap">
          <div className="pm-card-icon emerald"><CheckCircle2 size={16} /></div>
          <div>
            <h3 className="pm-card-title">Kalkulasi Nilai Akhir (Nilai Final)</h3>
            <p className="pm-card-sub">
              Nᵢ = Σ (Wⱼ × Bobot Gap ᵢⱼ) &nbsp;·&nbsp; Persamaan 2.6 &nbsp;·&nbsp;
              <em>Core Factor & Secondary Factor dieliminasi — bobot AHP digunakan langsung</em>
            </p>
          </div>
        </div>
        <div className="pm-final-score-chip">
          Nilai Akhir = <strong>{f4(nilai_akhir)}</strong>
        </div>
      </div>

      <div className="pm-table-wrap">
        <table className="pm-table">
          <thead>
            <tr>
              <th className="pm-th pm-th-label">Kriteria</th>
              <th className="pm-th pm-th-center">Bobot Gap</th>
              <th className="pm-th pm-th-center">Bobot Prioritas AHP (Wⱼ)</th>
              <th className="pm-th pm-th-center pm-th-formula">Rumus</th>
              <th className="pm-th pm-th-right">Skor Terbobot (Wⱼ × Bobot Gap)</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c, i) => {
              const bg  = bobot_gap[c];
              const wj  = ahpWeights[c];
              const st  = skor_terbobot[c];
              return (
                <tr key={c} className="pm-tr">
                  <td className="pm-td pm-td-label">
                    <span className={`ahp-code-badge ${BADGE_COLORS[c] || 'ahp-badge-c1'}`}>{c}</span>
                    <span className="pm-td-name">{labels[i]}</span>
                  </td>
                  <td className="pm-td pm-td-center"><strong className="pm-bobot-val">{bg?.toFixed(1)}</strong></td>
                  <td className="pm-td pm-td-center"><span className="pm-weight-val">{f4(wj)}</span></td>
                  <td className="pm-td pm-td-center pm-td-formula">
                    <span className="pm-formula">
                      {f4(wj)} × {bg?.toFixed(1)}
                    </span>
                  </td>
                  <td className="pm-td pm-td-right">
                    <span className="pm-skor-chip">{f6(st)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="pm-tr-total">
              <td className="pm-td pm-td-label" colSpan={4}>
                <strong>Nᵢ = Σ (Wⱼ × Bobot Gapᵢⱼ)</strong>
              </td>
              <td className="pm-td pm-td-right pm-td-nilai-akhir">
                <strong>{f4(nilai_akhir)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   JAMAAH SELECTOR
   ============================================================ */
function JamaahSelector({ jamaahList, selected, onSelect }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');

  const filtered = jamaahList.filter(j =>
    j.nama.toLowerCase().includes(query.toLowerCase()) ||
    j.no_porsi.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="pm-card pm-selector-card">
      <div className="pm-selector-header">
        <div className="pm-card-title-wrap">
          <div className="pm-card-icon violet"><Users size={16} /></div>
          <div>
            <h3 className="pm-card-title">Pilih Data Jemaah</h3>
            <p className="pm-card-sub">Pilih satu jemaah untuk melihat detail perhitungan step-by-step</p>
          </div>
        </div>
      </div>
      <div className="pm-selector-body">
        <div className="pm-dropdown-wrap">
          <button
            className="pm-dropdown-trigger"
            onClick={() => setOpen(o => !o)}
          >
            <span>
              {selected
                ? `${selected.no_porsi} — ${selected.nama}`
                : 'Pilih Jemaah…'}
            </span>
            <ChevronDown size={16} className={open ? 'pm-chevron-up' : ''} />
          </button>

          {open && (
            <div className="pm-dropdown-panel">
              <div className="pm-dropdown-search">
                <Search size={14} />
                <input
                  autoFocus
                  placeholder="Cari nama atau no. porsi…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="pm-dropdown-input"
                />
              </div>
              <ul className="pm-dropdown-list">
                {filtered.length === 0 && (
                  <li className="pm-dropdown-empty">Tidak ada hasil</li>
                )}
                {filtered.map(j => (
                  <li
                    key={j.no_porsi}
                    className={`pm-dropdown-item ${selected?.no_porsi === j.no_porsi ? 'active' : ''}`}
                    onClick={() => { onSelect(j); setOpen(false); setQuery(''); }}
                  >
                    <span className="pm-dd-kode">
                      A{String(jamaahList.indexOf(j) + 1).padStart(3, '0')}
                    </span>
                    <span className="pm-dd-name">{j.nama}</span>
                    <span className="pm-dd-porsi">{j.no_porsi}</span>
                    <span className={`pm-dd-score ${j.nilai_akhir >= 4 ? 'high' : j.nilai_akhir >= 3 ? 'mid' : 'low'}`}>
                      {f4(j.nilai_akhir)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {selected && (
          <div className="pm-selected-info">
            <div className="pm-selected-pills">
              <span className="pm-selected-pill rank">Rank #{selected.rank}</span>
              <span className="pm-selected-pill score">Nilai Akhir: <strong>{f4(selected.nilai_akhir)}</strong></span>
              <span className="pm-selected-pill porsi">{selected.no_porsi}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyState() {
  return (
    <div className="pm-empty">
      <div className="pm-empty-icon"><Users size={40} /></div>
      <h3 className="pm-empty-title">Belum Ada Data Jemaah</h3>
      <p className="pm-empty-sub">
        Tambahkan data jemaah di halaman <strong>Data Master</strong> untuk memulai perhitungan Profile Matching.
      </p>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function ProfileMatchingPage() {
  const [model,       setModel]       = useState('karom');
  const [pmData,      setPmData]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [target,      setTarget]      = useState({});
  const [showEditTarget, setShowEditTarget] = useState(false);

  /* ── Load PM data ── */
  const load = useCallback(async (mdl, tgt = null) => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (tgt) {
        data = await computePm({ model: mdl, target: tgt });
      } else {
        data = await fetchPm(mdl);
      }
      setPmData(data);
      setTarget(data.target);
      // Auto-select first jamaah
      if (data.jamaah_results?.length > 0) {
        setSelected(data.jamaah_results[0]);
      } else {
        setSelected(null);
      }
    } catch (err) {
      setError('Gagal memuat data. Pastikan backend berjalan dan data jemaah tersedia.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Switch model ── */
  useEffect(() => {
    setSelected(null);
    load(model);
  }, [model, load]);

  /* ── Save custom target ── */
  async function handleSaveTarget(newTarget) {
    setShowEditTarget(false);
    setTarget(newTarget);
    await load(model, newTarget);
    // Re-select same jamaah if still in list
    if (selected && pmData) {
      // Will be re-set by load()
    }
  }

  /* ── Re-select selected jamaah after reload ── */
  useEffect(() => {
    if (!pmData || !selected) return;
    const refreshed = pmData.jamaah_results.find(j => j.no_porsi === selected.no_porsi);
    if (refreshed) setSelected(refreshed);
  }, [pmData]);

  const codes      = pmData?.codes  || [];
  const labels     = pmData?.labels || [];
  const weights    = pmData?.ahp_weights || {};
  const jamaahList = pmData?.jamaah_results || [];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="pm-page-head">
        <div className="pm-head-left">
          <div className="pm-head-icon"><GitCompare size={22} /></div>
          <div>
            <h1 className="pm-head-title">Visualisasi Profile Matching</h1>
            <p className="pm-head-sub">
              Perhitungan kesenjangan (gap) kriteria jemaah terhadap profil ideal · Ni = Σ(Wj × Bobot Gap)
            </p>
          </div>
        </div>

        {/* Model Toggle */}
        <div className="ahp-model-toggle">
          <button
            id="pm-toggle-karom"
            className={`ahp-toggle-btn ${model === 'karom' ? 'active' : ''}`}
            onClick={() => setModel('karom')}
          >
            Seleksi KAROM
            <span className="ahp-toggle-sub">6 Kriteria: C1–C6</span>
          </button>
          <button
            id="pm-toggle-karu"
            className={`ahp-toggle-btn ${model === 'karu' ? 'active' : ''}`}
            onClick={() => setModel('karu')}
          >
            Seleksi KARU
            <span className="ahp-toggle-sub">4 Kriteria: C1–C4</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="ahp-error-banner" style={{ marginBottom: '20px' }}>
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="ahp-loading">
          <div className="loading-spinner" />
          <span className="loading-text">Menghitung Profile Matching…</span>
        </div>
      )}

      {!loading && pmData && (
        <>
          {/* Empty state */}
          {jamaahList.length === 0 ? <EmptyState /> : (
            <div className="pm-sections">

              {/* Jamaah Selector */}
              <JamaahSelector
                jamaahList={jamaahList}
                selected={selected}
                onSelect={setSelected}
              />

              {/* Card 1 — Gap */}
              <GapCard
                jamaah={selected}
                codes={codes}
                labels={labels}
                target={target}
                ahpWeights={weights}
                onEditTarget={() => setShowEditTarget(true)}
              />

              {/* Card 2 — Konversi Gap */}
              <KonversiCard
                jamaah={selected}
                codes={codes}
                labels={labels}
                gap_bobot_table={pmData.gap_bobot_table}
              />

              {/* Card 3 — Nilai Final */}
              <NilaiFinalCard
                jamaah={selected}
                codes={codes}
                labels={labels}
                ahpWeights={weights}
              />
            </div>
          )}
        </>
      )}

      {/* Edit Target Modal */}
      {showEditTarget && pmData && (
        <EditTargetModal
          codes={codes}
          labels={labels}
          target={target}
          onSave={handleSaveTarget}
          onClose={() => setShowEditTarget(false)}
        />
      )}
    </div>
  );
}
