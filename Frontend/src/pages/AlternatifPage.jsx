import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, Upload, Plus, Pencil, Trash2, X, AlertCircle,
  CheckCircle2, FileSpreadsheet, Database, Users, RefreshCw,
  ChevronLeft, ChevronRight, Eye, EyeOff, Filter, Info,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  fetchJamaahKonversi,
  createJamaah, updateJamaah, deleteJamaah,
  uploadJamaahExcel, deleteAllJamaah,
  fetchKriteria,
} from '../services/api';

/* ============================================================
   CONSTANTS
   ============================================================ */

const PAGE_SIZE = 15;

function toKode(idx) {
  return `A${String(idx + 1).padStart(3, '0')}`;
}

const SKOR_COLOR = {
  5: 'skl-5', 4: 'skl-4', 3: 'skl-3', 2: 'skl-2', 1: 'skl-1',
};

const KELAMIN_OPTS  = ['L', 'P'];
const RISTI_OPTS    = ['Tidak Risti', 'Risti Ringan', 'Risti Sedang', 'Risti Berat'];
const STATUS_OPTS   = ['Belum', 'Sudah'];
const PEND_OPTS     = ['S1', 'S2', 'S3', 'D1 / D2 / D3 / SM', 'SLTA', 'SLTP', 'SD', 'Tidak Tamat SD'];
const PEK_OPTS      = [
  'Pegawai Negri Sipil', 'TNI / Polri', 'BUMN / BUMD', 'Guru', 'Dosen',
  'Swasta', 'Dagang', 'Wiraswasta', 'Tani / Nelayan', 'Pensiunan',
  'Ibu Rumah Tangga', 'Pelajar / Mahasiswa', 'Lainnya',
];

function statusAktualBadge(status) {
  if (!status) return null;
  if (status === '4-KAROM') return <span className="dm-aktual-badge karom">KAROM</span>;
  if (status === '5-KARU')  return <span className="dm-aktual-badge karu">KARU</span>;
  return <span className="dm-aktual-badge jamaah">Jamaah</span>;
}

