import React, { useEffect, useState } from 'react';
import { Icons, GOOGLE_DRIVE_CLIENT_ID } from '../constants';
import { getStats } from '../services/storageService';
import { LearningStats, SyncStatus } from '../types';
import { performSync, subscribeToSyncStatus } from '../services/syncService';

interface DashboardProps {
  onNavigate: (view: any) => void;
  views: any;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, views }) => {
  const [stats, setStats] = useState<LearningStats>({ totalCards: 0, dueCards: 0, learnedCount: 0 });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isSyncing: false, lastSyncedAt: null, error: null });
  const [ignoreSyncError, setIgnoreSyncError] = useState(false);
  const [isDynamicOrigin, setIsDynamicOrigin] = useState(false);

  useEffect(() => {
    // Load stats async
    const loadStats = async () => {
      const s = await getStats();
      setStats(s);
    };
    loadStats();

    // Subscribe to sync status
    const unsub = subscribeToSyncStatus(setSyncStatus);

    // Detect dynamic cloud environments
    const hostname = window.location.hostname;
    if (hostname.includes('googleusercontent') || hostname.includes('webcontainer') || hostname.includes('replit') || hostname.includes('github.dev')) {
        setIsDynamicOrigin(true);
    }

    return unsub;
  }, []);

  const handleManualSync = () => {
      setIgnoreSyncError(false);
      // Trigger MANUAL sync (isManual = true) to allow auth popup
      performSync(true);
  };

  const copyOrigin = () => {
      navigator.clipboard.writeText(window.location.origin);
      alert("網址已複製！請前往 Google Cloud Console > APIs & Services > Credentials > Authorized JavaScript origins 貼上。");
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500 bg-gradient-to-b from-transparent to-white/50">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-10 mt-4">
        <div className="flex items-center gap-4">
            <div className="p-4 bg-primary text-white rounded-[1.5rem] shadow-xl transform -rotate-6 border-4 border-white/50">
            <Icons.Flash size={32} />
            </div>
            <div>
            <h1 className="text-3xl font-black text-dark tracking-tight">魔法單字卡</h1>
            <p className="text-base text-slate-500 font-bold">LingoSpark</p>
            </div>
        </div>

        {/* Sync Status / Button */}
        {!GOOGLE_DRIVE_CLIENT_ID.includes("YOUR") && (
            <button 
                onClick={handleManualSync}
                disabled={syncStatus.isSyncing}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm border-2 transition-all
                    ${syncStatus.error ? 'bg-red-50 text-red-500 border-red-200' : 
                      syncStatus.isSyncing ? 'bg-sky-50 text-sky-500 border-sky-200' :
                      'bg-white text-slate-400 border-slate-200 hover:border-primary hover:text-primary'}
                `}
            >
                <Icons.Sync size={16} className={syncStatus.isSyncing ? "animate-spin" : ""} />
                {syncStatus.isSyncing ? "備份中..." : syncStatus.error ? "備份失敗" : "雲端備份"}
            </button>
        )}
      </div>

      {/* Sync Error Alert (Dismissible) */}
      {syncStatus.error && !ignoreSyncError && (
        <div className="mb-6 bg-red-50 border-2 border-red-100 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
                <Icons.Flash className="text-red-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                    <h3 className="font-bold text-red-600">雲端備份設定錯誤</h3>
                    <p className="text-sm text-red-500 mt-1 mb-2">
                        {isDynamicOrigin 
                            ? "偵測到您正在使用變動的雲端開發網址。Google 安全政策不支援浮動網域，您需要將當前的網址加入白名單。" 
                            : "請檢查 Google Cloud Console 的 Authorized JavaScript origins 設定。"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={copyOrigin}
                            className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-100"
                        >
                            複製當前網址: {window.location.origin}
                        </button>
                        <button 
                            onClick={() => setIgnoreSyncError(true)}
                            className="text-xs bg-red-100 border border-transparent text-red-600 px-3 py-1.5 rounded-lg font-bold hover:bg-red-200"
                        >
                            暫時略過 (離線使用)
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Developer Setup Guide (Only shows if Client ID is missing) */}
      {GOOGLE_DRIVE_CLIENT_ID.includes("YOUR") && (
          <div className="mb-6 bg-amber-50 border-2 border-amber-100 rounded-2xl p-4">
              <h3 className="font-bold text-amber-600 flex items-center gap-2">
                  <Icons.Learn size={20}/> 開發者設定指南
              </h3>
              <p className="text-sm text-amber-700 mt-2">
                  要啟用雲端備份，請在 <code>constants.ts</code> 設定 <code>GOOGLE_DRIVE_CLIENT_ID</code>。
              </p>
              <div className="mt-3 bg-white/50 p-2 rounded-lg text-xs font-mono text-amber-800 break-all">
                  目前網址 (Authorized Origin): <span className="font-bold select-all">{window.location.origin}</span>
              </div>
          </div>
      )}

      {/* Stats Cards - Gamified */}
      <div className="grid grid-cols-2 gap-4 lg:gap-8 mb-8 lg:mb-12">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-b-8 border-red-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-[2rem] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <span className="text-5xl lg:text-6xl font-black text-joy mb-2 relative z-10">{stats.dueCards}</span>
          <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">待複習</span>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-b-8 border-green-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-[2rem] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <span className="text-5xl lg:text-6xl font-black text-secondary mb-2 relative z-10">{stats.totalCards}</span>
          <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">總單字量</span>
        </div>
      </div>

      {/* Main Actions - Grid on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <button 
          onClick={() => onNavigate(views.PRACTICE)}
          disabled={stats.dueCards === 0}
          className="relative overflow-hidden group p-8 rounded-[2rem] bg-gradient-to-r from-primary to-indigo-500 text-white shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed border-4 border-transparent hover:border-white/20 flex flex-col justify-between h-full min-h-[160px]"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:translate-x-5 transition-transform"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="text-left">
              <h3 className="text-2xl font-black mb-2">開始複習挑戰</h3>
              <p className="text-indigo-100 font-medium">
                {stats.dueCards > 0 ? `有 ${stats.dueCards} 個單字等著你！` : "目前沒有需要複習的單字"}
              </p>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm animate-bounce">
              <Icons.Learn size={32} />
            </div>
          </div>
        </button>

        <button 
          onClick={() => onNavigate(views.ADD_WORD)}
          className="p-8 rounded-[2rem] bg-white border-4 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary hover:bg-indigo-50 transition-all group active:scale-95 flex flex-col items-center justify-center gap-4 h-full min-h-[160px]"
        >
          <div className="p-4 bg-slate-100 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
            <Icons.Add size={32} />
          </div>
          <span className="font-black text-2xl">製作新單字卡</span>
        </button>
      </div>

      {/* Feature Icons - Decorative footer */}
      <div className="mt-auto pt-10 pb-4">
        <div className="flex justify-center gap-8 lg:gap-12 text-xs lg:text-sm font-bold text-slate-400 opacity-60">
          <div className="flex flex-col items-center gap-2">
            <Icons.Image size={24} />
            <span>圖像記憶</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icons.Search size={24} />
            <span>字根拆解</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icons.Audio size={24} />
            <span>自然發音</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;