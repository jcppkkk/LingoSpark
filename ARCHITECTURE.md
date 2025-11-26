# LingoSpark 架構與功能映射

本文檔描述 PRD/UX/UI 功能與程式碼的對應關係，幫助 AI agent 快速定位需要處理的區域。

## 應用程式流程

```
App.tsx (路由控制)
├── Dashboard (儀表板)
├── WordLibrary (新增單字/單字庫)
├── PracticeMode (練習模式)
└── ErrorTest (錯誤測試，開發用)
```

## 功能模組映射

### 📊 儀表板 (Dashboard)

**PRD 描述**：顯示學習統計、快速操作入口、雲端同步狀態

**程式碼位置**：

- 組件：`components/Dashboard.tsx` | File Hash: `4823728854a2491b3a69d9c31784d423`
- 資料服務：`services/storageService.ts` (getStats)
- 同步服務：`services/syncService.ts` (performSync, subscribeToSyncStatus)
- 型別定義：`types.ts` (LearningStats, SyncStatus)

**UI 元素**：

- [UI] 統計卡片區塊
  - 位置：`components/Dashboard.tsx:139-152`
  - Hash: `3dce930bf36bdbd765f77165417591af`
  - 功能：顯示總單字量、待複習數量

- [UI] 開始複習按鈕
  - 位置：`components/Dashboard.tsx:156-176`
  - Hash: `8a19de2cc7bec5848442eb8a29cde840`
  - 功能：導航到練習模式，顯示待複習數量

- [UI] 製作新單字卡按鈕
  - 位置：`components/Dashboard.tsx:178-188`
  - Hash: `514b18b7428f73845286a2af7e4e556f`
  - 功能：導航到新增單字頁面

- [UI] 雲端同步按鈕
  - 位置：`components/Dashboard.tsx:68-83`
  - Hash: `ef211a3e365b6a369474436e4f35f9e7`
  - 功能：手動觸發雲端同步，顯示同步狀態

**關鍵功能**：

- [FEAT] 載入學習統計
  - 位置：`components/Dashboard.tsx:18-38`
  - Hash: `5e6a45b5c6b61234d242ecc0e7bc650f`
  - 功能：非同步載入並顯示學習統計資料

- [UX] 雲端同步流程
  - 位置：`components/Dashboard.tsx:40-45`
  - Hash: `0641b30b62ff00194a4e67603506c64c`
  - 功能：手動觸發雲端同步，處理認證流程

---

### ➕ 新增單字 (Add Word / Word Library)

**PRD 描述**：手動輸入、批次匯入、圖片識別、AI 分析、預覽選擇

**UI 元素**：

- 輸入方式選擇：手動輸入、批次匯入、圖片上傳
- 單字列表與編輯
- AI 分析進度顯示
- 單字卡預覽與記憶圖像選擇

**程式碼位置**：

- 主組件：`components/WordLibrary.tsx`
- 舊版組件：`components/AddWord.tsx`（已棄用，保留供參考）
- 單字卡組件：`components/FlashcardComponent.tsx`
- AI 服務：`services/geminiService.ts`
  - `analyzeWord()` - 分析單字
  - `extractWordsFromImage()` - 從圖片提取單字
  - `generateMnemonicOptions()` - 生成記憶選項
  - `generateMnemonicImage()` - 生成記憶圖像
- 儲存服務：`services/storageService.ts` (saveCard, createNewCard, checkWordExists)
- 型別定義：`types.ts` (WordAnalysis, Flashcard, MnemonicOption)

**關鍵功能**：

- 單字輸入與驗證
- 圖片上傳與識別
- AI 分析（音節、詞源、記憶提示）
- 記憶圖像生成與選擇
- 單字卡儲存

---

### 📚 練習模式 (Practice Mode)

**PRD 描述**：間隔重複學習、互動式單字卡、記憶程度評分

**UI 元素**：

- 單字卡翻轉動畫
- 進度指示器
- 記憶評分按鈕（1-5 分）
- 完成統計

**程式碼位置**：

- 組件：`components/PracticeMode.tsx`
- 單字卡組件：`components/FlashcardComponent.tsx`
- 儲存服務：`services/storageService.ts`
  - `getCards()` - 取得待複習單字
  - `processReview()` - 處理複習結果（SuperMemo-2 演算法）
  - `saveCard()` - 儲存更新後的單字卡
- 型別定義：`types.ts` (Flashcard)

**關鍵功能**：

