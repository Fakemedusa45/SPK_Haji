import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch all jamaah haji from the database.
 */
export async function fetchJamaahHaji() {
  const res = await api.get('/jamaah-haji');
  return res.data;
}

/**
 * Fetch jamaah list with C1-C6 conversion skala appended.
 */
export async function fetchJamaahKonversi() {
  const res = await api.get('/jamaah-haji/konversi');
  return res.data;
}

/**
 * Create a single jamaah record.
 */
export async function createJamaah(body) {
  const res = await api.post('/jamaah-haji', body);
  return res.data;
}

/**
 * Update a jamaah record by no_porsi.
 */
export async function updateJamaah(noPorsi, body) {
  const res = await api.put(`/jamaah-haji/${encodeURIComponent(noPorsi)}`, body);
  return res.data;
}

/**
 * Delete a single jamaah by no_porsi.
 */
export async function deleteJamaah(noPorsi) {
  await api.delete(`/jamaah-haji/${encodeURIComponent(noPorsi)}`);
}

/**
 * Delete ALL jamaah records.
 */
export async function deleteAllJamaah() {
  await api.delete('/jamaah-haji');
}

/**
 * Upload an Excel file (.xlsx) of jamaah data.
 * @param {File} file — the File object from an <input type="file">
 */
export async function uploadJamaahExcel(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/jamaah-haji/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function fetchSpkResult() {
  const res = await api.get('/spk-result');
  return res.data;
}

/**
 * Fetch dashboard statistics (total jamaah, gender breakdown, health stats).
 * Falls back to computing from raw data if no dedicated endpoint exists.
 */
export async function fetchDashboardStats() {
  try {
    const jamaahList = await fetchJamaahHaji();

    // Compute statistics client-side from raw data
    const total = jamaahList.length;

    // Gender distribution
    let male = 0;
    let female = 0;
    jamaahList.forEach((j) => {
      const gender = (j.jenis_kelamin || '').toUpperCase();
      if (gender === 'L' || gender === 'LAKI-LAKI') male++;
      else female++;
    });

    // Health distribution — map raw values to health risk categories
    const healthMap = {
      sehat: 'Tidak Risiko Tinggi',
      'tidak risiko tinggi': 'Tidak Risiko Tinggi',
      disabilitas: 'Risiko Tinggi Sedang',
      'risiko tinggi ringan': 'Risiko Tinggi Ringan',
      'risiko tinggi sedang': 'Risiko Tinggi Sedang',
      'risiko tinggi berat': 'Risiko Tinggi Berat',
      'riwayat sakit keras': 'Risiko Tinggi Berat',
    };

    const healthCounts = {
      'Tidak Risiko Tinggi': 0,
      'Risiko Tinggi Ringan': 0,
      'Risiko Tinggi Sedang': 0,
      'Risiko Tinggi Berat': 0,
    };

    jamaahList.forEach((j) => {
      const raw = (j.kesehatan || '').toLowerCase().trim();
      const category = healthMap[raw] || 'Risiko Tinggi Sedang';
      healthCounts[category]++;
    });

    return {
      total,
      gender: { male, female },
      health: healthCounts,
      jamaahList,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    throw error;
  }
}


// ─── Kriteria ───────────────────────────────────────────────────────────────

/** Fetch all criteria with their sub-criteria. */
export async function fetchKriteria() {
  const res = await api.get('/kriteria');
  return res.data;
}

/** Create a new criterion. */
export async function createKriteria(body) {
  const res = await api.post('/kriteria', body);
  return res.data;
}

/** Update an existing criterion by id. */
export async function updateKriteria(id, body) {
  const res = await api.put(`/kriteria/${id}`, body);
  return res.data;
}

/** Delete a criterion (also cascades sub-criteria). */
export async function deleteKriteria(id) {
  await api.delete(`/kriteria/${id}`);
}

// ─── Sub-Kriteria ────────────────────────────────────────────────────────────

/** Create a new sub-criterion. */
export async function createSubKriteria(body) {
  const res = await api.post('/sub-kriteria', body);
  return res.data;
}

/** Update an existing sub-criterion by id. */
export async function updateSubKriteria(id, body) {
  const res = await api.put(`/sub-kriteria/${id}`, body);
  return res.data;
}

/** Delete a sub-criterion by id. */
export async function deleteSubKriteria(id) {
  await api.delete(`/sub-kriteria/${id}`);
}


// ─── AHP ─────────────────────────────────────────────────────────────────────

/**
 * Fetch full AHP computation data for a given model.
 * @param {'karom'|'karu'} model
 */
export async function fetchAhp(model = 'karom') {
  const res = await api.get('/ahp', { params: { model } });
  return res.data;
}

/**
 * Recompute AHP from a custom pairwise matrix.
 * @param {{ matrix: number[][], labels: string[], codes: string[], model: string }} body
 */
export async function recomputeAhp(body) {
  const res = await api.post('/ahp/compute', body);
  return res.data;
}

// ─── Profile Matching ─────────────────────────────────────────────────────────

/**
 * Fetch full Profile Matching visualisation data.
 * @param {'karom'|'karu'} model
 */
export async function fetchPm(model = 'karom') {
  const res = await api.get('/pm', { params: { model } });
  return res.data;
}

/**
 * Recompute Profile Matching with optional custom target.
 * @param {{ model: string, target?: Record<string,number> }} body
 */
export async function computePm(body) {
  const res = await api.post('/pm/compute', body);
  return res.data;
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

/** Fetch full 12-scenario evaluation (Sensitivity + Spearman + Pearson). */
export async function fetchEvaluation() {
  const res = await api.get('/evaluation');
  return res.data;
}

export default api;
