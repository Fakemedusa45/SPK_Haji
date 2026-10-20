import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Upload, Plus, Pencil, Trash2, X, AlertCircle,
  CheckCircle2, FileSpreadsheet, Database, Users, RefreshCw,
  ChevronLeft, ChevronRight, Eye, EyeOff, Filter,
} from 'lucide-react';
import {
  fetchJamaahKonversi,
  createJamaah, updateJamaah, deleteJamaah,
  uploadJamaahExcel,
} from '../services/api';

/* ============================================================
   CONSTANTS
   ============================================================ */

const PAGE_SIZE = 10;

const REGU_SIZE  = 11; // ~10-11 per regu
const ROMB_SIZE  = 44; // ~4 regu per rombongan

/** Generate kode like A001, A002… from index */
function toKode(idx) {
  return `A${String(idx + 1).padStart(3, '0')}`;
}

/** Compute regu & rombongan numbers from 0-based index */
function computeGroup(idx) {
  const regu     = Math.floor(idx / REGU_SIZE) + 1;
  const rombongan = Math.floor(idx / ROMB_SIZE) + 1;
  return { regu, rombongan };
}

const SKOR_COLOR = {
  5: 'skl-5', 4: 'skl-4', 3: 'skl-3', 2: 'skl-2', 1: 'skl-1',
};

const KELAMIN_OPTS  = ['', 'Laki-laki', 'Perempuan'];
const KESEHATAN_OPTS = ['', 'Sehat', "Istitha'ah", 'Perlu Pendampingan', 'Resti'];
const STATUS_OPTS   = ['', 'Belum', 'Sudah', 'Batal'];
const PEND_OPTS     = ['', 'SD', 'SMP', 'SMA', 'SMK', 'D3', 'S1', 'D4', 'S2', 'S3'];
const PEK_OPTS      = ['', 'PNS', 'TNI', 'POLRI', 'Guru', 'Dosen', 'Pegawai Negeri', 'Wiraswasta', 'Swasta', 'Petani', 'Pedagang', 'Lainnya'];

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
   UPLOAD RESULT MODAL
   ============================================================ */