/* ============================================================
   TOAST
   ============================================================ */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`dm-toast dm-toast-${type}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{message}</span>
      <button className="dm-toast-close" onClick={onClose}><X size={14} /></button>
    </div>
  );
}

/* ============================================================
   CONFIRM DELETE MODAL
   ============================================================ */
function ConfirmModal({ title, message, onConfirm, onClose, loading }) {
  return (
    <div className="dm-modal-backdrop" onClick={onClose}>
      <div className="dm-modal dm-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="dm-modal-header">
          <h3>{title}</h3>
          <button className="dm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="dm-modal-body">
          <div className="dm-confirm-icon"><Trash2 size={26} /></div>
          <p className="dm-confirm-msg">{message}</p>
          <div className="dm-modal-footer">
            <button className="dm-btn dm-btn-ghost" onClick={onClose}>Batal</button>
            <button className="dm-btn dm-btn-danger" onClick={onConfirm} disabled={loading}>
              {loading ? 'Menghapus…' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   UPLOAD RESULT MODAL — with Preprocessing Summary
   ============================================================ */
function UploadResultModal({ result, onClose }) {
  const pre = result.preprocessing_summary || {};

  return (
    <div className="dm-modal-backdrop" onClick={onClose}>
      <div className="dm-modal dm-modal-md" onClick={e => e.stopPropagation()}>
        <div className="dm-modal-header">
          <h3>Hasil Upload & Praproses Data</h3>
          <button className="dm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="dm-modal-body">

          {/* Preprocessing Pipeline */}
          {pre.total_baris_mentah != null && (
            <div className="dm-preprocess-banner">
              <div className="dm-preprocess-title">
                <Info size={14} /> Ringkasan Praproses (Data Cleaning)
              </div>
              <div className="dm-preprocess-steps">
                <div className="dm-pre-step">
                  <span className="dm-pre-num">{pre.total_baris_mentah}</span>
                  <span className="dm-pre-label">Baris Data Mentah</span>
                </div>
                <span className="dm-pre-arrow">→</span>
                <div className="dm-pre-step warn">
                  <span className="dm-pre-num">{pre.data_tidak_lengkap_dibuang}</span>
                  <span className="dm-pre-label">Data Tidak Lengkap Dibuang</span>
                </div>
                {pre.data_duplikat_dilewati > 0 && (
                  <>
                    <span className="dm-pre-arrow">→</span>
                    <div className="dm-pre-step warn">
                      <span className="dm-pre-num">{pre.data_duplikat_dilewati}</span>
                      <span className="dm-pre-label">Duplikat Dilewati</span>
                    </div>
                  </>
                )}
                <span className="dm-pre-arrow">→</span>
                <div className="dm-pre-step ok">
                  <span className="dm-pre-num">{pre.data_bersih_siap_hitung}</span>
                  <span className="dm-pre-label">Data Bersih Siap Hitung</span>
                </div>
              </div>
            </div>
          )}

          {/* Import Results */}
          <div className="dm-upload-result">
            <div className="dm-result-row success">
              <CheckCircle2 size={18} />
              <span><strong>{result.imported}</strong> data berhasil diimpor</span>
            </div>
            {(result.skipped_incomplete > 0) && (
              <div className="dm-result-row warn">
                <AlertCircle size={18} />
                <span><strong>{result.skipped_incomplete}</strong> baris dibuang (data tidak lengkap / #N/A)</span>
              </div>
            )}
            {(result.skipped_duplicate > 0 || result.skipped > 0) && (
              <div className="dm-result-row warn">
                <AlertCircle size={18} />
                <span><strong>{result.skipped_duplicate ?? result.skipped}</strong> baris dilewati (duplikat)</span>
              </div>
            )}
          </div>

          {result.errors?.length > 0 && (
            <div className="dm-result-errors">
              <p>Error pada baris:</p>
              <ul>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          <div className="dm-modal-footer">
            <button className="dm-btn dm-btn-primary" onClick={onClose}>Selesai</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADD / EDIT JAMAAH MODAL
   ============================================================ */
const EMPTY_FORM = {
  no_porsi: '', nama: '', jenis_kelamin: 'L',
  tanggal_lahir: '', kesehatan: 'Tidak Risti',
  pekerjaan: 'Pegawai Negri Sipil', pendidikan: 'S1', status_haji: 'Belum',
  rombongan: '', regu: '', status_aktual: '0-Jamaah',
};

function JamaahModal({ initial, extraCriteria = [], onSave, onClose, loading }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    initial
      ? { ...EMPTY_FORM, ...initial, tanggal_lahir: initial.tanggal_lahir || '' }
      : { ...EMPTY_FORM }
  );

  let initialExtra = {};
  try {
    initialExtra = typeof initial?.nilai_tambahan === 'string'
      ? JSON.parse(initial.nilai_tambahan)
      : (initial?.nilai_tambahan || {});
  } catch { initialExtra = {}; }

  const [extraVals, setExtraVals] = useState(initialExtra);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...form,
      rombongan: form.rombongan ? parseInt(form.rombongan) : null,
      regu: form.regu ? parseInt(form.regu) : null,
      nilai_tambahan: JSON.stringify(extraVals),
    });
  }

  return (
    <div className="dm-modal-backdrop" onClick={onClose}>
      <div className="dm-modal dm-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="dm-modal-header">
          <h3>{isEdit ? 'Edit Data Jemaah' : 'Tambah Data Jemaah'}</h3>
          <button className="dm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="dm-modal-body">
          {/* Row 1 */}
          <div className="dm-form-row">
            <div className="dm-form-group">
              <label>No. Porsi <span className="req">*</span></label>
              <input className="dm-input" value={form.no_porsi} onChange={e => set('no_porsi', e.target.value)} placeholder="2000063951" required disabled={isEdit} />
            </div>
            <div className="dm-form-group" style={{ flex: 2 }}>
              <label>Nama Lengkap <span className="req">*</span></label>
              <input className="dm-input" value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="NANI MUHAMMAD BASAR" required />
            </div>
          </div>

          {/* Row 2 */}
          <div className="dm-form-row">
            <div className="dm-form-group">
              <label>Tanggal Lahir <span className="req">*</span></label>
              <input className="dm-input" type="date" value={form.tanggal_lahir} onChange={e => set('tanggal_lahir', e.target.value)} required />
            </div>
            <div className="dm-form-group">
              <label>Jenis Kelamin <span className="req">*</span></label>
              <select className="dm-input" value={form.jenis_kelamin} onChange={e => set('jenis_kelamin', e.target.value)}>
                {KELAMIN_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3 */}
          <div className="dm-form-row">
            <div className="dm-form-group">
              <label>Status Risti (Kesehatan) <span className="req">*</span></label>
              <select className="dm-input" value={form.kesehatan} onChange={e => set('kesehatan', e.target.value)}>
                {RISTI_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="dm-form-group">
              <label>Status Haji <span className="req">*</span></label>
              <select className="dm-input" value={form.status_haji} onChange={e => set('status_haji', e.target.value)}>
                {STATUS_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Row 4 */}
          <div className="dm-form-row">
            <div className="dm-form-group">
              <label>Pekerjaan <span className="req">*</span></label>
              <select className="dm-input" value={form.pekerjaan} onChange={e => set('pekerjaan', e.target.value)}>
                {PEK_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="dm-form-group">
              <label>Pendidikan <span className="req">*</span></label>
              <select className="dm-input" value={form.pendidikan} onChange={e => set('pendidikan', e.target.value)}>
                {PEND_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Row 5: Rombongan / Regu */}
          <div className="dm-form-row">
            <div className="dm-form-group">
              <label>Rombongan</label>
              <input className="dm-input" type="number" value={form.rombongan} onChange={e => set('rombongan', e.target.value)} placeholder="5" min="1" max="99" />
            </div>
            <div className="dm-form-group">
              <label>Regu</label>
              <input className="dm-input" type="number" value={form.regu} onChange={e => set('regu', e.target.value)} placeholder="17" min="1" max="99" />
            </div>
            <div className="dm-form-group">
              <label>Status Aktual</label>
              <select className="dm-input" value={form.status_aktual} onChange={e => set('status_aktual', e.target.value)}>
                <option value="0-Jamaah">Jamaah</option>
                <option value="5-KARU">KARU</option>
                <option value="4-KAROM">KAROM</option>
              </select>
            </div>
          </div>

          {/* Row 6: Kriteria Tambahan Dinamis (C7+) */}
          {extraCriteria.length > 0 && (
            <div className="dm-extra-section" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: '12px', fontWeight: 700, color: 'var(--color-indigo-600)' }}>
                <Info size={14} />
                <span>Kriteria Tambahan (Disesuaikan dari Data Kriteria)</span>
              </div>
              <div className="dm-form-row" style={{ flexWrap: 'wrap' }}>
                {extraCriteria.map(kr => (
                  <div key={kr.kode} className="dm-form-group" style={{ minWidth: '200px' }}>
                    <label>{kr.nama} <span className="th-c">{kr.kode}</span></label>
                    {kr.sub_kriterias && kr.sub_kriterias.length > 0 ? (
                      <select
                        className="dm-input"
                        value={extraVals[kr.kode] ?? kr.sub_kriterias[0]?.skor ?? 3}
                        onChange={e => setExtraVals(prev => ({ ...prev, [kr.kode]: Number(e.target.value) }))}
                      >
                        {kr.sub_kriterias.map(s => (
                          <option key={s.id} value={s.skor}>
                            {s.rentang_nilai} (Skor: {s.skor})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="dm-input"
                        value={extraVals[kr.kode] ?? 3}
                        onChange={e => setExtraVals(prev => ({ ...prev, [kr.kode]: Number(e.target.value) }))}
                      >
                        <option value={5}>5 - Sangat Baik / Sangat Sesuai</option>
                        <option value={4}>4 - Baik / Sesuai</option>
                        <option value={3}>3 - Cukup</option>
                        <option value={2}>2 - Kurang</option>
                        <option value={1}>1 - Sangat Kurang</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dm-modal-footer">
            <button type="button" className="dm-btn dm-btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="dm-btn dm-btn-primary" disabled={loading}>
              {loading ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah Jemaah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyState({ onUpload, onAdd }) {
  return (
    <div className="dm-empty-state">
      <div className="dm-empty-icon"><Database size={52} strokeWidth={1} /></div>
      <h2 className="dm-empty-title">Belum Ada Data</h2>
      <p className="dm-empty-desc">
        Basis data alternatif jemaah haji masih kosong.<br />
        Upload file Excel SISKOHAT untuk mengimpor data sekaligus, atau tambahkan satu per satu.
      </p>
      <div className="dm-empty-actions">
        <button className="dm-btn dm-btn-primary dm-btn-lg" onClick={onUpload}>
          <Upload size={18} /> Upload Data Excel (SISKOHAT)
        </button>
        <button className="dm-btn dm-btn-ghost dm-btn-lg" onClick={onAdd}>
          <Plus size={18} /> Tambah Manual
        </button>
      </div>
      <div className="dm-empty-hint">
        <FileSpreadsheet size={14} />
        <span>Format: <code>data.xlsx</code> dari SISKOHAT/SISKOHATKES — 265 baris, 13 kolom</span>
      </div>
    </div>
  );
}

/* ============================================================
   SKOR CHIP
   ============================================================ */
function SkorChip({ value }) {
  return <span className={`dm-skor-chip ${SKOR_COLOR[value] || ''}`}>{value}</span>;
}

/* ============================================================
   DATA TABLE
   ============================================================ */
function DataTable({ rows, showSkala, onEdit, onDelete, allData, sortBy, onSort, extraCriteria = [] }) {
  function getSortIcon(colKey) {
    if (sortBy === `${colKey}_asc`) return <ArrowUp size={13} className="dm-sort-icon active" />;
    if (sortBy === `${colKey}_desc`) return <ArrowDown size={13} className="dm-sort-icon active" />;
    return <ArrowUpDown size={12} className="dm-sort-icon dm-sort-idle" />;
  }

  function handleHeaderClick(colKey) {
    if (!onSort) return;
    if (sortBy === `${colKey}_asc`) onSort(`${colKey}_desc`);
    else onSort(`${colKey}_asc`);
  }

  return (
    <div className="dm-table-wrapper">
      <table className="dm-table">
        <thead>
          <tr>
            <th className="dm-th-sortable" onClick={() => handleHeaderClick('kode')} title="Klik untuk mengurutkan kode">
              <div className="dm-th-content">
                <span>Kode</span>
                {getSortIcon('kode')}
              </div>
            </th>
            <th className="dm-th-sortable" onClick={() => handleHeaderClick('nama')} title="Klik untuk mengurutkan nama">
              <div className="dm-th-content">
                <span>Nama Jemaah</span>
                {getSortIcon('nama')}
              </div>
            </th>
            <th className="dm-th-sortable" onClick={() => handleHeaderClick('rombongan')} title="Klik untuk mengurutkan rombongan & regu">
              <div className="dm-th-content">
                <span>Romb. / Regu</span>
                {getSortIcon('rombongan')}
              </div>
            </th>
            <th className="dm-th-sortable" onClick={() => handleHeaderClick('aktual')} title="Klik untuk mengurutkan status aktual">
              <div className="dm-th-content">
                <span>Aktual</span>
                {getSortIcon('aktual')}
              </div>
            </th>
            <th className="dm-th-sortable" onClick={() => handleHeaderClick('usia')} title="Klik untuk mengurutkan usia">
              <div className="dm-th-content">
                <span className="th-criterion">
                  Usia{showSkala ? <span className="th-c">C1</span> : null}
                </span>
                {getSortIcon('usia')}
              </div>
            </th>
            <th>
              <span className="th-criterion">
                Kesehatan{showSkala ? <span className="th-c">C2</span> : null}
              </span>
            </th>
            <th>
              <span className="th-criterion">
                Jns. Kelamin{showSkala ? <span className="th-c">C3</span> : null}
              </span>
            </th>
            <th>
              <span className="th-criterion">
                Pekerjaan{showSkala ? <span className="th-c">C4</span> : null}
              </span>
            </th>
            <th>
              <span className="th-criterion">
                Pendidikan{showSkala ? <span className="th-c">C5</span> : null}
              </span>
            </th>
            <th>
              <span className="th-criterion">
                Status Haji{showSkala ? <span className="th-c">C6</span> : null}
              </span>
            </th>
            {extraCriteria.map(kr => (
              <th key={kr.kode}>
                <span className="th-criterion">
                  {kr.nama}{showSkala ? <span className="th-c">{kr.kode}</span> : null}
                </span>
              </th>
            ))}
            <th style={{ textAlign: 'center' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const stableIdx = allData ? allData.findIndex(d => d.no_porsi === row.no_porsi) : -1;
            const kode = stableIdx >= 0 ? toKode(stableIdx) : '—';
            return (
              <tr key={row.no_porsi}>
                <td>
                  <span className="dm-kode-chip">{kode}</span>
                </td>
                <td className="dm-nama-cell">
                  <span className="dm-nama">{row.nama}</span>
                  <span className="dm-porsi">{row.no_porsi}</span>
                </td>
                <td>
                  <div className="dm-group-cell">
                    {row.rombongan != null && <span className="dm-romb-badge">Romb. {row.rombongan}</span>}
                    {row.regu != null && <span className="dm-regu-badge">Regu {row.regu}</span>}
                  </div>
                </td>
                <td>{statusAktualBadge(row.status_aktual)}</td>

                {/* C1 Usia */}
                <td>
                  {showSkala
                    ? <SkorChip value={row.skala?.C1} />
                    : <span className="dm-raw">{row.usia} th</span>
                  }
                </td>

                {/* C2 Kesehatan */}
                <td>
                  {showSkala
                    ? <SkorChip value={row.skala?.C2} />
                    : <span className="dm-raw dm-raw-sm">{row.kesehatan}</span>
                  }
                </td>

                {/* C3 Jenis Kelamin */}
                <td>
                  {showSkala
                    ? <SkorChip value={row.skala?.C3} />
                    : <span className="dm-raw">{row.jenis_kelamin}</span>
                  }
                </td>

                {/* C4 Pekerjaan */}
                <td>
                  {showSkala
                    ? <SkorChip value={row.skala?.C4} />
                    : <span className="dm-raw dm-raw-sm">{row.pekerjaan}</span>
                  }
                </td>

                {/* C5 Pendidikan */}
                <td>
                  {showSkala
                    ? <SkorChip value={row.skala?.C5} />
                    : <span className="dm-raw">{row.pendidikan}</span>
                  }
                </td>

                {/* C6 Status Haji */}
                <td>
                  {showSkala
                    ? <SkorChip value={row.skala?.C6} />
                    : <span className="dm-raw">{row.status_haji}</span>
                  }
                </td>

                {/* Kriteria Tambahan Dinamis (C7+) */}
                {extraCriteria.map(kr => {
                  let extraMap = {};
                  try {
                    extraMap = typeof row.nilai_tambahan === 'string'
                      ? JSON.parse(row.nilai_tambahan)
                      : (row.nilai_tambahan || {});
                  } catch { extraMap = {}; }
                  const val = row.skala?.[kr.kode] ?? extraMap[kr.kode];
                  return (
                    <td key={kr.kode}>
                      {showSkala
                        ? <SkorChip value={val ?? 3} />
                        : <span className="dm-raw dm-raw-sm">{val != null ? `Skor: ${val}` : '—'}</span>
                      }
                    </td>
                  );
                })}

                <td>
                  <div className="dm-row-actions">
                    <button className="dm-icon-btn edit" onClick={() => onEdit(row)} title="Edit jemaah">
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button className="dm-icon-btn delete" onClick={() => onDelete(row)} title="Hapus jemaah">
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   PAGINATION
   ============================================================ */
function Pagination({ page, totalPages, total, pageSize, onPage }) {
  if (totalPages <= 1 && total <= pageSize) return null;
  const pages = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) pages.push(p);
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);
  return (
    <div className="dm-pagination">
      <span className="dm-pagination-info">
        Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
        <span className="dm-pagination-total"> ({total} Jemaah, menampilkan {from}–{to})</span>
      </span>
      <div className="dm-pagination-btns">
        <button className="dm-page-btn" onClick={() => onPage(page - 1)} disabled={page <= 1}><ChevronLeft size={15} /></button>
        {pages[0] > 1 && (
          <>
            <button className="dm-page-btn" onClick={() => onPage(1)}>1</button>
            {pages[0] > 2 && <span className="dm-page-ellipsis">…</span>}
          </>
        )}
        {pages.map(p => (
          <button key={p} className={`dm-page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>{p}</button>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="dm-page-ellipsis">…</span>}
            <button className="dm-page-btn" onClick={() => onPage(totalPages)}>{totalPages}</button>
          </>
        )}
        <button className="dm-page-btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages}><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

