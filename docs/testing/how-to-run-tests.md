# 如何執行測試

本文件說明如何執行 LingoSpark 專案的測試。

## 快速開始

### 執行所有測試

```bash
# 執行所有測試（單次運行）
npm run test:run

# 執行所有測試（監聽模式，自動重新執行）
npm test

# 開啟測試 UI（視覺化界面）
npm run test:ui

# 執行測試並生成覆蓋率報告
npm run test:coverage
```

### 執行特定測試

```bash
# 執行特定測試檔案
npm test -- tests/ux/UX0001.test.tsx

# 執行特定測試套件
npm test -- tests/ux/

# 執行特定測試案例（使用 -t 參數）
npm test -- -t "查看學習統計"
```

## 測試框架

- **Vitest** - 快速、現代化的測試框架（Vite 原生支援）
- **@testing-library/react** - React 組件測試工具
- **@testing-library/jest-dom** - 額外的 DOM 斷言
- **@testing-library/user-event** - 使用者互動模擬
- **fake-indexeddb** - IndexedDB 模擬（用於測試資料庫功能）

## TDD 工作流程

LingoSpark 採用完整的 TDD（Test-Driven Development）工作流程，確保從功能定義到實作的完整循環：

```
Feature 定義 → UX 設計 → 測試設計 → 實作
```

### TDD 檢查工具

```bash
# 檢查 UX 定義與測試對應關係
npm run tdd:check-ux-test

# 檢查 Feature -> UX 合理性
npm run tdd:check-feature-ux

# 執行所有 TDD 檢查
npm run tdd:check-all
```

**詳細說明**：請參考 [TDD 工作流程指南](../development/tdd-workflow.md)

## 測試類型

### 1. UX 路徑測試

每個定義在 `docs/features/` 中的 UX 路徑都有對應的測試檔案：

```bash
# 檢查所有 UX 路徑是否有對應測試
npm run ux:test:check

# 列出所有 UX 路徑及其測試狀態
npm run ux:test:list

# 自動生成缺失的測試模板
npm run ux:test:check:fix
```

**測試檔案位置**：`tests/ux/UX####.test.tsx`

**重要**：測試必須完全符合 UX 定義，包含：
- 觸發條件的說明
- 操作步驟的說明
- 預期結果的驗證

### 2. 資料庫升級測試

測試資料庫版本升級和資料保留：

```bash
npm test -- tests/db-upgrade.test.ts
```

**測試檔案位置**：`tests/db-upgrade.test.ts`

## 測試結構

```
tests/
├── setup.ts              # 測試環境設定（localStorage mock、IndexedDB mock）
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
└── fixtures/             # 測試固定資料
    ├── flashcards.ts     # Flashcard mock 資料
    └── word-analysis.ts # WordAnalysis mock 資料
```

## 測試環境設定

測試環境會自動：

1. **Mock localStorage** - 每個測試前後會自動清理
2. **Mock IndexedDB** - 使用 `fake-indexeddb` 模擬資料庫
3. **Mock 服務** - 自動 mock 所有外部服務（storageService、syncService、geminiService 等）

## 常見問題

### 問題 1: `localStorage.getItem is not a function`

**原因**：測試環境中 localStorage 未正確 mock

**解決**：確保 `tests/setup.ts` 已正確設定 localStorage mock（已自動處理）

### 問題 2: `jest is not defined`

**原因**：使用了 Jest API，但專案使用 Vitest

**解決**：將 `jest.fn()` 改為 `vi.fn()`，`jest.mock()` 改為 `vi.mock()`

### 問題 3: `An update to Component inside a test was not wrapped in act(...)`

**原因**：非同步狀態更新未使用 `act()` 包裹

**解決**：使用 `waitFor()` 或 `findBy*` 查詢方法自動處理

### 問題 4: 測試執行緩慢

**原因**：測試數量多或依賴外部服務

**解決**：
- 確保所有服務都已正確 mock
- 使用 `vi.useFakeTimers()` 加速時間相關測試
- 使用 `--run` 模式而非監聽模式

## 測試最佳實踐

### 1. 使用共用測試元件

優先使用 `tests/utils/` 下的共用元件：

```typescript
import { renderWithProviders } from '../utils/test-helpers';
import { testNavigation } from '../utils/navigation-helpers';
import { testFormInput } from '../utils/form-helpers';
```

### 2. Mock 外部依賴

所有外部服務都應使用 `vi.mock()` 進行 mock：

```typescript
vi.mock('../../services/storageService', () => ({
  getStats: vi.fn(),
  getCards: vi.fn(),
}));
```

### 3. 清理測試環境

使用 `beforeEach` 和 `afterEach` 清理測試狀態：

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
```

### 4. 使用非同步查詢

對於非同步更新的 UI，使用 `waitFor()` 或 `findBy*`：

```typescript
await waitFor(() => {
  expect(screen.getByText('預期文字')).toBeInTheDocument();
});
```

## 持續整合

### Pre-commit Hook

提交前會自動執行：

- `npm run arch:validate` - 驗證 @ARCH 註解
- `npm run check-architecture:enhanced` - 檢查文檔同步
- `npm run workflow:check` - 檢查工作流程規則
- `npm run ux:test:check` - 檢查 UX-測試 對應

### GitHub Actions（如果配置）

可以在 CI/CD 流程中加入：

```yaml
- name: Run tests
  run: npm run test:run

- name: Check UX test mapping
  run: npm run ux:test:check
```

## 測試覆蓋率

生成測試覆蓋率報告：

```bash
npm run test:coverage
```

報告會顯示：
- 行覆蓋率（Line Coverage）
- 函數覆蓋率（Function Coverage）
- 分支覆蓋率（Branch Coverage）
- 語句覆蓋率（Statement Coverage）

## 相關文檔

- [測試說明](../tests/README.md) - 詳細測試文檔
- [UX 測試對應表](./ux-test-mapping.md) - UX 路徑與測試對應
- [功能文檔](../features/README.md) - 功能說明與測試狀態

## 下一步

1. **執行測試**：`npm run test:run`
2. **檢查 UX 測試對應**：`npm run ux:test:check`
3. **查看測試覆蓋率**：`npm run test:coverage`
4. **修復失敗的測試**：根據錯誤訊息修正測試或程式碼