function UploadResultModal({ result, onClose }) {
  return (
    <div className="dm-modal-backdrop" onClick={onClose}>
      <div className="dm-modal dm-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="dm-modal-header">
          <h3>Hasil Upload Excel</h3>
          <button className="dm-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="dm-modal-body">
          <div className="dm-upload-result">
            <div className="dm-result-row success">
              <CheckCircle2 size={18} />
              <span><strong>{result.imported}</strong> data berhasil diimpor</span>
            </div>
            {result.skipped > 0 && (
              <div className="dm-result-row warn">
                <AlertCircle size={18} />
                <span><strong>{result.skipped}</strong> baris dilewati (duplikat)</span>
              </div>
            )}
            {result.errors?.length > 0 && (
              <div className="dm-result-errors">
                <p>Error pada baris:</p>
                <ul>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
          </div>
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
  no_porsi: '', nama: '', jenis_kelamin: 'Laki-laki',
  tanggal_lahir: '', kesehatan: 'Sehat',
  pekerjaan: 'PNS', pendidikan: 'S1', status_haji: 'Belum',
};

function JamaahModal({ initial, onSave, onClose, loading }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    initial
      ? { ...initial, tanggal_lahir: initial.tanggal_lahir || '' }
      : { ...EMPTY_FORM }
  );

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...form });
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
              <input
                className="dm-input"
                value={form.no_porsi}
                onChange={e => set('no_porsi', e.target.value)}
                placeholder="1300456789"
                required
                disabled={isEdit}
              />
            </div>
            <div className="dm-form-group" style={{ flex: 2 }}>
              <label>Nama Lengkap <span className="req">*</span></label>
              <input
                className="dm-input"
                value={form.nama}
                onChange={e => set('nama', e.target.value)}
                placeholder="Budi Santoso"
                required
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="dm-form-row">
            <div className="dm-form-group">
              <label>Tanggal Lahir <span className="req">*</span></label>
              <input
                className="dm-input"
                type="date"
                value={form.tanggal_lahir}
                onChange={e => set('tanggal_lahir', e.target.value)}
                required
              />
            </div>
            <div className="dm-form-group">
              <label>Jenis Kelamin <span className="req">*</span></label>
              <select className="dm-input" value={form.jenis_kelamin} onChange={e => set('jenis_kelamin', e.target.value)}>
                {KELAMIN_OPTS.filter(Boolean).map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3 */}
          <div className="dm-form-row">
            <div className="dm-form-group">
              <label>Kesehatan <span className="req">*</span></label>
              <select className="dm-input" value={form.kesehatan} onChange={e => set('kesehatan', e.target.value)}>
                {KESEHATAN_OPTS.filter(Boolean).map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="dm-form-group">
              <label>Status Haji <span className="req">*</span></label>
              <select className="dm-input" value={form.status_haji} onChange={e => set('status_haji', e.target.value)}>
                {STATUS_OPTS.filter(Boolean).map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Row 4 */}
          <div className="dm-form-row">
            <div className="dm-form-group">
              <label>Pekerjaan <span className="req">*</span></label>
              <select className="dm-input" value={form.pekerjaan} onChange={e => set('pekerjaan', e.target.value)}>
                {PEK_OPTS.filter(Boolean).map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="dm-form-group">
              <label>Pendidikan <span className="req">*</span></label>
              <select className="dm-input" value={form.pendidikan} onChange={e => set('pendidikan', e.target.value)}>
                {PEND_OPTS.filter(Boolean).map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

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
      <div className="dm-empty-icon">
        <Database size={52} strokeWidth={1} />
      </div>
      <h2 className="dm-empty-title">Belum Ada Data</h2>
      <p className="dm-empty-desc">
        Basis data alternatif jemaah haji masih kosong.<br />
        Upload file Excel untuk mengimpor data sekaligus, atau tambahkan satu per satu.
      </p>
      <div className="dm-empty-actions">
        <button className="dm-btn dm-btn-primary dm-btn-lg" onClick={onUpload}>
          <Upload size={18} /> Upload Data Excel
        </button>
        <button className="dm-btn dm-btn-ghost dm-btn-lg" onClick={onAdd}>
          <Plus size={18} /> Tambah Manual
        </button>
      </div>

      {/* Template hint */}
      <div className="dm-empty-hint">
        <FileSpreadsheet size={14} />
        <span>File Excel harus memiliki kolom: <code>no_porsi, nama, jenis_kelamin, pendidikan, pekerjaan, status_haji, tanggal_lahir, kesehatan</code></span>
      </div>
    </div>
  );
}

/* ============================================================
   SKOR CHIP
   ============================================================ */

function SkorChip({ value }) {
  return (
    <span className={`dm-skor-chip ${SKOR_COLOR[value] || ''}`}>{value}</span>
  );
}

/* ============================================================
   DATA TABLE
   ============================================================ */

function DataTable({ rows, showSkala, onEdit, onDelete }) {
  return (
    <div className="dm-table-wrapper">
      <table className="dm-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama Jemaah</th>
            <th>Regu / Rombongan</th>
            <th>
              <span className="th-criterion">
                Usia{showSkala ? <span className="th-c">C1</span> : null}
              </span>
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
            <th style={{ textAlign: 'center' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { regu, rombongan } = computeGroup(row._idx);
            return (
              <tr key={row.no_porsi}>
                <td>
                  <span className="dm-kode-chip">{toKode(row._idx)}</span>
                </td>
                <td className="dm-nama-cell">
                  <span className="dm-nama">{row.nama}</span>
                  <span className="dm-porsi">{row.no_porsi}</span>
                </td>
                <td>
                  <div className="dm-group-cell">
                    <span className="dm-regu-badge">Regu {regu}</span>
                    <span className="dm-romb-badge">Rombongan {rombongan}</span>
                  </div>
                </td>

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
                    ? <SkorChip value={row.skala?.C6 ?? row.skala?.C3} />
                    : <span className="dm-raw">{row.status_haji}</span>
                  }
                </td>

                <td>
                  <div className="dm-row-actions">
                    <button
                      className="dm-icon-btn edit"
                      onClick={() => onEdit(row)}
                      title="Edit jemaah"
                    >
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button
                      className="dm-icon-btn delete"
                      onClick={() => onDelete(row)}
                      title="Hapus jemaah"
                    >
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

  // Generate page window [-2 .. +2] around current
  const pages = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
    pages.push(p);
  }

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  return (
    <div className="dm-pagination">
      <span className="dm-pagination-info">
        Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
        <span className="dm-pagination-total"> ({total} Jemaah, menampilkan {from}–{to})</span>
      </span>
      <div className="dm-pagination-btns">
        <button
          className="dm-page-btn"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={15} />
        </button>
        {pages[0] > 1 && (
          <>
            <button className="dm-page-btn" onClick={() => onPage(1)}>1</button>
            {pages[0] > 2 && <span className="dm-page-ellipsis">…</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            className={`dm-page-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="dm-page-ellipsis">…</span>}
            <button className="dm-page-btn" onClick={() => onPage(totalPages)}>{totalPages}</button>
          </>
        )}
        <button
          className="dm-page-btn"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ALTERNATIF PAGE (main export)
   ============================================================ */

export default function AlternatifPage() {
  const [allData, setAllData]         = useState([]);   // full list with skala
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [mutLoading, setMutLoading]   = useState(false);

  // View toggles
  const [showSkala, setShowSkala]     = useState(false);

  // Search & filter
  const [search, setSearch]           = useState('');
  const [filterRegu, setFilterRegu]   = useState('');
  const [filterRomb, setFilterRomb]   = useState('');

  // Pagination
  const [page, setPage]               = useState(1);

  // Modals
  const [toast, setToast]             = useState(null);
  const [addEditModal, setAddEditModal] = useState(null);  // { mode, data? }
  const [delModal, setDelModal]       = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  // File input ref for hidden upload
  const fileInputRef = useRef(null);

  /* ── Load Data ── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJamaahKonversi();
      // Attach stable _idx based on original order
      setAllData(data.map((j, i) => ({ ...j, _idx: i })));
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data jemaah. Pastikan backend berjalan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function showToast(msg, type = 'success') { setToast({ message: msg, type }); }

  /* ── Derived filtered data ── */
  const filtered = allData.filter(j => {
    const { regu, rombongan } = computeGroup(j._idx);
    const q = search.toLowerCase();
    const matchSearch = !q ||
      toKode(j._idx).toLowerCase().includes(q) ||
      j.nama.toLowerCase().includes(q) ||
      j.no_porsi.includes(q);
    const matchRegu = !filterRegu || String(regu) === filterRegu;
    const matchRomb = !filterRomb || String(rombongan) === filterRomb;
    return matchSearch && matchRegu && matchRomb;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Available regu/rombongan options
  const reguOptions = [...new Set(allData.map(j => computeGroup(j._idx).regu))].sort((a, b) => a - b);
  const rombOptions = [...new Set(allData.map(j => computeGroup(j._idx).rombongan))].sort((a, b) => a - b);

  /* ── Search resets page ── */
  function handleSearch(v) { setSearch(v); setPage(1); }
  function handleFilterRegu(v) { setFilterRegu(v); setPage(1); }
  function handleFilterRomb(v) { setFilterRomb(v); setPage(1); }

  /* ── Upload Excel ── */
  function triggerUpload() { fileInputRef.current?.click(); }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';     // reset so same file can be re-picked
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

  /* ── Add/Edit Jamaah ── */
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

  /* ── Delete ── */
  async function handleDelete() {
    try {
      setMutLoading(true);
      await deleteJamaah(delModal.no_porsi);
      showToast(`Data ${delModal.nama} dihapus.`);
      setDelModal(null);
      await loadData();
    } catch (err) {
      showToast('Gagal menghapus data.', 'error');
    } finally {
      setMutLoading(false);
    }
  }

  /* ── Loading / Error states ── */
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
          <button className="dm-btn dm-btn-primary" style={{ marginTop: 8 }} onClick={loadData}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const isEmpty = allData.length === 0;

  return (
    <div className="page-container">
      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ── Page Header ── */}
      <div className="dm-page-header">
        <div className="dm-page-title-block">
          <div className="dm-page-icon">
            <Users size={20} strokeWidth={2} />
          </div>
          <div>
            <h1 className="dm-page-title">Data Master</h1>
            <p className="dm-page-subtitle">
              Basis data operasional calon jemaah haji reguler Kab. Kutai Kartanegara
            </p>
          </div>
        </div>

        <div className="dm-header-actions">
          <button
            className="dm-btn dm-btn-outline"
            onClick={triggerUpload}
            disabled={mutLoading}
            title="Upload file .xlsx"
          >
            <Upload size={15} />
            {mutLoading ? 'Mengupload…' : 'Upload Data (Excel)'}
          </button>
          <button
            className="dm-btn dm-btn-primary"
            onClick={() => setAddEditModal({ mode: 'add' })}
          >
            <Plus size={15} /> Tambah Data
          </button>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {isEmpty ? (
        <EmptyState
          onUpload={triggerUpload}
          onAdd={() => setAddEditModal({ mode: 'add' })}
        />
      ) : (
        <>
          {/* ── Stats Bar ── */}
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

          {/* ── Search & Filter Bar ── */}
          <div className="dm-search-row">
            <div className="dm-search-wrap">
              <Search size={15} className="dm-search-icon" />
              <input
                className="dm-search-input"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Cari berdasarkan kode (A001) atau nama jemaah..."
              />
              {search && (
                <button className="dm-search-clear" onClick={() => handleSearch('')}>
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="dm-filter-group">
              <Filter size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <select
                className="dm-filter-select"
                value={filterRegu}
                onChange={e => handleFilterRegu(e.target.value)}
              >
                <option value="">Semua Regu</option>
                {reguOptions.map(r => (
                  <option key={r} value={String(r)}>Regu {r}</option>
                ))}
              </select>
              <select
                className="dm-filter-select"
                value={filterRomb}
                onChange={e => handleFilterRomb(e.target.value)}
              >
                <option value="">Semua Rombongan</option>
                {rombOptions.map(r => (
                  <option key={r} value={String(r)}>Rombongan {r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Table ── */}
          {filtered.length === 0 ? (
            <div className="dm-no-results">
              <Search size={32} strokeWidth={1.5} />
              <p>Tidak ada jemaah yang cocok dengan filter.</p>
              <button
                className="dm-btn dm-btn-ghost"
                onClick={() => { setSearch(''); setFilterRegu(''); setFilterRomb(''); }}
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <DataTable
              rows={pageRows}
              showSkala={showSkala}
              onEdit={row => setAddEditModal({ mode: 'edit', data: row })}
              onDelete={row => setDelModal(row)}
            />
          )}

          {/* ── Pagination ── */}
          <Pagination
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPage={p => setPage(p)}
          />
        </>
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Upload Result Modal ── */}
      {uploadResult && (
        <UploadResultModal result={uploadResult} onClose={() => setUploadResult(null)} />
      )}

      {/* ── Add/Edit Modal ── */}
      {addEditModal && (
        <JamaahModal
          initial={addEditModal.data}
          onSave={handleSaveJamaah}
          onClose={() => setAddEditModal(null)}
          loading={mutLoading}
        />
      )}

      {/* ── Delete Confirm ── */}
      {delModal && (
        <ConfirmModal
          title="Hapus Data Jemaah"
          message={`Hapus data "${delModal.nama}" (${delModal.no_porsi})? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleDelete}
          onClose={() => setDelModal(null)}
          loading={mutLoading}
        />
      )}
    </div>
  );
}