/* ============================================================
   ALTERNATIF PAGE (main export)
   ============================================================ */
export default function AlternatifPage() {
  const [allData, setAllData]           = useState([]);
  const [kriterias, setKriterias]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [mutLoading, setMutLoading]     = useState(false);
  const [showSkala, setShowSkala]       = useState(false);
  const [search, setSearch]             = useState('');
  const [filterRegu, setFilterRegu]     = useState('');
  const [filterRomb, setFilterRomb]     = useState('');
  const [sortBy, setSortBy]             = useState('rombongan_asc');
  const [page, setPage]                 = useState(1);
  const [toast, setToast]               = useState(null);
  const [addEditModal, setAddEditModal] = useState(null);
  const [delModal, setDelModal]         = useState(null);
  const [delAllModal, setDelAllModal]   = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  /* ── Load Data ── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, krData] = await Promise.all([
        fetchJamaahKonversi(),
        fetchKriteria().catch(() => [])
      ]);
      setAllData(data);
      setKriterias(krData || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data jemaah. Pastikan backend berjalan.');
    } finally {
      setLoading(false);
    }
  }, []);

  const extraCriteria = useMemo(() => {
    const base = new Set(['C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
    return (kriterias || []).filter(k => !base.has(k.kode));
  }, [kriterias]);

  useEffect(() => { loadData(); }, [loadData]);

  function showToast(msg, type = 'success') { setToast({ message: msg, type }); }

  /* ── Filtered & sorted data ── */
  const filtered = allData.filter(j => {
    const q = search.toLowerCase();
    const idx = allData.indexOf(j);
    const matchSearch = !q ||
      toKode(idx).toLowerCase().includes(q) ||
      j.nama.toLowerCase().includes(q) ||
      j.no_porsi.includes(q);
    const matchRegu = !filterRegu || String(j.regu) === filterRegu;
    const matchRomb = !filterRomb || String(j.rombongan) === filterRomb;
    return matchSearch && matchRegu && matchRomb;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'rombongan_asc': {
        const rDiff = (a.rombongan ?? 999) - (b.rombongan ?? 999);
        if (rDiff !== 0) return rDiff;
        const gDiff = (a.regu ?? 999) - (b.regu ?? 999);
        if (gDiff !== 0) return gDiff;
        return a.nama.localeCompare(b.nama);
      }
      case 'rombongan_desc': {
        const rDiff = (b.rombongan ?? -1) - (a.rombongan ?? -1);
        if (rDiff !== 0) return rDiff;
        const gDiff = (b.regu ?? -1) - (a.regu ?? -1);
        if (gDiff !== 0) return gDiff;
        return b.nama.localeCompare(a.nama);
      }
      case 'nama_asc':
        return a.nama.localeCompare(b.nama);
      case 'nama_desc':
        return b.nama.localeCompare(a.nama);
      case 'kode_asc':
        return allData.indexOf(a) - allData.indexOf(b);
      case 'kode_desc':
        return allData.indexOf(b) - allData.indexOf(a);
      case 'no_porsi_asc':
        return a.no_porsi.localeCompare(b.no_porsi);
      case 'no_porsi_desc':
        return b.no_porsi.localeCompare(a.no_porsi);
      case 'usia_asc':
        return (a.usia ?? 0) - (b.usia ?? 0);
      case 'usia_desc':
        return (b.usia ?? 0) - (a.usia ?? 0);
      case 'aktual_asc':
        return (a.status_aktual || '').localeCompare(b.status_aktual || '');
      case 'aktual_desc':
        return (b.status_aktual || '').localeCompare(a.status_aktual || '');
      default:
        return 0;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const startIdx   = (safePage - 1) * PAGE_SIZE;
  const pageRows   = sorted.slice(startIdx, startIdx + PAGE_SIZE);

  // Actual unique regu/rombongan from data
  const reguOptions = [...new Set(allData.map(j => j.regu).filter(Boolean))].sort((a, b) => a - b);
  const rombOptions = [...new Set(allData.map(j => j.rombongan).filter(Boolean))].sort((a, b) => a - b);

  function handleSearch(v) { setSearch(v); setPage(1); }
  function handleFilterRegu(v) { setFilterRegu(v); setPage(1); }
  function handleFilterRomb(v) { setFilterRomb(v); setPage(1); }
  function handleSort(v) { setSortBy(v); setPage(1); }

  /* ── Upload Excel ── */
  function triggerUpload() { fileInputRef.current?.click(); }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      setMutLoading(true);
      const result = await uploadJamaahExcel(file);
      setUploadResult(result);
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Gagal mengupload file.';
      showToast(msg, 'error');
    } finally {
      setMutLoading(false);
    }
  }

  /* ── Add/Edit ── */
  async function handleSaveJamaah(payload) {
    try {
      setMutLoading(true);
      if (addEditModal.mode === 'edit') {
        await updateJamaah(payload.no_porsi, payload);
        showToast(`Data ${payload.nama} berhasil diperbarui.`);
      } else {
        await createJamaah(payload);
        showToast(`Data ${payload.nama} berhasil ditambahkan.`);
      }
      setAddEditModal(null);
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Gagal menyimpan data.';
      showToast(msg, 'error');
    } finally {
      setMutLoading(false);
    }
  }

  /* ── Delete single ── */
  async function handleDelete() {
    try {
      setMutLoading(true);
      await deleteJamaah(delModal.no_porsi);
      showToast(`Data ${delModal.nama} dihapus.`);
      setDelModal(null);
      await loadData();
    } catch {
      showToast('Gagal menghapus data.', 'error');
    } finally {
      setMutLoading(false);
    }
  }

  /* ── Delete all ── */
  async function handleDeleteAll() {
    try {
      setMutLoading(true);
      await deleteAllJamaah();
      showToast('Semua data jemaah dihapus.');
      setDelAllModal(false);
      await loadData();
    } catch {
      showToast('Gagal menghapus semua data.', 'error');
    } finally {
      setMutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <span className="loading-text">Memuat data jemaah…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-container">
          <AlertCircle size={32} />
          <p>{error}</p>
          <button className="dm-btn dm-btn-primary" style={{ marginTop: 8 }} onClick={loadData}>Coba Lagi</button>
        </div>
      </div>
    );
  }

  const isEmpty = allData.length === 0;

  return (
    <div className="page-container">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Page Header */}
      <div className="dm-page-header">
        <div className="dm-page-title-block">
          <div className="dm-page-icon"><Users size={20} strokeWidth={2} /></div>
          <div>
            <h1 className="dm-page-title">Data Master</h1>
            <p className="dm-page-subtitle">Basis data operasional calon jemaah haji — Kab. Kutai Kartanegara</p>
          </div>
        </div>
        <div className="dm-header-actions">
          {!isEmpty && (
            <button
              className="dm-btn dm-btn-danger-outline"
              onClick={() => setDelAllModal(true)}
              disabled={mutLoading}
              title="Kosongkan seluruh data alternatif dari database"
            >
              <Trash2 size={15} /> Kosongkan Data
            </button>
          )}
          <button className="dm-btn dm-btn-outline" onClick={triggerUpload} disabled={mutLoading} title="Upload file .xlsx">
            <Upload size={15} />
            {mutLoading ? 'Mengupload…' : 'Upload Excel (SISKOHAT)'}
          </button>
          <button className="dm-btn dm-btn-primary" onClick={() => setAddEditModal({ mode: 'add' })}>
            <Plus size={15} /> Tambah Data
          </button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState onUpload={triggerUpload} onAdd={() => setAddEditModal({ mode: 'add' })} />
      ) : (
        <>
          {/* Stats Bar */}
          <div className="dm-stats-bar">
            <div className="dm-stat">
              <span className="dm-stat-num">{allData.length}</span>
              <span className="dm-stat-lbl">Total Jemaah</span>
            </div>
            <div className="dm-stat-div" />
            <div className="dm-stat">
              <span className="dm-stat-num">{reguOptions.length}</span>
              <span className="dm-stat-lbl">Regu</span>
            </div>
            <div className="dm-stat-div" />
            <div className="dm-stat">
              <span className="dm-stat-num">{rombOptions.length}</span>
              <span className="dm-stat-lbl">Rombongan</span>
            </div>
            <div className="dm-stat-div" />
            <div className="dm-stat">
              <span className="dm-stat-num">{allData.filter(j => j.status_aktual === '4-KAROM').length}</span>
              <span className="dm-stat-lbl">KAROM Aktual</span>
            </div>
            <div className="dm-stat-div" />
            <div className="dm-stat">
              <span className="dm-stat-num">{allData.filter(j => j.status_aktual === '5-KARU').length}</span>
              <span className="dm-stat-lbl">KARU Aktual</span>
            </div>
            <div style={{ flex: 1 }} />

            {/* Toggle: Data Mentah ↔ Skala Konversi */}
            <button
              className={`dm-toggle-btn ${showSkala ? 'active' : ''}`}
              onClick={() => setShowSkala(s => !s)}
              title={showSkala ? 'Tampilkan data mentah' : 'Tampilkan skala konversi (1-5)'}
            >
              {showSkala ? <Eye size={14} /> : <EyeOff size={14} />}
              {showSkala ? 'Skala Konversi (1–5)' : 'Data Mentah (Asli)'}
            </button>

            <button className="dm-icon-btn-sm" onClick={loadData} title="Refresh data">
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="dm-search-row">
            <div className="dm-search-wrap">
              <Search size={15} className="dm-search-icon" />
              <input
                className="dm-search-input"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Cari kode (A001), nama jemaah, atau no. porsi..."
              />
              {search && <button className="dm-search-clear" onClick={() => handleSearch('')}><X size={13} /></button>}
            </div>
            <div className="dm-filter-group">
              <Filter size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <select className="dm-filter-select" value={filterRomb} onChange={e => handleFilterRomb(e.target.value)}>
                <option value="">Semua Rombongan</option>
                {rombOptions.map(r => <option key={r} value={String(r)}>Rombongan {r}</option>)}
              </select>
              <select className="dm-filter-select" value={filterRegu} onChange={e => handleFilterRegu(e.target.value)}>
                <option value="">Semua Regu</option>
                {reguOptions.map(r => <option key={r} value={String(r)}>Regu {r}</option>)}
              </select>

              {/* Opsi Pengurutan */}
              <div className="dm-sort-wrap" title="Pilih opsi pengurutan data">
                <ArrowUpDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <select className="dm-filter-select" value={sortBy} onChange={e => handleSort(e.target.value)}>
                  <option value="rombongan_asc">Urutan: Rombongan &amp; Regu (5 → 9)</option>
                  <option value="rombongan_desc">Urutan: Rombongan &amp; Regu (9 → 5)</option>
                  <option value="nama_asc">Urutan: Nama (A → Z)</option>
                  <option value="nama_desc">Urutan: Nama (Z → A)</option>
                  <option value="no_porsi_asc">Urutan: No. Porsi (Terkecil)</option>
                  <option value="no_porsi_desc">Urutan: No. Porsi (Terbesar)</option>
                  <option value="usia_desc">Urutan: Usia Tertua (Lansia)</option>
                  <option value="usia_asc">Urutan: Usia Termuda</option>
                  <option value="aktual_asc">Urutan: Status Aktual (KAROM/KARU)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {sorted.length === 0 ? (
            <div className="dm-no-results">
              <Search size={32} strokeWidth={1.5} />
              <p>Tidak ada jemaah yang cocok dengan filter.</p>
              <button className="dm-btn dm-btn-ghost" onClick={() => { setSearch(''); setFilterRegu(''); setFilterRomb(''); setSortBy('rombongan_asc'); }}>Reset Filter &amp; Urutan</button>
            </div>
          ) : (
            <DataTable
              rows={pageRows}
              showSkala={showSkala}
              onEdit={row => setAddEditModal({ mode: 'edit', data: row })}
              onDelete={row => setDelModal(row)}
              allData={allData}
              sortBy={sortBy}
              onSort={handleSort}
              extraCriteria={extraCriteria}
            />
          )}

          {/* Pagination */}
          <Pagination page={safePage} totalPages={totalPages} total={sorted.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} />
        </>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Upload Result Modal */}
      {uploadResult && <UploadResultModal result={uploadResult} onClose={() => setUploadResult(null)} />}

      {/* Add/Edit Modal */}
      {addEditModal && (
        <JamaahModal
          initial={addEditModal.data}
          extraCriteria={extraCriteria}
          onSave={handleSaveJamaah}
          onClose={() => setAddEditModal(null)}
          loading={mutLoading}
        />
      )}

      {/* Delete Single */}
      {delModal && (
        <ConfirmModal
          title="Hapus Data Jemaah"
          message={`Hapus data "${delModal.nama}" (${delModal.no_porsi})? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
          onClose={() => setDelModal(null)}
          loading={mutLoading}
        />
      )}

      {/* Delete All Modal */}
      {delAllModal && (
        <ConfirmModal
          title="Kosongkan Semua Data Alternatif"
          message={`Apakah Anda yakin ingin mengosongkan / menghapus SEMUA data jemaah alternatif (${allData.length} jemaah) dari database? Tindakan ini tidak dapat dibatalkan. Anda dapat mengunggah ulang data baru kapan saja.`}
          onConfirm={handleDeleteAll}
          onClose={() => setDelAllModal(false)}
          loading={mutLoading}
        />
      )}
    </div>
  );
}
