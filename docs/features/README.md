# LingoSpark 功能文檔

本文檔是 LingoSpark 應用程式功能文檔的主索引文件。所有功能詳細描述已按功能模組切分到 `docs/features/` 目錄下的獨立檔案中，每個檔案包含完整的功能介紹、UX 路徑（編號格式：UX0001, UX0002...）、程式碼位置和 UI 元素資訊。

## 文檔結構

本文檔採用模組化結構，每個功能模組都有獨立的文檔檔案，便於維護和查找。每個功能模組文檔包含：

- **功能介紹**：描述該功能模組涵蓋的完整範圍
- **UX 路徑**：詳細的使用者體驗路徑，包含觸發條件、操作步驟和預期結果
- **程式碼位置**：相關的程式碼檔案和函數位置
- **UI 元素**：使用者介面元素的詳細描述
- **關鍵功能**：核心功能的說明

## 功能模組列表

### 📊 [儀表板 (Dashboard)](dashboard.md)

顯示學習統計、快速操作入口、雲端同步狀態。

**UX 路徑編號**：UX0001 - UX0004

**主要功能**：

- 查看學習統計
- 開始複習挑戰
- 導航到字庫管理
- 手動觸發雲端同步

---

### ➕ [字庫管理與製作新卡片 (Word Library)](word-library.md)

字庫管理、製作新卡片、手動輸入、圖片識別、AI 分析、預覽選擇。

**UX 路徑編號**：UX0005 - UX0015

**主要功能**：

- 字庫管理（搜尋、篩選、排序、查看、刪除）
- 製作新卡片（手動輸入、圖片識別）
- AI 分析單字
- 預覽和儲存單字卡

---

### 🎓 [兒童學習模式 (Learning Mode)](learning-mode.md)

適合小三學生的三種學習模式（學習、積木、聽寫），包含分組學習、語音發音、彩色單字標示。

**UX 路徑編號**：UX0016 - UX0028

**主要功能**：

- Level 選擇和語音配置
- 學習模式（大單字卡、顏色標示、音節拆解）
- 積木模式（字母重組）
- 聽寫模式（鍵盤輸入）

---

### 🎴 [單字卡組件 (Flashcard Component)](flashcard.md)

可翻轉的單字卡，顯示單字資訊（簡化版，已移除記憶提示功能）。

**UX 路徑編號**：UX0029 - UX0031

**主要功能**：

- 單字卡翻轉動畫
- 顯示單字分析資訊
- 狀態顯示

---

### 🧪 [錯誤測試 (Error Test)](error-test.md)

開發用工具，用於測試錯誤處理與 Sentry 整合。

**UX 路徑編號**：UX0032 - UX0033

**主要功能**：

- 測試錯誤捕獲
- 驗證 Sentry 整合

**注意**：此功能僅在開發環境啟用（由 `constants.ts` 中的 `ENABLE_ERROR_TEST` 控制）

---

## 常見任務與對應檔案

### 修改儀表板統計顯示

→ `components/Dashboard.tsx` + `services/storageService.ts` (getStats)

### 調整 AI 分析提示詞

→ `services/geminiService.ts` (analyzeWord)

### 修改單字卡樣式

→ `components/FlashcardComponent.tsx`

### 調整間隔重複演算法

→ `services/storageService.ts` (processReview)

### 新增單字輸入方式

→ `components/WordLibrary.tsx`

### 修改雲端同步邏輯

→ `services/syncService.ts` + `services/driveService.ts`

### 調整學習模式流程

→ `components/LearningMode.tsx` + `components/LearningModeTab.tsx` + `components/BlockModeTab.tsx` + `components/DictationModeTab.tsx`

### 調整分組邏輯

→ `services/levelService.ts`

### 調整語音發音

→ `services/speechService.ts`

### 新增字庫管理功能

→ `components/WordLibrary.tsx`

### 修改排序或篩選邏輯

→ `components/WordLibrary.tsx`

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

**瀏覽器歷史記錄**：路由已整合瀏覽器歷史記錄 API，支援瀏覽器的前進/後退按鈕導航。URL hash 對應關係：

- `#/dashboard` → DASHBOARD
- `#/add-word` → ADD_WORD
- `#/practice` → PRACTICE
- `#/card-details` → CARD_DETAILS
- `#/error-test` → ERROR_TEST

---

## 更新指南

當新增功能或修改現有功能時，請更新對應的功能模組文檔：

1. 在對應的功能模組文檔（`docs/features/` 目錄下）新增或更新描述
2. 新增或更新 UX 路徑（使用連續的編號，例如：UX0034, UX0035...）
3. 列出相關的 UI 元素
4. 標註所有相關的程式碼檔案
5. 說明關鍵功能點
6. 更新「常見任務與對應檔案」區段（如適用）

---

## 自動維護機制

### 維護規則

AI Agent 會根據 `.cursor/rules/architecture-maintenance.mdc` 中的規則自動檢查並更新功能文檔。

**觸發更新的情況**：

- ✅ 新增組件或頁面
- ✅ 新增或修改服務
- ✅ 修改資料模型
- ✅ 新增功能或修改現有功能
- ✅ 修改路由或導航

詳細規則請參考：`.cursor/rules/architecture-maintenance.mdc`

### 檢查工具

使用以下命令檢查功能文檔是否與程式碼同步：

```bash
npm run check-architecture
```

**檢查內容**：

- 掃描 `components/` 和 `services/` 目錄下的所有檔案
- 檢查是否有未記錄的功能
- 檢查是否有未記錄的公開函數

**輸出說明**：

- ✅ 綠色：文檔已同步
- ⚠️ 黃色：發現未記錄的項目，需要更新文檔

### 維護流程

1. **開發時**：AI Agent 會根據規則自動檢查並更新
2. **提交前**：執行 `npm run check-architecture` 確認同步
3. **Code Review**：確認功能文檔已更新

---

## 版本歷史

- 2025-01-XX：從 ARCHITECTURE.md 萃取功能文檔
- 2025-01-XX：新增自動維護機制與檢查工具
- 2025-01-XX：按功能模組切分文檔，新增 UX 路徑編號系統
- 2025-01-XX：將主索引文件移至 `docs/features/README.md`

