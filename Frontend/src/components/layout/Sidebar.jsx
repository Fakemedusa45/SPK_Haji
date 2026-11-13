import {
  LayoutDashboard,
  SlidersHorizontal,
  Database,
  GitBranch,
  UserCheck,
  Trophy,
  FlaskConical,
} from 'lucide-react';
import logoKemenhaj from '../../assets/logo-kemenhaj.png';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    sub: 'Beranda',
    icon: LayoutDashboard,
  },
  {
    id: 'kriteria',
    label: 'Data Kriteria',
    sub: 'Kelola Kriteria',
    icon: SlidersHorizontal,
  },
  {
    id: 'master',
    label: 'Data Master',
    sub: 'Master Data',
    icon: Database,
  },
  {
    id: 'ahp',
    label: 'Analytical Hierarchy Process',
    sub: 'Metode AHP',
    icon: GitBranch,
  },
  {
    id: 'pm',
    label: 'Profile Matching',
    sub: 'Profile Matching',
    icon: UserCheck,
  },
  {
    id: 'hasil',
    label: 'Hasil Akhir',
    sub: 'Perankingan',
    icon: Trophy,
  },
  {
    id: 'pengujian',
    label: 'Pengujian Sistem',
    sub: 'Confusion Matrix & Sensitivitas',
    icon: FlaskConical,
  },
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      {/* Header / Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img src={logoKemenhaj} alt="Logo Kementerian Haji dan Umrah" className="sidebar-logo-img" />
          </div>
          <div className="sidebar-logo-text">
            <h1>Pemilihan KARU &amp; KAROM</h1>
            <p>SPK AHP &amp; Profile Matching</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <div
              key={item.id}
              className={`sidebar-nav-item${isActive ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate(item.id);
                }
              }}
            >
              <Icon className="nav-icon" size={20} strokeWidth={1.8} />
              <div className="nav-label">
                <span>{item.label}</span>
                <small>{item.sub}</small>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-badge">
          <div className="badge-dot" />
          <span>Kementerian Haji dan Umrah</span>
        </div>
      </div>
    </aside>
  );
}
