import {
  SlidersHorizontal,
  Database,
  GitBranch,
  UserCheck,
  Trophy,
  FlaskConical,
} from 'lucide-react';

const PAGE_CONFIG = {
  kriteria: {
    icon: SlidersHorizontal,
    title: 'Data Kriteria',
    desc: 'Halaman ini akan menampilkan konfigurasi 6 kriteria (C1–C6), sub-kriteria, dan skala penilaian untuk seleksi KARU dan KAROM.',
  },
  master: {
    icon: Database,
    title: 'Data Master',
    desc: 'Halaman ini akan menampilkan data seluruh jemaah haji (alternatif), upload Excel, preprocessing, dan pengelompokan regu/rombongan.',
  },
  ahp: {
    icon: GitBranch,
    title: 'Analytical Hierarchy Process',
    desc: 'Halaman ini akan menampilkan matriks perbandingan berpasangan, normalisasi, eigen vector, dan uji konsistensi (CR ≤ 0.1).',
  },
  pm: {
    icon: UserCheck,
    title: 'Profile Matching',
    desc: 'Halaman ini akan menampilkan perhitungan GAP, bobot GAP, dan skor hybrid (N_i = Σ W_j × Bobot GAP) untuk mode KARU dan KAROM.',
  },
  hasil: {
    icon: Trophy,
    title: 'Hasil Akhir',
    desc: 'Halaman ini akan menampilkan perankingan akhir dengan rekomendasi KARU dan KAROM berdasarkan skor tertinggi.',
  },
  pengujian: {
    icon: FlaskConical,
    title: 'Pengujian Sistem',
    desc: 'Halaman ini akan menampilkan 12 skenario Sensitivity Analysis, korelasi Spearman (r_s), dan korelasi Pearson (r).',
  },
};

export default function PlaceholderPage({ pageId }) {
  const config = PAGE_CONFIG[pageId];

  if (!config) {
    return (
      <div className="page-container">
        <div className="placeholder-page">
          <h3>Halaman tidak ditemukan</h3>
        </div>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="page-container">
      <div className="placeholder-page">
        <div className="placeholder-page-icon">
          <Icon size={28} strokeWidth={1.5} />
        </div>
        <h3>{config.title}</h3>
        <p>{config.desc}</p>
        <span className="status-badge info">
          <span className="status-badge-dot" />
          Segera Hadir
        </span>
      </div>
    </div>
  );
}
