import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { SelectNationPage } from './pages/SelectNationPage';
import { DashboardPage } from './pages/DashboardPage';
import { YourPlotPage } from './pages/YourPlotPage';
import { MapPage } from './pages/MapPage';
import { NationPage } from './pages/NationPage';
import { AdminPage } from './pages/AdminPage';

function AppContent() {
  const { state } = useGame();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Debug logging
  console.log('App - Current Page:', currentPage);
  console.log('App - User:', state.user);
  console.log('App - Plot:', state.plot);

  // Redirect logic
  useEffect(() => {
    if (!state.user) {
      setCurrentPage('login');
    } else if (state.user && !state.user.nation) {
      setCurrentPage('select-nation');
    } else if (currentPage === 'login' || currentPage === 'select-nation') {
      setCurrentPage('dashboard');
    }
  }, [state.user, currentPage]);

  const renderPage = () => {
    console.log('Rendering page:', currentPage);
    
    try {
      switch (currentPage) {
        case 'login':
          return <LoginPage />;
        case 'select-nation':
          return <SelectNationPage />;
        case 'dashboard':
          return <DashboardPage />;
        case 'your-plot':
          return <YourPlotPage />;
        case 'map':
          return <MapPage />;
        case 'nation':
          return <NationPage />;
        case 'admin':
          return <AdminPage />;
        default:
          return <DashboardPage />;
      }
    } catch (error) {
      console.error('Error rendering page:', error);
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 flex items-center justify-center">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-400">Please try refreshing the page</p>
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
  };

  if (!state.user || currentPage === 'login' || currentPage === 'select-nation') {
    return renderPage();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;