- 載入待複習單字（根據 nextReviewDate）
- 單字卡翻轉互動
- 記憶評分與演算法計算
- 更新複習間隔與下次複習時間

---

### 🎴 單字卡組件 (Flashcard Component)

**PRD 描述**：可翻轉的單字卡，顯示單字資訊與記憶圖像

**UI 元素**：

- 正面：單字、IPA、音節標示
- 背面：定義、例句、詞源分析、記憶提示、圖像
- 翻轉動畫
- 記憶圖像切換與重新生成

**程式碼位置**：

- 組件：`components/FlashcardComponent.tsx`
- AI 服務：`services/geminiService.ts`
  - `generateMnemonicOptions()` - 生成替代記憶選項
  - `generateAlternativeStyleImage()` - 生成不同風格的圖像
- 型別定義：`types.ts` (Flashcard, WordAnalysis, CardStatus)

**關鍵功能**：

- 單字卡翻轉動畫
- 顯示單字分析資訊
- 記憶圖像顯示與切換
- 重新生成記憶圖像（不同風格）

---

### 🧪 錯誤測試 (Error Test)

**PRD 描述**：開發用工具，用於測試錯誤處理與 Sentry 整合

**UI 元素**：

- 錯誤觸發按鈕
- Sentry 測試功能

**程式碼位置**：

- 組件：`components/ErrorTest.tsx`
- 路由：`App.tsx` (僅在 `ENABLE_ERROR_TEST` 啟用時顯示)

**關鍵功能**：

- 測試錯誤捕獲
- 驗證 Sentry 整合
- 開發環境專用

**注意**：此功能僅在開發環境啟用（由 `constants.ts` 中的 `ENABLE_ERROR_TEST` 控制）

---

## 服務層架構

### AI 服務 (Gemini Service)

**檔案**：`services/geminiService.ts`

**功能**：

- `analyzeWord()` - 分析單字（音節、詞源、記憶提示）
- `generateMnemonicOptions()` - 生成多個記憶選項
- `generateMnemonicImage()` - 生成記憶圖像
- `generateAlternativeStyleImage()` - 生成不同風格的圖像
- `generateAlternativeStyleOptions()` - 生成不同風格的記憶選項
- `extractWordsFromImage()` - 從圖片提取單字

**使用的 AI 模型**：

- `gemini-2.5-flash` - 文字分析
- `gemini-2.5-flash-image` - 圖像生成

---

### 儲存服務 (Storage Service)

**檔案**：`services/storageService.ts`

**功能**：

- `getCards()` - 取得所有單字卡（自動執行資料遷移）
- `saveCard()` - 儲存/更新單字卡
- `deleteCard()` - 刪除單字卡
- `getStats()` - 取得學習統計
- `processReview()` - 處理複習（SuperMemo-2 演算法）
- `createNewCard()` - 建立新的單字卡
- `checkWordExists()` - 檢查單字是否已存在

**資料庫**：IndexedDB (`services/db.ts`)

**依賴**：

- 資料遷移服務 (`services/migrationService.ts`)

---

### 同步服務 (Sync Service)

**檔案**：`services/syncService.ts`

**功能**：

- `initSync()` - 初始化同步服務
- `performSync()` - 執行雲端同步
- `subscribeToSyncStatus()` - 訂閱同步狀態

**依賴**：

- Google Drive API (`services/driveService.ts`)
- 網路狀態監聽

---

### Google Drive 服務 (Drive Service)

**檔案**：`services/driveService.ts`

**功能**：

- `initGoogleDrive()` - 初始化 Google Drive API
- `authenticate()` - 執行 Google OAuth 認證
- `setTokenManually()` - 手動設定認證 token（開發用）
- 其他 Drive API 封裝函數

**用途**：

- 處理 Google Drive 認證
- 上傳/下載單字卡資料
- 雲端備份與同步

**注意**：內部實現函數（如 `initGoogleDrive`, `authenticate`）主要供 `syncService` 使用

---

---

### 資料遷移服務 (Migration Service)

**檔案**：`services/migrationService.ts`

**功能**：

- `getCurrentDataVersion()` - 取得當前資料版本
- `getCardDataVersion()` - 取得單字卡的資料版本
- `migrateCard()` - 遷移單張單字卡到最新版本
- `migrateCards()` - 遷移多張單字卡

**用途**：

- 自動遷移舊版資料結構到新版本
- 確保資料相容性
- 在載入單字卡時自動執行遷移

