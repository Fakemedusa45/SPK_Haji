import { useState, useEffect } from 'react';
import {
  Users,
  SlidersHorizontal,
  Activity,
  Info,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { fetchDashboardStats } from '../services/api';

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

function WelcomeBanner() {
  return (
    <div className="welcome-banner">
      <h2>Selamat Datang di Sistem Pendukung Keputusan</h2>
      <p>
        Sistem ini membantu Kementerian Agama Kab. Kutai Kartanegara dalam
        menentukan Ketua Rombongan (KAROM) dan Ketua Regu (KARU) jemaah haji
        secara objektif menggunakan kombinasi metode <strong>Analytical Hierarchy
        Process (AHP)</strong> dan <strong>Profile Matching</strong>.
      </p>
    </div>
  );
}

function MetricCard({ icon: Icon, iconColor, value, label, sub }) {
  return (
    <div className="metric-card">
      <div className="metric-card-header">
        <div className={`metric-card-icon ${iconColor}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>
      <div className="metric-card-value">{value}</div>
      <div className="metric-card-label">{label}</div>
      {sub && <div className="metric-card-sub">{sub}</div>}
    </div>
  );
}

function HealthChart({ data, total }) {
  const categories = [
    { key: 'Tidak Risiko Tinggi', color: 'green', label: 'Tidak Risiko Tinggi' },
    { key: 'Risiko Tinggi Ringan', color: 'yellow', label: 'Risiko Tinggi Ringan' },
    { key: 'Risiko Tinggi Sedang', color: 'orange', label: 'Risiko Tinggi Sedang' },
    { key: 'Risiko Tinggi Berat', color: 'red', label: 'Risiko Tinggi Berat' },
  ];

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Kondisi Kesehatan Jemaah</span>
        <span className="chart-card-badge">{total} Jemaah</span>
      </div>
      <div className="health-chart">
        {categories.map((cat) => {
          const count = data[cat.key] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div className="health-bar-row" key={cat.key}>
              <div className="health-bar-label">{cat.label}</div>
              <div className="health-bar-track">
                <div
                  className={`health-bar-fill ${cat.color}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                >
                  {pct >= 8 && <span>{pct.toFixed(1)}%</span>}
                </div>
              </div>
              <div className="health-bar-count">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GenderDonut({ male, female, total }) {
  const malePct = total > 0 ? (male / total) * 100 : 0;
  const femalePct = total > 0 ? (female / total) * 100 : 0;

  // SVG donut calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const maleArc = (malePct / 100) * circumference;
  const femaleArc = (femalePct / 100) * circumference;
  const gap = 4; // small gap between segments

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Komposisi Jemaah</span>
      </div>
      <div className="donut-container">
        <div className="donut-wrapper">
          <svg viewBox="0 0 180 180">
            {/* Male segment */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="#6366f1"
              strokeWidth="24"
              strokeDasharray={`${maleArc - gap} ${circumference - maleArc + gap}`}
              strokeDashoffset="0"
              strokeLinecap="round"
            />
            {/* Female segment */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="#f472b6"
              strokeWidth="24"
              strokeDasharray={`${femaleArc - gap} ${circumference - femaleArc + gap}`}
              strokeDashoffset={`${-maleArc}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="donut-center">
            <div className="donut-center-value">{total}</div>
            <div className="donut-center-label">Total</div>
          </div>
        </div>

        <div className="donut-legend">
          <div className="donut-legend-item">
            <div className="donut-legend-dot male" />
            <div className="donut-legend-text">
              <span>Laki-laki</span>
              <small>{male} ({malePct.toFixed(1)}%)</small>
            </div>
          </div>
          <div className="donut-legend-item">
            <div className="donut-legend-dot female" />
            <div className="donut-legend-text">
              <span>Perempuan</span>
              <small>{female} ({femalePct.toFixed(1)}%)</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SopInfoCard() {
  const steps = [
    {
      num: '1',
      title: 'Pembentukan Regu',
      desc: 'Kelompokkan 10–11 jemaah ke dalam satu regu berdasarkan manifest.',
    },
    {
      num: '2',
      title: 'Seleksi KARU',
      desc: 'Evaluasi anggota regu menggunakan 4 kriteria (C1–C4) untuk memilih Ketua Regu.',
    },
    {
      num: '3',
      title: 'Pengelompokan Rombongan',
      desc: 'Gabungkan 4 regu menjadi 1 rombongan (40–44 jemaah).',
    },
    {
      num: '4',
      title: 'Seleksi KAROM',
      desc: 'Evaluasi seluruh anggota rombongan menggunakan 6 kriteria (C1–C6) untuk memilih Ketua Rombongan.',
    },
  ];

  return (
    <div className="info-card">
      <div className="info-card-header">
        <div className="info-card-header-icon">
          <Info size={17} strokeWidth={2} />
        </div>
        <span className="info-card-title">Informasi Sistem — Alur SOP Seleksi</span>
      </div>
      <div className="sop-flow">
        {steps.map((step, idx) => (
          <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
            <div className="sop-step">
              <div className="sop-step-number">{step.num}</div>
              <div className="sop-step-title">{step.title}</div>
              <div className="sop-step-desc">{step.desc}</div>
            </div>
            {idx < steps.length - 1 && (
              <div className="sop-arrow">
                <ChevronRight size={28} strokeWidth={1.5} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDashboardStats()
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setError('Gagal memuat data dari server. Pastikan backend berjalan.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <WelcomeBanner />
        <div className="loading-container">
          <div className="loading-spinner" />
          <span className="loading-text">Memuat data dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <WelcomeBanner />
        <div className="error-container">
          <AlertCircle size={32} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const { total, gender, health } = stats;

  return (
    <div className="page-container">
      <WelcomeBanner />

      {/* Row 1: Metric Cards */}
      <div className="metrics-grid">
        <MetricCard
          icon={Users}
          iconColor="emerald"
          value={total}
          label="Total Jemaah"
          sub="Alternatif terdaftar dalam database"
        />
        <MetricCard
          icon={SlidersHorizontal}
          iconColor="indigo"
          value="6 Kriteria"
          label="Kriteria Aktif"
          sub="C1–C6 Configuration (KAROM: 6, KARU: 4)"
        />
        <MetricCard
          icon={Activity}
          iconColor="amber"
          value="Siap"
          label="Status Analisis"
          sub="AHP & Profile Matching konsisten (CR ≤ 0.1)"
        />
      </div>

      {/* Row 2: Charts */}
      <div className="charts-grid">
        <HealthChart data={health} total={total} />
        <GenderDonut male={gender.male} female={gender.female} total={total} />
      </div>

      {/* Row 3: SOP Info */}
      <SopInfoCard />
    </div>
  );
}
