# LingoSpark 架構文檔

本文檔描述系統架構、服務層、資料模型等技術層面的資訊。

**功能相關內容請參考**：`docs/features/README.md`

## 應用程式流程

```
App.tsx (路由控制)
├── Dashboard (儀表板)
├── WordLibrary (字庫管理/製作新卡片)
├── LearningMode (兒童學習模式)
│   ├── LearningModeTab (學習模式)
│   ├── BlockModeTab (積木模式)
│   └── DictationModeTab (聽寫模式)
└── ErrorTest (錯誤測試，開發用)
```

**詳細功能描述**：請參考 `docs/features/README.md`

---

## 服務層架構

### AI 服務 (Gemini Service)

**檔案**：`services/geminiService.ts`

**功能**：

- `analyzeWord()` - 分析單字（音節、詞源、例句，適合小三學生）
- `extractWordsFromImage()` - 從圖片提取單字

**使用的 AI 模型**：

- `gemini-2.5-flash` - 文字分析

**注意**：已移除記憶提示和圖像生成相關功能（兒童學習模式不需要）

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

### 分組服務 (Level Service)

**檔案**：`services/levelService.ts`

**功能**：

- `groupCardsByLevel()` - 將單字卡分組為不同的 Level
- `getLevelForCard()` - 根據索引計算單字卡屬於哪個 Level
- `getAllLevels()` - 獲取所有 Level 的資訊
- `getCardsByLevel()` - 獲取指定 Level 的單字卡
- `getTotalLevels()` - 獲取總共有多少個 Level

**用途**：

- 自動將單字以每10個一組進行分級
- 支援 Level 選擇功能
- 用於兒童學習模式的分組學習

---

### 語音服務 (Speech Service)

**檔案**：`services/speechService.ts`

**功能**：

- `loadVoices()` - 載入可用語音列表
- `getAvailableVoices()` - 獲取所有可用語音
- `findDefaultEnglishVoice()` - 尋找預設的英文語音
- `speakWord()` - 播放單字發音
- `stopSpeaking()` - 停止當前播放的語音
- `isSpeechSynthesisSupported()` - 檢查瀏覽器是否支援語音合成

**用途**：

- 使用瀏覽器的 SpeechSynthesis API
- 提供語音選擇功能
- 用於兒童學習模式的語音發音

---

### 音效服務 (Sound Service)

**檔案**：`services/soundService.ts`

**功能**：

- `playCorrectSound()` - 播放答對音效（上升音調）
- `playWrongSound()` - 播放錯誤音效（下降音調）
- `isWebAudioSupported()` - 檢查瀏覽器是否支援 Web Audio API

**用途**：

- 使用 Web Audio API 生成音效
- 在答題正確時提供音效反饋
- 用於兒童學習模式的聽寫和積木模式

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
- Version 3: 移除記憶提示和圖像相關欄位（兒童學習模式）

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
  // 間隔重複學習資料
  interval: number;
  repetition: number;
  efactor: number;
  nextReviewDate: number;
  // 同步元資料
  updatedAt: number;
  isDeleted?: boolean;
  // 遷移與狀態
  dataVersion?: number;
  status?: CardStatus;
}
```

### WordAnalysis

```typescript
{
  word: string;
  definition: string;        // 繁體中文定義（適合小三學生）
  ipa: string;              // IPA 音標
  syllables: string[];      // 音節拆解
  stressIndex: number;      // 重音位置
  roots: Array<{            // 詞源分析
    part: string;
    meaning: string;
    type: 'prefix' | 'root' | 'suffix';
  }>;
  sentence: string;         // 例句（適合小三學生）
  sentenceTranslation: string;
}
```

### LearningMode

```typescript
enum LearningMode {
  LEARNING = 'learning',    // 學習模式
  BLOCK = 'block',          // 積木模式
  DICTATION = 'dictation'   // 聽寫模式
}
```

### LearningLevel

```typescript
{
  level: number;            // Level 編號 (1, 2, 3...)
  cards: Flashcard[];       // 該 Level 的單字卡
}
```

---

**常見任務與對應檔案**：請參考 `docs/features/README.md`

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

**瀏覽器歷史記錄整合**：
- 使用 URL hash 來表示當前視圖（例如：`#/dashboard`）
- 整合 `history.pushState` 和 `popstate` 事件，支援瀏覽器前進/後退按鈕
- 導航函數 `navigate()` 會同時更新應用狀態和瀏覽器歷史記錄
- 支援直接訪問帶有 hash 的 URL，會自動載入對應視圖

---

## 常數與設定

**檔案**：`constants.ts`

包含：

- Google Drive Client ID
- 圖示定義 (Icons)
- 功能開關 (ENABLE_ERROR_TEST)

---

## 更新指南

當新增服務或修改資料模型時，請更新此文件：

1. 在「服務層架構」區段新增或更新服務描述
2. 在「資料模型」區段更新型別定義
3. 標註所有相關的程式碼檔案
4. 說明技術實現細節

**功能相關更新**：請更新 `docs/features/README.md`

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

使用以下命令檢查架構文檔是否與程式碼同步：

```bash
npm run check-architecture
```

**檢查內容**：

- 掃描 `components/` 和 `services/` 目錄下的所有檔案
- 檢查 `ARCHITECTURE.md` 和 `docs/features/README.md` 是否同步
- 檢查是否有未記錄的檔案和函數

**輸出說明**：

- ✅ 綠色：文檔已同步
- ⚠️ 黃色：發現未記錄的項目，需要更新文檔

**文檔分工**：

- `ARCHITECTURE.md` - 服務層架構、資料模型、技術細節
- `docs/features/README.md` - 功能描述、UI 元素、使用者流程

### 維護流程

1. **開發時**：AI Agent 會根據規則自動檢查並更新兩個文檔
2. **提交前**：執行 `npm run check-architecture` 確認同步
3. **Code Review**：確認 `ARCHITECTURE.md` 和 `docs/features/README.md` 已更新

---

## 版本歷史

- 2025-01-XX：建立初始架構文檔
- 2025-01-XX：新增自動維護機制與檢查工具