**遷移歷史**：

- Version 1: 初始版本
- Version 2: 新增英文單字註解格式到記憶提示

---

### 資料庫服務 (Database Service)

**檔案**：`services/db.ts`

**功能**：

- `initDB()` - 初始化 IndexedDB 資料庫
- 提供 `dbOps` 物件，包含所有資料庫操作

**用途**：

- IndexedDB 的封裝層
- 提供單字卡的 CRUD 操作
- 被 `storageService.ts` 使用

---

## 資料模型

### Flashcard

```typescript
{
  id: string;
  word: string;
  data: WordAnalysis;  // AI 分析結果
  imageUrl?: string;   // 記憶圖像（Base64）
  imagePrompt?: string; // 圖像生成提示
  // 間隔重複學習資料
  interval: number;
  repetition: number;
  efactor: number;
  nextReviewDate: number;
  // 同步元資料
  updatedAt: number;
  isDeleted?: boolean;
}
```

### WordAnalysis

```typescript
{
  word: string;
  definition: string;        // 繁體中文定義
  ipa: string;              // IPA 音標
  syllables: string[];      // 音節拆解
  stressIndex: number;      // 重音位置
  roots: Array<{            // 詞源分析
    part: string;
    meaning: string;
    type: 'prefix' | 'root' | 'suffix';
  }>;
  sentence: string;         // 例句
  sentenceTranslation: string;
  mnemonicHint: string;     // 記憶提示
  imagePrompt?: string;     // 圖像生成提示
}
```

---

## 常見任務與對應檔案

### 修改儀表板統計顯示

→ `components/Dashboard.tsx` + `services/storageService.ts` (getStats)

### 調整 AI 分析提示詞

→ `services/geminiService.ts` (analyzeWord, generateMnemonicOptions)

### 修改單字卡樣式

→ `components/FlashcardComponent.tsx`

### 調整間隔重複演算法

→ `services/storageService.ts` (processReview)

### 新增單字輸入方式

→ `components/WordLibrary.tsx`

### 修改雲端同步邏輯

→ `services/syncService.ts` + `services/driveService.ts`

### 調整練習模式流程

→ `components/PracticeMode.tsx`

---

## 路由與視圖

**定義位置**：`types.ts` (AppView enum)

```typescript
enum AppView {
  DASHBOARD = "DASHBOARD",
  ADD_WORD = "ADD_WORD",
  PRACTICE = "PRACTICE",
  CARD_DETAILS = "CARD_DETAILS",
  ERROR_TEST = "ERROR_TEST",
}
```

**路由控制**：`App.tsx` (renderView 方法)

---

## 常數與設定

**檔案**：`constants.ts`

包含：

- Google Drive Client ID
- 圖示定義 (Icons)
- 功能開關 (ENABLE_ERROR_TEST)

---

## 更新指南

當新增功能或修改現有功能時，請更新此文件：

1. 在對應的功能模組下新增描述
2. 列出相關的 UI 元素
3. 標註所有相關的程式碼檔案
4. 說明關鍵功能點

---

## 自動維護機制

### 維護規則

AI Agent 會根據 `.cursor/rules/architecture-maintenance.mdc` 中的規則自動檢查並更新此文件。

**觸發更新的情況**：

- ✅ 新增組件或頁面
- ✅ 新增或修改服務
- ✅ 修改資料模型
- ✅ 新增功能或修改現有功能
- ✅ 修改路由或導航

詳細規則請參考：`.cursor/rules/architecture-maintenance.mdc`

### 檢查工具

使用以下命令檢查 `ARCHITECTURE.md` 是否與程式碼同步：

```bash
npm run check-architecture
```

或直接執行：

```bash
node scripts/check-architecture.js
```

**檢查內容**：

- 掃描 `components/` 和 `services/` 目錄下的所有檔案
- 檢查是否有未記錄的檔案
- 檢查是否有未記錄的公開函數

**輸出說明**：

- ✅ 綠色：文檔已同步
- ⚠️ 黃色：發現未記錄的項目，需要更新文檔

### 維護流程

1. **開發時**：AI Agent 會根據規則自動檢查並更新
2. **提交前**：執行 `npm run check-architecture` 確認同步
3. **Code Review**：確認 `ARCHITECTURE.md` 已更新

---

## 版本歷史

- 2025-01-XX：建立初始架構文檔
- 2025-01-XX：新增自動維護機制與檢查工具
