# 測試說明

本專案使用 **Vitest** 作為測試框架，這是目前最流行的 Vite 原生測試框架。

## 測試框架

- **Vitest** - 快速、現代化的測試框架
- **@testing-library/react** - React 組件測試工具
- **@testing-library/jest-dom** - 額外的 DOM 斷言
- **fake-indexeddb** - IndexedDB 模擬（用於測試資料庫功能）

## 執行測試

```bash
# 執行所有測試（監聽模式）
npm test

# 執行所有測試（單次運行）
npm run test:run

# 開啟測試 UI（視覺化界面）
npm run test:ui

# 執行測試並生成覆蓋率報告
npm run test:coverage
```

## 測試檔案結構

```
tests/
├── setup.ts              # 測試環境設定
├── db-upgrade.test.ts    # 資料庫升級測試
├── ux/                   # UX 路徑測試
│   ├── UX0001.test.tsx  # Dashboard - 查看學習統計
│   ├── UX0002.test.tsx  # Dashboard - 開始複習挑戰
│   └── ...              # 其他 UX 路徑測試
├── utils/                # 測試工具函數
│   ├── test-helpers.tsx        # 基礎測試輔助函數
│   ├── navigation-helpers.tsx # 導航測試輔助
│   ├── form-helpers.tsx       # 表單測試輔助
│   ├── button-helpers.tsx     # 按鈕測試輔助
│   ├── list-helpers.tsx       # 列表操作測試輔助
│   ├── card-helpers.tsx       # 卡片翻轉測試輔助
│   └── answer-helpers.tsx     # 答案檢查測試輔助
├── fixtures/             # 測試固定資料
│   ├── flashcards.ts     # Flashcard mock 資料
│   └── word-analysis.ts # WordAnalysis mock 資料
└── README.md             # 本文件
```

## 資料庫升級測試

`db-upgrade.test.ts` 包含以下測試案例：

1. **應該在首次創建時建立 object stores**

   - 驗證資料庫初始化時正確創建 object stores

2. **應該在版本升級時保留現有資料**

   - 驗證當資料庫版本升級時，現有資料不會遺失

3. **應該在多次版本升級時保留所有資料**

   - 驗證多次版本升級後，所有資料都完整保留

4. **應該正確處理 initDB 函數**

   - 驗證 `initDB` 函數正常工作

5. **應該能夠保存和讀取卡片資料**
   - 驗證資料的保存和讀取功能正常

## 測試重點

這些測試特別關注：

- ✅ 資料庫版本升級時資料保留
- ✅ Object store 創建邏輯
- ✅ 資料持久化
- ✅ 資料完整性

## UX 路徑測試

### 測試對應規則

每個 UX 路徑（格式：UX####）都必須有對應的測試檔案：

- 測試檔案命名：`tests/ux/UX####.test.tsx`
- 測試必須包含：觸發條件、操作步驟、預期結果的驗證
- 使用共用測試元件（符合 DRY & KISS 原則）

### 檢查工具

```bash
# 檢查 UX-測試 對應
npm run ux:test:check

# 檢查並自動生成缺失的測試模板
npm run ux:test:check:fix

# 列出所有 UX 路徑及其測試狀態
npm run ux:test:list
```

### 共用測試元件

測試應使用 `tests/utils/` 目錄下的共用元件：

- **test-helpers.tsx** - 基礎測試輔助函數（renderWithProviders, mockStorageService 等）
- **navigation-helpers.tsx** - 導航測試（UX0002, UX0003, UX0005）
- **form-helpers.tsx** - 表單輸入測試（UX0011, UX0027）
- **button-helpers.tsx** - 按鈕點擊測試（UX0004, UX0020, UX0023, UX0026）
- **list-helpers.tsx** - 列表操作測試（UX0006, UX0007, UX0008）
- **card-helpers.tsx** - 卡片翻轉測試（UX0030, UX0021）
- **answer-helpers.tsx** - 答案檢查測試（UX0025, UX0028）

### 測試實作指南

1. **使用測試模板生成器**：
   ```bash
   node scripts/ux-test-generator.js UX0001
   node scripts/ux-test-generator.js --all
   ```

2. **測試結構範例**：
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { renderWithProviders } from '../utils/test-helpers';
   import { testNavigation } from '../utils/navigation-helpers';
   
   describe('UX0001: 查看學習統計', () => {
     it('應該在頁面載入時顯示學習統計', async () => {
       // 觸發條件：...
       // 操作步驟：...
       // 預期結果：...
     });
   });
   ```

3. **驗證測試**：
   ```bash
   npm run test:run
   ```

詳細的 UX-測試 對應表請參考：`docs/testing/ux-test-mapping.md`

## 持續改進

當需要測試新的功能時：

1. 在 `tests/ux/` 目錄下創建對應的測試文件（UX####.test.tsx）
2. 使用 `describe` 和 `it` 組織測試案例
3. 使用 `beforeEach` 和 `afterEach` 清理測試環境
4. 使用共用測試元件（符合 DRY & KISS 原則）
5. 運行 `npm run test:run` 驗證測試通過
6. 運行 `npm run ux:test:check` 確認測試對應正確
