import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import KriteriaPage from './pages/KriteriaPage';
import AlternatifPage from './pages/AlternatifPage';
import AhpPage from './pages/AhpPage';
import ProfileMatchingPage from './pages/ProfileMatchingPage';
import RankingPage from './pages/RankingPage';
import EvaluationPage from './pages/EvaluationPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'kriteria':
        return <KriteriaPage />;
      case 'master':
        return <AlternatifPage />;
      case 'ahp':
        return <AhpPage />;
      case 'pm':
        return <ProfileMatchingPage />;
      case 'hasil':
        return <RankingPage />;
      case 'pengujian':
        return <EvaluationPage />;
      default:
        return <DashboardPage />;
    }
  };


  return (
    <>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </>
  );
}
