import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import Dashboard from './components/Dashboard';
import WordLibrary from './components/WordLibrary';
import LearningMode from './components/LearningMode';
import { initSync } from './services/syncService';

// 視圖到 URL hash 的映射
const VIEW_TO_HASH: Record<AppView, string> = {
  [AppView.DASHBOARD]: '/dashboard',
  [AppView.ADD_WORD]: '/add-word',
  [AppView.PRACTICE]: '/practice',
  [AppView.CARD_DETAILS]: '/card-details',
};

// URL hash 到視圖的映射
const HASH_TO_VIEW: Record<string, AppView> = {
  '/dashboard': AppView.DASHBOARD,
  '/add-word': AppView.ADD_WORD,
  '/practice': AppView.PRACTICE,
  '/card-details': AppView.CARD_DETAILS,
};

// 從 URL hash 獲取視圖
const getViewFromHash = (): AppView => {
  const hash = window.location.hash.slice(1) || '/dashboard';
  return HASH_TO_VIEW[hash] || AppView.DASHBOARD;
};

// 更新 URL hash（不觸發歷史記錄）
const updateHash = (view: AppView) => {
  const hash = VIEW_TO_HASH[view];
  window.history.replaceState({ view }, '', `#${hash}`);
};

// 推送新的歷史記錄
const pushHistory = (view: AppView) => {
  const hash = VIEW_TO_HASH[view];
  window.history.pushState({ view }, '', `#${hash}`);
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(() => getViewFromHash());

  // @ARCH:START App - FEAT: 初始化同步服務與瀏覽器歷史記錄
  useEffect(() => {
    // Initialize Sync Service (Drive API & Network Listeners)
    initSync();

    // 初始化 URL hash（如果沒有則設置為當前視圖）
    const initialView = getViewFromHash();
    if (!window.location.hash) {
      updateHash(initialView);
    }

    // 監聽瀏覽器前進/後退按鈕
    const handlePopState = (event: PopStateEvent) => {
      // 當使用 pushState 時，event.state 會包含我們設置的 view
      // 當使用瀏覽器按鈕時，event.state 可能為 null，需要從 URL 讀取
      const view = event.state?.view || getViewFromHash();
      setCurrentView(view);
    };

    // 監聽 hashchange（處理直接修改 URL hash 的情況）
    const handleHashChange = () => {
      // 處理用戶直接修改 URL 的情況
      const view = getViewFromHash();
      setCurrentView(view);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
  // @ARCH:END App - FEAT: 初始化同步服務與瀏覽器歷史記錄

  // @ARCH: App - FEAT: 導航函數（整合瀏覽器歷史記錄）
  const navigate = React.useCallback((view: AppView) => {
    setCurrentView(prevView => {
      // 如果視圖沒有改變，不更新
      if (prevView === view) {
        return prevView;
      }
      // 更新歷史記錄
      pushHistory(view);
      return view;
    });
  }, []);

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard onNavigate={navigate} views={AppView} />;
      case AppView.ADD_WORD:
        return (
          <WordLibrary 
            onCancel={() => navigate(AppView.DASHBOARD)}
            onSuccess={() => navigate(AppView.DASHBOARD)}
          />
        );
      case AppView.PRACTICE:
        return (
          <LearningMode 
            onFinish={() => navigate(AppView.DASHBOARD)}
          />
        );
      default:
        return <Dashboard onNavigate={navigate} views={AppView} />;
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