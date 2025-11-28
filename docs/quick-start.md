# 快速開始：工作流程規則

## 三步驟流程

### 1️⃣ 開發程式碼 + 添加註解（從開發開始就標記）

```typescript
// @ARCH:START NewComponent - UI: 主要功能區塊
export default function NewComponent() {
  // @ARCH: NewComponent - UI: 列表顯示
  // @ARCH: NewComponent - FEAT: 載入資料
  // @ARCH: NewComponent - UX: 新增流程
  // ...
}
// @ARCH:END NewComponent - UI: 主要功能區塊
```

### 2️⃣ 完成後整併到 docs/features/ 並更新文檔

**完成功能後**：
- 將 plan 內容改寫並整併到 `docs/features/*.md`
- 記錄所有 @ARCH tags 的位置和 hash
- 更新 `docs/features/README.md`（功能列表）
- 更新 `ARCHITECTURE.md`（應用程式流程、服務層架構）
- 更新 plan 狀態（標記為已完成或移除）

### 3️⃣ 檢查並提交

```bash
# 檢查工作流程
npm run workflow:check

# 檢查文檔同步
npm run check-architecture

# 提交（會自動執行檢查）
git commit -m "feat: 功能描述"
```

## 常用命令

```bash
# 獲取文檔更新建議
npm run doc:update <檔案路徑>

# 檢查工作流程規則
npm run workflow:check

# 檢查文檔同步
npm run check-architecture

# 驗證註解
npm run arch:validate
```

## 快速參考

| 變更 | 需要做什麼 |
|------|-----------|
| 新增組件 | @ARCH 註解 + docs/features/README.md + ARCHITECTURE.md |
| 新增服務 | ARCHITECTURE.md |
| 修改資料模型 | ARCHITECTURE.md |
| UI/UX 變更 | @ARCH 註解 + docs/features/README.md |

## 詳細文檔

- [工作流程規則](../.cursor/rules/workflow.mdc) - 完整工作流程規則（AI Agent 自動應用）
- [維護規則](./maintenance/maintenance.md) - 維護規則

