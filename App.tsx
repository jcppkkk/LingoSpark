import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import Dashboard from './components/Dashboard';
import AddWord from './components/AddWord';
import WordLibrary from './components/WordLibrary';
import PracticeMode from './components/PracticeMode';
import { ENABLE_ERROR_TEST } from './constants';
import { initSync } from './services/syncService';
import ErrorTest from './components/ErrorTest';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  useEffect(() => {
    // Initialize Sync Service (Drive API & Network Listeners)
    initSync();
  }, []);

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard onNavigate={setCurrentView} views={AppView} />;
      case AppView.ADD_WORD:
        return (
          <WordLibrary 
            onCancel={() => setCurrentView(AppView.DASHBOARD)}
            onSuccess={() => setCurrentView(AppView.DASHBOARD)}
          />
        );
      case AppView.PRACTICE:
        return (
          <PracticeMode 
            onFinish={() => setCurrentView(AppView.DASHBOARD)}
          />
        );
      case AppView.ERROR_TEST:
        if (!ENABLE_ERROR_TEST) {
          // Redirect to dashboard if error test is disabled
          return <Dashboard onNavigate={setCurrentView} views={AppView} />;
        }
        return (
          <ErrorTest 
            onBack={() => setCurrentView(AppView.DASHBOARD)}
          />
        );
      default:
        return <Dashboard onNavigate={setCurrentView} views={AppView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-primary/20">
      <main className="h-screen w-full overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default App;