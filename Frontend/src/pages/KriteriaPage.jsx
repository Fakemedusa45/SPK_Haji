import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  Sliders, AlertCircle, Info, CheckCircle2, X,
} from 'lucide-react';
import {
  fetchKriteria,
  createKriteria, updateKriteria, deleteKriteria,
  createSubKriteria, updateSubKriteria, deleteSubKriteria,
} from '../services/api';

/* ============================================================
   HELPERS
   ============================================================ */

function scopeBadge(scope) {
  const isKarom = scope && scope.toLowerCase().includes('khusus');
  return (
    <span className={`kr-scope-badge ${isKarom ? 'karom-only' : 'both'}`}>
      {scope || 'KAROM & KARU'}
    </span>
  );
}

function kodeBadge(kode) {
  const colors = {
    C1: 'kr-badge-c1', C2: 'kr-badge-c2', C3: 'kr-badge-c3',
    C4: 'kr-badge-c4', C5: 'kr-badge-c5', C6: 'kr-badge-c6',
  };
  return (
    <span className={`kr-kode-badge ${colors[kode] || 'kr-badge-c1'}`}>
      {kode}
    </span>
  );
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`kr-toast kr-toast-${type}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{message}</span>
      <button className="kr-toast-close" onClick={onClose}><X size={14} /></button>
    </div>
  );
}

/* ============================================================
   MODAL — Add/Edit Kriteria
   ============================================================ */

function KriteriaModal({ initial, onSave, onClose, loading }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    kode:  initial?.kode  || '',
    nama:  initial?.nama  || '',
    bobot: initial?.bobot != null ? String(initial.bobot) : '',
    scope: initial?.scope || 'KAROM & KARU',
  });

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      kode:  form.kode.trim(),
      nama:  form.nama.trim(),
      bobot: form.bobot !== '' ? parseFloat(form.bobot) : null,
      scope: form.scope,
    };
    onSave(payload);
  }

  return (
    <div className="kr-modal-backdrop" onClick={onClose}>
      <div className="kr-modal" onClick={e => e.stopPropagation()}>
        <div className="kr-modal-header">
          <h3>{isEdit ? 'Edit Kriteria' : 'Tambah Kriteria'}</h3>
          <button className="kr-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="kr-modal-body">
          <div className="kr-form-row">
            <div className="kr-form-group">
              <label>Kode Kriteria <span className="req">*</span></label>
              <input
                className="kr-input"
                value={form.kode}
                onChange={e => set('kode', e.target.value)}
                placeholder="C1"
                required
              />
            </div>
            <div className="kr-form-group" style={{ flex: 2 }}>
              <label>Nama Kriteria <span className="req">*</span></label>
              <input
                className="kr-input"
                value={form.nama}
                onChange={e => set('nama', e.target.value)}
                placeholder="Usia"
                required
              />
            </div>
          </div>

          <div className="kr-form-row">
            <div className="kr-form-group">
              <label>Bobot Prioritas (W<sub>j</sub>)</label>
              <input
                className="kr-input"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={form.bobot}
                onChange={e => set('bobot', e.target.value)}
                placeholder="0.3512"
              />
            </div>
            <div className="kr-form-group" style={{ flex: 2 }}>
              <label>Cakupan <span className="req">*</span></label>
              <select
                className="kr-input"
                value={form.scope}
                onChange={e => set('scope', e.target.value)}
              >
                <option value="KAROM & KARU">KAROM &amp; KARU</option>
                <option value="Khusus KAROM">Khusus KAROM</option>
              </select>
            </div>
          </div>

          <div className="kr-modal-footer">
            <button type="button" className="kr-btn kr-btn-ghost" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="kr-btn kr-btn-primary" disabled={loading}>
              {loading ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah Kriteria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   MODAL — Add/Edit Sub-Kriteria
   ============================================================ */

function SubKriteriaModal({ initial, kriteriaId, onSave, onClose, loading }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    rentang_nilai: initial?.rentang_nilai || '',
    keterangan:    initial?.keterangan    || '',
    skor:          initial?.skor          != null ? String(initial.skor) : '3',
  });

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      kriteria_id:   kriteriaId,
      rentang_nilai: form.rentang_nilai.trim(),
      keterangan:    form.keterangan.trim(),
      skor:          parseInt(form.skor, 10),
    });
  }

  const scoreLabels = {
    5: 'Sangat Ideal', 4: 'Ideal', 3: 'Cukup',
    2: 'Kurang Ideal', 1: 'Tidak Ideal',
  };

  return (
    <div className="kr-modal-backdrop" onClick={onClose}>
      <div className="kr-modal" onClick={e => e.stopPropagation()}>
        <div className="kr-modal-header">
          <h3>{isEdit ? 'Edit Sub-Kriteria' : 'Tambah Sub-Kriteria'}</h3>
          <button className="kr-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="kr-modal-body">
          <div className="kr-form-group">
            <label>Rentang Nilai / Sub-Kriteria <span className="req">*</span></label>
            <input
              className="kr-input"
              value={form.rentang_nilai}
              onChange={e => set('rentang_nilai', e.target.value)}
              placeholder="≥ 60 tahun"
              required
            />
          </div>

          <div className="kr-form-group">
            <label>Keterangan <span className="req">*</span></label>
            <input
              className="kr-input"
              value={form.keterangan}
              onChange={e => set('keterangan', e.target.value)}
              placeholder="Sangat Ideal"
              required
            />
          </div>

          <div className="kr-form-group">
            <label>Skor (1–5) <span className="req">*</span></label>
            <div className="kr-skor-picker">
              {[5, 4, 3, 2, 1].map(s => (
                <button
                  key={s}
                  type="button"
                  className={`kr-skor-btn ${form.skor === String(s) ? 'active' : ''}`}
                  onClick={() => set('skor', String(s))}
                >
                  <span className="kr-skor-num">{s}</span>
                  <span className="kr-skor-label">{scoreLabels[s]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="kr-modal-footer">
            <button type="button" className="kr-btn kr-btn-ghost" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="kr-btn kr-btn-primary" disabled={loading}>
              {loading ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah Sub-Kriteria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   CONFIRM DELETE MODAL
   ============================================================ */

function ConfirmModal({ message, onConfirm, onClose, loading }) {
  return (
    <div className="kr-modal-backdrop" onClick={onClose}>
      <div className="kr-modal kr-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="kr-modal-header">
          <h3>Konfirmasi Hapus</h3>
          <button className="kr-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="kr-modal-body">
          <div className="kr-confirm-icon">
            <Trash2 size={28} />
          </div>
          <p className="kr-confirm-msg">{message}</p>
          <div className="kr-modal-footer">
            <button className="kr-btn kr-btn-ghost" onClick={onClose}>Batal</button>
            <button
              className="kr-btn kr-btn-danger"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Menghapus…' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SUB-KRITERIA TABLE
   ============================================================ */

function SubKriteriaTable({ subs, kriteriaId, onAddSub, onEditSub, onDeleteSub }) {
  const scoreColor = { 5: 'skor-5', 4: 'skor-4', 3: 'skor-3', 2: 'skor-2', 1: 'skor-1' };

  return (
    <div className="kr-sub-body">
      <div className="kr-sub-title">Rentang Nilai &amp; Skala Penilaian</div>
      {subs.length === 0 ? (
        <div className="kr-sub-empty">
          Belum ada sub-kriteria. Klik tombol di bawah untuk menambahkan.
        </div>
      ) : (
        <table className="kr-sub-table">
          <thead>
            <tr>
              <th>Rentang Nilai / Sub-Kriteria</th>
              <th>Keterangan</th>
              <th style={{ textAlign: 'center' }}>Skor</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {subs.map(sub => (
              <tr key={sub.id}>
                <td className="kr-sub-rentang">{sub.rentang_nilai}</td>
                <td className="kr-sub-ket">{sub.keterangan}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`kr-skor-chip ${scoreColor[sub.skor] || ''}`}>
                    {sub.skor}
                  </span>
                </td>
                <td>
                  <div className="kr-sub-actions">
                    <button
                      className="kr-action-link edit"
                      onClick={() => onEditSub(sub)}
                      title="Edit sub-kriteria"
                    >
                      <Pencil size={12} strokeWidth={2} /> Edit
                    </button>
                    <span className="kr-action-sep">|</span>
                    <button
                      className="kr-action-link delete"
                      onClick={() => onDeleteSub(sub)}
                      title="Hapus sub-kriteria"
                    >
                      <Trash2 size={12} strokeWidth={2} /> Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button
        className="kr-btn kr-btn-outline-sm"
        onClick={() => onAddSub(kriteriaId)}
      >
        <Plus size={14} /> Tambah Sub-Kriteria
      </button>
    </div>
  );
}

/* ============================================================
   KRITERIA ACCORDION CARD
   ============================================================ */

function KriteriaCard({ kr, isOpen, onToggle, onEdit, onDelete, onAddSub, onEditSub, onDeleteSub }) {
  return (
    <div className={`kr-card ${isOpen ? 'open' : ''}`}>
      <div
        className="kr-card-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      >
        <div className="kr-card-left">
          {kodeBadge(kr.kode)}
          <div className="kr-card-info">
            <span className="kr-card-name">{kr.nama}</span>
            {scopeBadge(kr.scope)}
          </div>
        </div>

        <div className="kr-card-right">
          <div className="kr-bobot-block">
            <span className="kr-bobot-label">Bobot Prioritas</span>
            <span className="kr-bobot-value">
              {kr.bobot != null ? kr.bobot.toFixed(4) : '—'}
            </span>
          </div>
          <button
            className="kr-icon-btn edit"
            onClick={e => { e.stopPropagation(); onEdit(kr); }}
            title="Edit kriteria"
          >
            <Pencil size={15} strokeWidth={2} />
          </button>
          <button
            className="kr-icon-btn delete"
            onClick={e => { e.stopPropagation(); onDelete(kr); }}
            title="Hapus kriteria"
          >
            <Trash2 size={15} strokeWidth={2} />
          </button>
          <span className="kr-chevron">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </div>
      </div>

      {isOpen && (
        <SubKriteriaTable
          subs={kr.sub_kriterias || []}
          kriteriaId={kr.id}
          onAddSub={onAddSub}
          onEditSub={onEditSub}
          onDeleteSub={onDeleteSub}
        />
      )}
    </div>
  );
}

/* ============================================================
   RINGKASAN KONFIGURASI CARD
   ============================================================ */

function RingkasanCard({ kriterias }) {
  const totalKriteria = kriterias.length;
  const totalSub = kriterias.reduce((acc, kr) => acc + (kr.sub_kriterias?.length || 0), 0);
  const totalBobot = kriterias.reduce((acc, kr) => acc + (kr.bobot || 0), 0);
  const bobotOk = Math.abs(totalBobot - 1) < 0.01;

  return (
    <div className="kr-ringkasan-card">
      <div className="kr-ringkasan-header">
        <Info size={15} strokeWidth={2} />
        <span>Ringkasan Konfigurasi</span>
      </div>
      <div className="kr-ringkasan-stats">
        <div className="kr-stat-item">
          <span className="kr-stat-label">Total Kriteria</span>
          <span className="kr-stat-value">{totalKriteria}</span>
        </div>
        <div className="kr-stat-divider" />
        <div className="kr-stat-item">
          <span className="kr-stat-label">Total Sub-Kriteria</span>
          <span className="kr-stat-value">{totalSub}</span>
        </div>
        <div className="kr-stat-divider" />
        <div className="kr-stat-item">
          <span className="kr-stat-label">Total Bobot</span>
          <span className={`kr-stat-value ${bobotOk ? 'bobot-ok' : 'bobot-warn'}`}>
            {totalBobot.toFixed(4)}&nbsp;
            {bobotOk
              ? <CheckCircle2 size={13} />
              : <AlertCircle size={13} />
            }
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INFO TIP BANNER
   ============================================================ */

function TipBanner() {
  return (
    <div className="kr-tip-banner">
      <div className="kr-tip-icon"><Info size={14} /></div>
      <p>
        Parameter kriteria di bawah digunakan dalam proses seleksi <strong>KAROM</strong> (C1–C6) dan&nbsp;
        <strong>KARU</strong> (C1–C4). Bobot prioritas dihitung menggunakan metode&nbsp;
        <strong>Analytical Hierarchy Process (AHP)</strong> dan dapat diperbarui jika regulasi haji berubah.
      </p>
    </div>
  );
}

/* ============================================================
   KRITERIA PAGE (main export)
   ============================================================ */

export default function KriteriaPage() {
  const [kriterias, setKriterias]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [openCards, setOpenCards]   = useState(new Set());
  const [mutLoading, setMutLoading] = useState(false);

  const [toast, setToast]           = useState(null);
  const [krModal, setKrModal]       = useState(null);
  const [subModal, setSubModal]     = useState(null);
  const [delModal, setDelModal]     = useState(null);

  /* ── Data Loading ── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchKriteria();
      setKriterias(data);
      if (data.length > 0) {
        setOpenCards(prev => prev.size === 0 ? new Set([String(data[0].id)]) : prev);
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data kriteria. Pastikan backend berjalan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  function toggleCard(id) {
    setOpenCards(prev => {
      const next = new Set(prev);
      if (next.has(String(id))) next.delete(String(id));
      else next.add(String(id));
      return next;
    });
  }

  /* ── Kriteria CRUD ── */
  async function handleSaveKriteria(payload) {
    try {
      setMutLoading(true);
      if (krModal.mode === 'edit') {
        await updateKriteria(krModal.data.id, payload);
        showToast(`Kriteria ${payload.kode} berhasil diperbarui.`);
      } else {
        await createKriteria(payload);
        showToast(`Kriteria ${payload.kode} berhasil ditambahkan.`);
      }
      setKrModal(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan kriteria.', 'error');
    } finally {
      setMutLoading(false);
    }
  }

  async function handleDeleteKriteria() {
    try {
      setMutLoading(true);
      await deleteKriteria(delModal.data.id);
      showToast(`Kriteria ${delModal.data.kode} dihapus.`);
      setDelModal(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus kriteria.', 'error');
    } finally {
      setMutLoading(false);
    }
  }

  /* ── Sub-Kriteria CRUD ── */
  async function handleSaveSubKriteria(payload) {
    try {
      setMutLoading(true);
      if (subModal.mode === 'edit') {
        await updateSubKriteria(subModal.data.id, payload);
        showToast('Sub-kriteria berhasil diperbarui.');
      } else {
        await createSubKriteria(payload);
        showToast('Sub-kriteria berhasil ditambahkan.');
      }
      setSubModal(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan sub-kriteria.', 'error');
    } finally {
      setMutLoading(false);
    }
  }

  async function handleDeleteSubKriteria() {
    try {
      setMutLoading(true);
      await deleteSubKriteria(delModal.data.id);
      showToast('Sub-kriteria dihapus.');
      setDelModal(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus sub-kriteria.', 'error');
    } finally {
      setMutLoading(false);
    }
  }

  /* ── Render ── */
  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <div className="loading-spinner" />
          <span className="loading-text">Memuat data kriteria…</span>
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
          <button className="kr-btn kr-btn-primary" style={{ marginTop: 8 }} onClick={loadData}>
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="kr-page-header">
        <div className="kr-page-title-block">
          <div className="kr-page-icon">
            <Sliders size={20} strokeWidth={2} />
          </div>
          <div>
            <h1 className="kr-page-title">Data Kriteria</h1>
            <p className="kr-page-subtitle">
              Kelola parameter penilaian KAROM (C1–C6) &amp; KARU (C1–C4)
            </p>
          </div>
        </div>
        <button
          className="kr-btn kr-btn-primary"
          onClick={() => setKrModal({ mode: 'add' })}
        >
          <Plus size={16} /> Tambah Kriteria
        </button>
      </div>

      {/* ── Tip Banner ── */}
      <TipBanner />

      {/* ── Criteria Accordion Cards ── */}
      <div className="kr-cards-list">
        {kriterias.map(kr => (
          <KriteriaCard
            key={kr.id}
            kr={kr}
            isOpen={openCards.has(String(kr.id))}
            onToggle={() => toggleCard(kr.id)}
            onEdit={k => setKrModal({ mode: 'edit', data: k })}
            onDelete={k => setDelModal({ type: 'kr', data: k })}
            onAddSub={kriteriaId => setSubModal({ mode: 'add', kriteriaId })}
            onEditSub={sub => setSubModal({ mode: 'edit', kriteriaId: sub.kriteria_id, data: sub })}
            onDeleteSub={sub => setDelModal({ type: 'sub', data: sub })}
          />
        ))}
      </div>

      {/* ── Ringkasan Konfigurasi ── */}
      <RingkasanCard kriterias={kriterias} />

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── Modals ── */}
      {krModal && (
        <KriteriaModal
          initial={krModal.data}
          onSave={handleSaveKriteria}
          onClose={() => setKrModal(null)}
          loading={mutLoading}
        />
      )}

      {subModal && (
        <SubKriteriaModal
          initial={subModal.data}
          kriteriaId={subModal.kriteriaId}
          onSave={handleSaveSubKriteria}
          onClose={() => setSubModal(null)}
          loading={mutLoading}
        />
      )}

      {delModal && (
        <ConfirmModal
          message={
            delModal.type === 'kr'
              ? `Hapus kriteria "${delModal.data.kode} — ${delModal.data.nama}"? Semua sub-kriterianya juga akan terhapus.`
              : `Hapus sub-kriteria "${delModal.data.rentang_nilai}"?`
          }
          onConfirm={delModal.type === 'kr' ? handleDeleteKriteria : handleDeleteSubKriteria}
          onClose={() => setDelModal(null)}
          loading={mutLoading}
        />
      )}
    </div>
  );
}
