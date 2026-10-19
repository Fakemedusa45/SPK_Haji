import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'kriteria':
      case 'master':
      case 'ahp':
      case 'pm':
      case 'hasil':
      case 'pengujian':
        return <PlaceholderPage pageId={activePage} />;
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
