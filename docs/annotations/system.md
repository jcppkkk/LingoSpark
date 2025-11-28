# ARCHITECTURE 註解標記系統

## 概述

透過在程式碼中使用特殊註解標記 FEAT/UX/UI 段落，並在 `ARCHITECTURE.md` 中記錄對應的 hash，實現精確的變更檢測。

## 註解標記格式

系統支援兩種註解格式，可以根據個人偏好選擇使用。

### 格式 1：標準格式

```typescript
// @ARCH: <模組名稱> - <類型>: <功能名稱>
```

**範例**：

```typescript
// @ARCH: Dashboard - UI: 統計卡片區塊
<div className="grid grid-cols-3 gap-4 mb-8">
  {/* 統計卡片內容 */}
</div>

// @ARCH: Dashboard - FEAT: 開始複習按鈕
<button onClick={() => onNavigate(views.PRACTICE)}>
  開始複習挑戰
</button>

// @ARCH: Dashboard - UX: 雲端同步流程
const handleManualSync = () => {
  performSync(true);
};
```

### 格式 2：簡化格式

```typescript
// @ARCH: <模組名稱>.<類型>.<功能名稱>
```

**範例**：

```typescript
// @ARCH: Dashboard.UI.統計卡片區塊
<div className="grid grid-cols-3 gap-4 mb-8">
  {/* 統計卡片內容 */}
</div>

// @ARCH: Dashboard.FEAT.開始複習按鈕
<button onClick={() => onNavigate(views.PRACTICE)}>
  開始複習挑戰
</button>

// @ARCH: Dashboard.UX.雲端同步流程
const handleManualSync = () => {
  performSync(true);
};
```

### 類型定義

- `FEAT`: 功能特性（資料載入、處理邏輯、API 調用等）
- `UX`: 使用者體驗流程（互動流程、狀態管理、導航等）
- `UI`: 使用者介面元素（按鈕、表單、卡片等）

### 區塊標記（多行）

兩種格式都支援區塊標記：

**標準格式**：

```typescript
// @ARCH:START Dashboard - UI: 統計卡片區塊
<div className="grid grid-cols-3 gap-4 mb-8">
  <div>總單字量</div>
  <div>待複習數量</div>
  <div>已學會數量</div>
</div>
// @ARCH:END Dashboard - UI: 統計卡片區塊
```

**簡化格式**：

```typescript
// @ARCH:START Dashboard.UI.統計卡片區塊
<div className="grid grid-cols-3 gap-4 mb-8">
  <div>總單字量</div>
  <div>待複習數量</div>
  <div>已學會數量</div>
</div>
// @ARCH:END Dashboard.UI.統計卡片區塊
```

### JSX 註解格式

兩種格式都支援 JSX 註解：

**標準格式**：

```typescript
{
  /* @ARCH: Dashboard - UI: 開始複習按鈕 */
}
<button>...</button>;
```

**簡化格式**：

```typescript
{
  /* @ARCH: Dashboard.UI.開始複習按鈕 */
}
<button>...</button>;
```

### 格式選擇建議

- **新專案或新註解**：建議使用簡化格式（格式 2）
- **現有註解**：可以繼續使用標準格式，無需強制遷移
- **兩種格式可以並存**：同一檔案中可以混用兩種格式
- **工具完全兼容**：所有工具（掃描器、驗證器、hash 檢查器）都支援兩種格式

## Hash 計算方式

### 1. Section Hash（區段 Hash）

計算標記區段的程式碼內容 hash：

```javascript
// 提取標記區段的程式碼
const sectionCode = extractSectionCode(filePath, startLine, endLine);
const sectionHash = calculateHash(sectionCode);
```

### 2. File Hash（檔案 Hash）

計算整個檔案的 hash（用於追蹤檔案層級的變更）：

```javascript
const fileContent = fs.readFileSync(filePath, "utf-8");
const fileHash = calculateHash(fileContent);
```

### 3. Line Range Hash（行範圍 Hash）

計算特定行範圍的 hash（更精確）：

```javascript
const lines = fileContent.split("\n").slice(startLine - 1, endLine);
const rangeHash = calculateHash(lines.join("\n"));
```

## ARCHITECTURE.md 格式

### 基本格式

```markdown
### 📊 儀表板 (Dashboard)

**PRD 描述**：顯示學習統計、快速操作入口、雲端同步狀態

**UI 元素**：

- 統計卡片：總單字量、待複習數量、已學會數量
  - `components/Dashboard.tsx:140-145` | Hash: `a1b2c3d4...`
- 主要操作按鈕：開始複習、製作新單字卡
  - `components/Dashboard.tsx:149-178` | Hash: `e5f6g7h8...`

**關鍵功能**：

- 載入並顯示學習統計
  - `components/Dashboard.tsx:18-36` | Hash: `i9j0k1l2...`
- 手動觸發雲端同步
  - `components/Dashboard.tsx:38-42` | Hash: `m3n4o5p6...`
```

### 完整格式範例

