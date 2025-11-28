# Husky + ARCHITECTURE 註解系統

## 概述

基於 Husky 的註解檢查系統，透過 Git hooks 自動檢查所有組件的 PRD/UX/UI 註解標記。系統已全面推廣，所有組件變更都需要添加對應的註解，否則會阻止提交。

## 系統架構

```
Git Commit
    ↓
Pre-commit Hook (Husky)
    ↓
arch-annotation-validator.js
    ↓
檢查變更檔案是否需要註解
    ↓
檢查是否有註解標記
    ↓
檢查註解格式（START/END 配對）
    ↓
允許/阻止提交
```

## 安裝與設定

### 1. 安裝 Husky

```bash
npm install --save-dev husky
```

### 2. 初始化 Husky

```bash
npm run prepare
# 或
node scripts/setup-husky.js
```

### 3. 配置檔案

編輯 `.arch-annotation-config.json` 來設定：

- 啟用/停用系統
- 設定檢查範圍（components/services）
- 設定嚴格模式
- 設定排除規則

## 配置說明

### `.arch-annotation-config.json`

```json
{
  "enabled": true,
  "mode": "progressive",
  "strictMode": false,
  "phases": {
    "phase3": {
      "name": "全面推廣",
      "status": "active",
      "components": ["*"],
      "strictness": "error"
    }
  }
}
```

### 當前配置狀態

系統已全面啟用註解檢查：

- **檢查範圍**：所有 `components/` 和 `services/` 目錄下的 `.tsx` 和 `.ts` 檔案
- **嚴格度**：error（所有變更都必須有註解，否則阻止提交）
- **格式檢查**：啟用格式錯誤檢查（START/END 不匹配會阻止提交）
- **排除規則**：測試檔案（`*.test.tsx`, `*.test.ts`, `*.spec.tsx`, `*.spec.ts`）自動排除

## 使用流程

### 開發時

1. **正常開發**：編寫程式碼
2. **Git Add**：`git add .`
3. **Git Commit**：`git commit -m "..."`

### Pre-commit Hook 自動執行

1. **檢查變更檔案**：掃描 staged 檔案
2. **判斷是否需要註解**：所有 `components/` 和 `services/` 目錄下的 `.tsx` 和 `.ts` 檔案都需要註解
3. **檢測變更類型**：UI/FEAT/UX
4. **檢查是否有註解**：掃描檔案內容
5. **檢查註解格式**：驗證 START/END 配對是否正確
6. **輸出結果**：
   - 如果有註解且格式正確：通過
   - 如果沒有註解：阻止提交
   - 如果格式錯誤（START/END 不匹配）：阻止提交

### 添加註解

如果提交被阻止：

1. **查看錯誤訊息**：了解需要添加的註解類型或格式問題
2. **參考範例**：`docs/annotations/examples.md`
3. **添加註解**：在對應的程式碼區塊添加 `@ARCH` 註解
4. **修復格式錯誤**：確保 START/END 配對正確
5. **重新提交**：`git commit`

## 註解標記規則

### 必須添加註解的情況

根據 `.arch-annotation-config.json` 中的 `rules.requireAnnotations`：

- ✅ **newComponents**：新增組件時
- ✅ **newFeatures**：新增功能時
- ✅ **uiChanges**：UI 變更時
- ✅ **uxChanges**：UX 變更時

### 註解類型

- **UI**：使用者介面元素
  - 按鈕、表單、輸入框、卡片等
- **FEAT**：功能特性
  - 資料載入、處理邏輯、API 調用等
- **UX**：使用者體驗流程
  - 互動流程、狀態管理、導航等

## 系統狀態

### 註解覆蓋統計

- **總組件數**：10 個
- **總註解標記數**：79 個
- **主要組件覆蓋**：
  - Dashboard: 11 個標記
  - WordLibrary: 12 個標記
  - LearningMode: 6 個標記
  - BlockModeTab: 15 個標記
  - DictationModeTab: 13 個標記
  - FlashcardComponent: 9 個標記
  - 其他組件：13 個標記

