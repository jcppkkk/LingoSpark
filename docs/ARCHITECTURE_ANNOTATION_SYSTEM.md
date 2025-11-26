# ARCHITECTURE 註解標記系統

## 概述

透過在程式碼中使用特殊註解標記 FEAT/UX/UI 段落，並在 `ARCHITECTURE.md` 中記錄對應的 hash，實現精確的變更檢測。

## 註解標記格式

### 基本格式

```typescript
// @ARCH: <模組名稱> - <類型>: <功能名稱> [<選項>]
```

### 類型定義

- `FEAT`: 功能特性
- `UX`: 使用者體驗流程
- `UI`: 使用者介面元素

### 範例

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

### 區塊標記（多行）

```typescript
// @ARCH:START Dashboard - UI: 統計卡片區塊
<div className="grid grid-cols-3 gap-4 mb-8">
  <div>總單字量</div>
  <div>待複習數量</div>
  <div>已學會數量</div>
</div>
// @ARCH:END Dashboard - UI: 統計卡片區塊
```

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

### 2. Hash 計算工具

計算標記區段的 hash。

### 3. 同步檢查工具

比對程式碼 hash 與文檔中記錄的 hash。

### 4. 自動更新工具

自動更新 `ARCHITECTURE.md` 中的 hash。

## 優點

1. **精確對應**：每個功能區塊都有明確的對應關係
2. **自動檢測**：透過 hash 比對自動檢測變更
3. **追蹤變更**：可以追蹤具體的功能區塊變更
4. **可擴展**：可以標記任何層級的 FEAT/UX/UI

## 缺點

1. **維護成本**：需要手動添加註解（但可以透過 AI agent 自動添加）
2. **註解污染**：程式碼中會有較多註解
3. **Hash 衝突**：理論上可能會有 hash 衝突（但機率極低）

## 改進方案

### 1. 簡化註解格式

使用更簡潔的格式：

```typescript
// @ARCH: Dashboard.UI.統計卡片
// @ARCH: Dashboard.FEAT.開始複習
// @ARCH: Dashboard.UX.雲端同步
```

### 2. 自動生成註解

AI agent 可以自動識別功能區塊並添加註解。

### 3. 視覺化工具

提供工具視覺化標記與文檔的對應關係。

## 使用流程

1. **開發時**：

   - AI agent 自動識別功能區塊
   - 自動添加註解標記
   - 自動計算 hash

2. **提交前**：

   - 執行檢查工具
   - 比對 hash
   - 如有變更，更新 `ARCHITECTURE.md`

3. **Code Review**：
   - 確認註解標記正確
   - 確認 hash 已更新
