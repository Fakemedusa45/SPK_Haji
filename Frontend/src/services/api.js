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
 * Fetch SPK calculation results (AHP weights + rankings).
 */
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

export default api;