### 系統功能

- ✅ Pre-commit hook 已配置並運作
- ✅ 格式錯誤檢查已啟用（START/END 不匹配會報錯並阻止提交）
- ✅ 自動生成工具可用（`npm run arch:generate`）
- ✅ 掃描和驗證工具正常運作
- ✅ 所有組件變更都需要註解（error 模式）

### 維護指南

1. **持續監控**：定期執行 `npm run arch:check` 檢查 hash 同步狀態
2. **格式規範**：確保所有新增註解都遵循 START/END 配對規則
3. **文檔更新**：變更功能時同步更新 `ARCHITECTURE.md` 中的 hash
4. **工具維護**：保持驗證工具和掃描工具的更新

## 工具命令

### 驗證註解

```bash
# 檢查變更檔案是否需要註解
npm run arch:validate
```

### 掃描註解

```bash
# 掃描所有註解標記
npm run arch:scan

# 掃描特定檔案
npm run arch:scan components/Dashboard.tsx
```

### 檢查 Hash

```bash
# 檢查 hash 同步狀態
npm run arch:check
```

### 跳過檢查（不建議）

```bash
# 使用 --no-verify 跳過 pre-commit hook
git commit --no-verify -m "..."
```

## 故障排除

### Hook 不執行

**問題**：pre-commit hook 沒有執行

**解決**：

1. 檢查 `.husky/pre-commit` 是否存在
2. 檢查檔案權限：`chmod +x .husky/pre-commit`
3. 確認 husky 已安裝：`npm list husky`

### 誤報

**問題**：工具報告需要註解但實際不需要

**解決**：

1. 檢查 `.arch-annotation-config.json` 中的排除規則
2. 更新配置添加排除模式
3. 確認當前配置是否正確

### 無法提交

**問題**：錯誤模式阻止提交

**解決**：

1. 添加必要的註解標記
2. 檢查格式錯誤（START/END 不匹配）並修復
3. 或暫時調整配置為警告模式（不建議）
4. 或使用 `--no-verify`（不建議）

### 格式錯誤

**問題**：驗證工具報告「找不到對應的 START 標記」

**解決**：

1. 確保每個 `@ARCH:END` 都有對應的 `@ARCH:START`
2. 檢查 START 和 END 的註解內容是否完全一致
3. 在 error 模式下，格式錯誤會阻止提交
4. 使用 `npm run arch:scan <檔案>` 檢查註解格式

## 最佳實踐

### 1. 註解位置

- 在功能區塊開始處添加註解
- 使用 `@ARCH:START/END` 標記多行區塊
- 使用單行 `@ARCH:` 標記簡單元素

### 2. 註解命名

- 使用清晰的模組名稱
- 使用描述性的功能名稱
- 保持命名一致性

### 3. 維護註解

- 程式碼變更時同步更新註解
- 重構時更新註解位置
- 定期檢查註解有效性

### 4. 團隊協作

- 在 Code Review 時檢查註解
- 分享註解最佳實踐
- 持續改進註解格式

## 進階配置

### 自訂規則

編輯 `.arch-annotation-config.json`：

```json
{
  "rules": {
    "requireAnnotations": {
      "newComponents": true,
      "newFeatures": true,
      "uiChanges": true,
      "uxChanges": true,
      "customRule": "your-custom-logic"
    }
  }
}
```

### 整合 CI/CD

在 CI 流程中添加檢查：

```yaml
# .github/workflows/ci.yml
- name: Check Architecture Annotations
  run: npm run arch:validate
```

## 相關文檔

- [註解系統說明](./system.md) - 註解系統說明
- [使用範例](./examples.md) - 使用範例
- `.arch-annotation-config.json` - 配置檔案
- `.cursor/rules/architecture-maintenance.mdc` - AI Agent 規則
