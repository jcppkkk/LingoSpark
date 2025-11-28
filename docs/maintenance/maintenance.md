# ARCHITECTURE.md 自動維護系統

## 概述

本系統確保 `ARCHITECTURE.md` 架構文檔與程式碼保持同步，幫助 AI agent 快速理解專案結構並定位需要處理的區域。

## 系統組成

### 1. 維護規則 (`.cursor/rules/architecture-maintenance.mdc`)

**作用**：指導 AI agent 何時需要更新 `ARCHITECTURE.md`

**特點**：

- `alwaysApply: true` - 始終生效
- 明確列出觸發更新的情況
- 提供更新流程和檢查清單
- 包含範例說明

**觸發條件**：

- ✅ 新增組件或頁面
- ✅ 新增或修改服務
- ✅ 修改資料模型
- ✅ 新增功能或修改現有功能
- ✅ 修改路由或導航

### 2. 檢查工具 (`scripts/check-architecture.js`)

**作用**：自動掃描程式碼並檢查 `ARCHITECTURE.md` 是否同步

**功能**：

- 掃描 `components/` 和 `services/` 目錄
- 檢查未記錄的檔案
- 檢查未記錄的公開函數
- 提供清晰的輸出報告

**使用方法**：

```bash
npm run check-architecture
```

**輸出說明**：

- ✅ 綠色：文檔已同步
- ⚠️ 黃色：發現未記錄的項目，需要更新

### 3. Git Hook 範例 (`.git/hooks/pre-commit.example`)

**作用**：在提交前自動檢查（可選）

**使用方式**：

1. 複製到 `.git/hooks/pre-commit`
2. 或使用 husky 等工具管理

**注意**：預設僅顯示警告，不阻止提交。如需強制檢查，可修改腳本。

## 工作流程

### AI Agent 工作流程

1. **開發時**：

   - 根據 `.cursor/rules/architecture-maintenance.mdc` 規則
   - 自動檢測是否需要更新 `ARCHITECTURE.md`
   - 在進行相關變更時自動更新文檔

2. **提交前**：

   - 執行 `npm run check-architecture`
   - 確認所有變更已記錄

3. **Code Review**：
   - 確認 `ARCHITECTURE.md` 已同步更新

### 手動檢查流程

1. 執行檢查工具：

   ```bash
   npm run check-architecture
   ```

2. 根據輸出結果：

   - 如果顯示 ✅：無需操作
   - 如果顯示 ⚠️：更新 `ARCHITECTURE.md`

3. 更新文檔：
   - 參考 `.cursor/rules/architecture-maintenance.mdc` 中的範例
   - 保持格式一致
   - 確保檔案路徑正確

## 維護最佳實踐

### 應該記錄的內容

- ✅ 所有公開組件（export default 或 export 的 React 組件）
- ✅ 所有公開服務函數（export function）
- ✅ 資料模型變更（types.ts）
- ✅ 路由變更（App.tsx, AppView enum）
- ✅ 主要功能流程

### 不需要記錄的內容

- ❌ 僅修改樣式或 CSS
- ❌ 僅修復 bug 且不影響功能描述
- ❌ 僅重構程式碼結構但功能不變
- ❌ 內部實現細節（除非是公開 API）
- ❌ 僅更新註解或文檔字串

### 更新格式

保持與現有格式一致：

- 使用一致的標記符號（📊 ➕ 📚 🎴 等）
- 檔案路徑使用反引號包裹
- 功能描述簡潔明確
- 列出所有相關檔案

## 檢查工具技術細節

### 掃描範圍

- `components/*.tsx` - React 組件
- `services/*.ts` - 服務檔案

### 檢查邏輯

1. **檔案檢查**：

   - 提取 `ARCHITECTURE.md` 中記錄的檔案路徑
   - 比對實際存在的檔案
   - 找出未記錄的檔案

2. **函數檢查**：
   - 掃描檔案中的 `export function` 和 `export const function`
   - 檢查函數名是否出現在文檔中
   - 比對檔案路徑和函數名

### 限制

- 僅檢查 `export` 的函數，不檢查內部實現
- 使用簡單的正則匹配，可能會有誤報
- 不檢查函數參數或返回值的文檔完整性

## 故障排除

### 檢查工具無法執行

**問題**：`require is not defined`

**解決**：確保使用 ES module 語法（已修正）

### 誤報

**問題**：工具報告未記錄但實際已記錄

**解決**：

- 檢查檔案路徑格式是否正確（使用反引號）
- 確認函數名拼寫正確
- 檢查是否在正確的區段中記錄

### 遺漏檢查

**問題**：新增功能但工具未檢測到

**解決**：

- 確認檔案在 `components/` 或 `services/` 目錄下
- 確認函數使用 `export` 關鍵字
- 手動執行檢查工具驗證

## 未來改進

詳細的改進計劃請參考：[維護系統未來改進](../plans/maintenance-improvements.md)

## 相關檔案

- `ARCHITECTURE.md` - 架構文檔
- `.cursor/rules/architecture-maintenance.mdc` - 維護規則
- `scripts/check-architecture.js` - 檢查工具
- `.git/hooks/pre-commit.example` - Git hook 範例

## 總結

這個自動維護系統通過：

1. **規則指導** - 明確何時需要更新
2. **自動檢查** - 發現未同步的項目
3. **流程規範** - 確保更新品質

確保 `ARCHITECTURE.md` 始終與程式碼保持同步，幫助 AI agent 和開發者快速理解專案結構。
