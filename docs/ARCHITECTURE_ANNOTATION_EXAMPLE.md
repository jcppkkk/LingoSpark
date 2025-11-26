# ARCHITECTURE 註解標記範例

## 程式碼範例

### Dashboard.tsx

```typescript
// @ARCH:START Dashboard - UI: 統計卡片區塊
<div className="grid grid-cols-3 gap-4 mb-8">
  <div className="bg-white p-6 rounded-[2rem] border-2 border-b-8 border-blue-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group hover:-translate-y-1 transition-transform">
    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-[2rem] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
    <span className="text-5xl lg:text-6xl font-black text-primary mb-2 relative z-10">
      {stats.learnedCount}
    </span>
    <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
      已學會
    </span>
  </div>
  <div className="bg-white p-6 rounded-[2rem] border-2 border-b-8 border-red-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group hover:-translate-y-1 transition-transform">
    <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-[2rem] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
    <span className="text-5xl lg:text-6xl font-black text-joy mb-2 relative z-10">
      {stats.dueCards}
    </span>
    <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
      待複習
    </span>
  </div>
  <div className="bg-white p-6 rounded-[2rem] border-2 border-b-8 border-green-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden group hover:-translate-y-1 transition-transform">
    <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-[2rem] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
    <span className="text-5xl lg:text-6xl font-black text-secondary mb-2 relative z-10">
      {stats.totalCards}
    </span>
    <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
      總單字量
    </span>
  </div>
</div>;
// @ARCH:END Dashboard - UI: 統計卡片區塊

{
  /* Main Actions - Grid on desktop */
}
<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
  {/* @ARCH: Dashboard - UI: 開始複習按鈕 */}
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
          {stats.dueCards > 0
            ? `有 ${stats.dueCards} 個單字等著你！`
            : "目前沒有需要複習的單字"}
        </p>
      </div>
      <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm animate-bounce">
        <Icons.Learn size={32} />
      </div>
    </div>
  </button>

  {/* @ARCH: Dashboard - UI: 製作新單字卡按鈕 */}
  <button
    onClick={() => onNavigate(views.ADD_WORD)}
    className="p-8 rounded-[2rem] bg-white border-4 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary hover:bg-indigo-50 transition-all group active:scale-95 flex flex-col items-center justify-center gap-4 h-full min-h-[160px]"
  >
    <div className="p-4 bg-slate-100 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
      <Icons.Add size={32} />
    </div>
    <span className="font-black text-2xl">製作新單字卡</span>
  </button>
</div>;

// @ARCH:START Dashboard - FEAT: 載入學習統計
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
  if (
    hostname.includes("googleusercontent") ||
    hostname.includes("webcontainer") ||
    hostname.includes("replit") ||
    hostname.includes("github.dev")
  ) {
    setIsDynamicOrigin(true);
  }

  return unsub;
}, []);
// @ARCH:END Dashboard - FEAT: 載入學習統計

// @ARCH: Dashboard - UX: 雲端同步流程
const handleManualSync = () => {
  setIgnoreSyncError(false);
  // Trigger MANUAL sync (isManual = true) to allow auth popup
  performSync(true);
};
```

## ARCHITECTURE.md 對應格式

```markdown
### 📊 儀表板 (Dashboard)

**PRD 描述**：顯示學習統計、快速操作入口、雲端同步狀態

**程式碼位置**：

- 組件：`components/Dashboard.tsx` | File Hash: `abc123def456...`

**UI 元素**：

- [UI] 統計卡片區塊

  - 位置：`components/Dashboard.tsx:135-145`
  - Hash: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
  - 功能：顯示總單字量、待複習數量、已學會數量

- [UI] 開始複習按鈕

  - 位置：`components/Dashboard.tsx:149-167`
  - Hash: `q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`
  - 功能：導航到練習模式，顯示待複習數量

- [UI] 製作新單字卡按鈕
  - 位置：`components/Dashboard.tsx:169-177`
  - Hash: `g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8`
  - 功能：導航到新增單字頁面

**關鍵功能**：

- [FEAT] 載入學習統計

  - 位置：`components/Dashboard.tsx:18-36`
  - Hash: `w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3`
  - 功能：非同步載入並顯示學習統計資料

- [UX] 雲端同步流程
  - 位置：`components/Dashboard.tsx:38-42`
  - Hash: `l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8`
  - 功能：手動觸發雲端同步，處理認證流程
```

## 使用流程

1. **添加註解標記**：

   ```bash
   # 在程式碼中添加 @ARCH 註解
   # @ARCH: Dashboard - UI: 統計卡片區塊
   ```

2. **掃描註解**：

   ```bash
   npm run arch:scan
   # 或掃描特定檔案
   npm run arch:scan components/Dashboard.tsx
   ```

3. **檢查 Hash**：

   ```bash
   npm run arch:check
   ```

4. **更新 ARCHITECTURE.md**：
   - 手動更新（或使用自動更新工具）
   - 添加位置和 Hash 資訊

## 簡化格式（建議）

也可以使用更簡潔的格式：

```typescript
// @ARCH: Dashboard.UI.統計卡片
// @ARCH: Dashboard.FEAT.載入統計
// @ARCH: Dashboard.UX.雲端同步
```

這樣更簡潔，也更容易維護。