```markdown
### 📊 儀表板 (Dashboard)

**PRD 描述**：顯示學習統計、快速操作入口、雲端同步狀態

**程式碼位置**：

- 組件：`components/Dashboard.tsx` | File Hash: `abc123...`

**UI 元素**：

- [UI] 統計卡片區塊

  - 位置：`components/Dashboard.tsx:140-145`
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

## 檢測機制

### 1. 掃描註解標記

```javascript
// 掃描檔案中的 @ARCH 註解
const annotations = scanArchAnnotations(filePath);
// 返回: [{ type, module, feature, startLine, endLine, hash }]
```

### 2. 計算 Hash

```javascript
// 計算標記區段的 hash
const currentHash = calculateSectionHash(filePath, startLine, endLine);
```

### 3. 比對 Hash

```javascript
// 從 ARCHITECTURE.md 提取記錄的 hash
const documentedHash = extractHashFromArchitecture(module, feature);

// 比對
if (currentHash !== documentedHash) {
  console.warn(`⚠️ ${module} - ${feature} 的 hash 不匹配！`);
  console.warn(`   文檔中: ${documentedHash}`);
  console.warn(`   實際: ${currentHash}`);
}
```

## 工具實作

### 1. 註解掃描工具

掃描程式碼中的 `@ARCH` 註解並提取資訊。

**使用方式**：

```bash
npm run arch:scan [file]
```

### 2. Hash 計算工具

計算標記區段的 hash。

**使用方式**：

```bash
npm run arch:check
```

### 3. 同步檢查工具

比對程式碼 hash 與文檔中記錄的 hash。

**使用方式**：

```bash
npm run arch:validate
```

### 4. 自動生成工具

使用 AI 自動識別功能區塊並生成註解建議。

**功能**：

- 自動識別 UI/FEAT/UX 區塊
- 使用 Gemini API 生成註解建議
- 支援互動模式審查和確認
- 支援兩種註解格式（標準格式和簡化格式）

**使用方式**：

```bash
# 為單一檔案生成註解（自動模式）
npm run arch:generate components/Dashboard.tsx

# 為整個目錄生成註解（遞迴掃描所有 .tsx 和 .ts 檔案）
npm run arch:generate components/

# 同時處理多個檔案或目錄
npm run arch:generate components/ services/
npm run arch:generate components/Dashboard.tsx components/WordLibrary.tsx

# 互動模式（逐個審查建議，支援 a=全部接受）
npm run arch:generate components/Dashboard.tsx --interactive

# 使用標準格式（預設使用簡化格式）
npm run arch:generate components/Dashboard.tsx --standard-format
```

**技術實現**：

- 使用 `@google/genai` 套件進行 AI 分析
- 需要設定 `API_KEY` 環境變數
- 自動識別程式碼結構（JSX 元素、函數定義、狀態管理等）
- 生成符合規範的註解建議

### 5. 自動更新工具

自動更新 `ARCHITECTURE.md` 中的 hash。

## 優點

1. **精確對應**：每個功能區塊都有明確的對應關係
2. **自動檢測**：透過 hash 比對自動檢測變更
3. **追蹤變更**：可以追蹤具體的功能區塊變更
4. **可擴展**：可以標記任何層級的 FEAT/UX/UI

## 缺點

1. **維護成本**：需要添加註解（可使用自動生成工具降低成本）
2. **註解污染**：程式碼中會有較多註解
3. **Hash 衝突**：理論上可能會有 hash 衝突（但機率極低）

## 技術實現細節

### 格式解析

掃描器使用正則表達式同時匹配兩種格式：

- **標準格式**：`/^(.+?)\s*-\s*(FEAT|UX|UI):\s*(.+)$/`
- **簡化格式**：`/^(.+?)\.(FEAT|UX|UI)\.(.+)$/`

兩種格式解析後統一轉換為相同的內部結構，確保工具完全兼容。

### 自動生成工具架構

```
arch-annotation-generator.js
├── 程式碼分析模組
│   ├── 識別 UI 元素（JSX 標籤、事件處理器）
│   ├── 識別 FEAT 功能（函數定義、API 調用）
│   └── 識別 UX 流程（狀態管理、導航邏輯）
├── AI 整合模組
│   ├── 使用 Gemini API 分析程式碼
│   ├── 生成註解建議
│   └── 提供上下文感知的建議
└── 互動模式
    ├── 顯示建議
    ├── 允許審查和確認
    └── 自動插入註解
```

**依賴**：

- `@google/genai` 套件
- 需要 `API_KEY` 環境變數

## 使用流程

### 開發時

#### 方式 1：手動添加註解

1. 在程式碼中添加 `@ARCH` 註解標記
2. 使用標準格式或簡化格式（建議使用簡化格式）

#### 方式 2：自動生成註解（推薦）

1. 使用自動生成工具：
   ```bash
   npm run arch:generate components/YourComponent.tsx --interactive
   ```
2. 審查 AI 生成的建議
3. 確認並接受合適的註解
4. 工具會自動插入註解到程式碼中

### 提交前

1. **掃描註解**：

   ```bash
   npm run arch:scan
   ```

2. **檢查 Hash 同步**：

   ```bash
   npm run arch:check
   ```

3. **驗證註解**：

   ```bash
   npm run arch:validate
   ```

4. **更新 ARCHITECTURE.md**：
   - 如有變更，更新對應的 hash 資訊
   - 可以使用自動更新工具協助

### Code Review

- 確認註解標記正確
- 確認 hash 已更新
- 確認註解格式符合規範
