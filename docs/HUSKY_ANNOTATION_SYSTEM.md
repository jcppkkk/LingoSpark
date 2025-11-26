# Husky + ARCHITECTURE 註解系統

## 概述

基於 Husky 的漸進式推廣方案，透過 Git hooks 自動檢查和推進 PRD/UX/UI 註解標記範圍。

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
根據階段配置決定警告/錯誤
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
- 設定當前階段
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
    "phase1": {
      "name": "試點階段",
      "status": "active",
      "components": ["Dashboard"],
      "strictness": "warning"
    }
  }
}
```

### 階段配置

#### Phase 1: 試點階段（當前）

- **目標組件**：Dashboard
- **嚴格度**：warning（僅警告，不阻止提交）
- **目的**：驗證系統運作，收集反饋

#### Phase 2: 擴展階段

- **目標組件**：Dashboard, WordLibrary, PracticeMode
- **嚴格度**：warning（仍為警告模式）
- **目的**：擴展到主要組件

#### Phase 3: 全面推廣

- **目標組件**：所有組件（\*）
- **嚴格度**：error（阻止提交）
- **目的**：確保所有變更都有註解

## 使用流程

### 開發時

1. **正常開發**：編寫程式碼
2. **Git Add**：`git add .`
3. **Git Commit**：`git commit -m "..."`

### Pre-commit Hook 自動執行

1. **檢查變更檔案**：掃描 staged 檔案
2. **判斷是否需要註解**：根據配置和階段
3. **檢測變更類型**：UI/FEAT/UX
4. **檢查是否有註解**：掃描檔案內容
5. **輸出結果**：
   - 如果有註解：通過
   - 如果沒有註解且為警告模式：顯示警告，允許提交
   - 如果沒有註解且為錯誤模式：阻止提交

### 添加註解

如果收到警告或錯誤：

1. **查看提示**：了解需要添加的註解類型
2. **參考範例**：`docs/ARCHITECTURE_ANNOTATION_EXAMPLE.md`
3. **添加註解**：在對應的程式碼區塊添加 `@ARCH` 註解
4. **重新提交**：`git commit`

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

## 漸進式推廣策略

### 階段 1：試點（1-2 週）

**目標**：

- 在 Dashboard 組件中驗證系統
- 收集使用反饋
- 調整規則和工具

**行動**：

1. 在 Dashboard 組件中添加註解標記
2. 測試 pre-commit hook
3. 收集反饋並調整

**成功標準**：

- 系統運作正常
- 開發者接受度良好
- 註解覆蓋率達到 80%+

### 階段 2：擴展（2-4 週）

**目標**：

- 擴展到主要組件
- 提高註解覆蓋率
- 建立最佳實踐

**行動**：

1. 更新配置到 phase2
2. 為主要組件添加註解
3. 建立註解範例庫

**成功標準**：

- 主要組件註解覆蓋率 80%+
- 開發者熟悉註解格式
- 工具穩定運作

### 階段 3：全面推廣（持續）

**目標**：

- 所有組件都需要註解
- 錯誤模式確保品質
- 自動化維護流程

**行動**：

1. 更新配置到 phase3
2. 啟用錯誤模式
3. 建立自動化工具

**成功標準**：

- 整體註解覆蓋率 90%+
- 所有變更都有對應註解
- 文檔與程式碼完全同步

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
3. 檢查階段配置是否正確

### 無法提交

**問題**：錯誤模式阻止提交

**解決**：

1. 添加必要的註解標記
2. 或暫時調整配置為警告模式（不建議）
3. 或使用 `--no-verify`（不建議）

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

- `docs/ARCHITECTURE_ANNOTATION_SYSTEM.md` - 註解系統說明
- `docs/ARCHITECTURE_ANNOTATION_EXAMPLE.md` - 使用範例
- `.arch-annotation-config.json` - 配置檔案
- `.cursor/rules/architecture-maintenance.mdc` - AI Agent 規則
