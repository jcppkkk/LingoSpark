# UX 路徑與測試對應表

本文檔記錄所有 UX 路徑及其對應的測試檔案狀態。

## 對應規則

- 每個 UX 路徑（格式：UX####）都必須有對應的測試檔案
- 測試檔案命名：`tests/ux/UX####.test.tsx`
- 測試必須包含：觸發條件、操作步驟、預期結果的驗證

## 測試狀態

- ✅ 已實作：測試檔案存在且通過
- ❌ 缺失：測試檔案不存在
- 🚧 進行中：測試檔案存在但未完成

## UX 路徑列表

### Dashboard (UX0001-UX0004)

| UX 編號 | 路徑名稱 | 測試檔案 | 狀態 |
|---------|---------|---------|------|
| UX0001 | 查看學習統計 | `tests/ux/UX0001.test.tsx` | ✅ |
| UX0002 | 開始複習挑戰 | `tests/ux/UX0002.test.tsx` | ✅ |
| UX0003 | 導航到字庫管理 | `tests/ux/UX0003.test.tsx` | ✅ |
| UX0004 | 手動觸發雲端同步 | `tests/ux/UX0004.test.tsx` | ✅ |

### Word Library (UX0005-UX0015)

| UX 編號 | 路徑名稱 | 測試檔案 | 狀態 |
|---------|---------|---------|------|
| UX0005 | 切換標籤頁 | `tests/ux/UX0005.test.tsx` | ✅ |
| UX0006 | 搜尋單字 | `tests/ux/UX0006.test.tsx` | ✅ |
| UX0007 | 篩選單字 | `tests/ux/UX0007.test.tsx` | ✅ |
| UX0008 | 排序單字 | `tests/ux/UX0008.test.tsx` | ✅ |
| UX0009 | 查看單字卡詳情 | `tests/ux/UX0009.test.tsx` | ✅ |
| UX0010 | 刪除單字卡 | `tests/ux/UX0010.test.tsx` | ✅ |
| UX0011 | 手動輸入單字 | `tests/ux/UX0011.test.tsx` | ✅ |
| UX0012 | 圖片上傳與識別 | `tests/ux/UX0012.test.tsx` | ✅ |
| UX0013 | AI 分析單字 | `tests/ux/UX0013.test.tsx` | ✅ |
| UX0014 | 預覽單字卡 | `tests/ux/UX0014.test.tsx` | ✅ |
| UX0015 | 儲存新單字卡 | `tests/ux/UX0015.test.tsx` | ✅ |

### Learning Mode (UX0016-UX0028)

| UX 編號 | 路徑名稱 | 測試檔案 | 狀態 |
|---------|---------|---------|------|
| UX0016 | 選擇學習 Level | `tests/ux/UX0016.test.tsx` | ✅ |
| UX0017 | 選擇語音 | `tests/ux/UX0017.test.tsx` | ✅ |
| UX0018 | 學習模式 - 查看單字卡 | `tests/ux/UX0018.test.tsx` | ✅ |
| UX0019 | 學習模式 - 切換音節顯示 | `tests/ux/UX0019.test.tsx` | ✅ |
| UX0020 | 學習模式 - 播放語音 | `tests/ux/UX0020.test.tsx` | ✅ |
| UX0021 | 學習模式 - 翻轉卡片 | `tests/ux/UX0021.test.tsx` | ✅ |
| UX0022 | 學習模式 - 切換到下一個單字 | `tests/ux/UX0022.test.tsx` | ✅ |
| UX0023 | 積木模式 - 播放語音 | `tests/ux/UX0023.test.tsx` | ✅ |
| UX0024 | 積木模式 - 重組字母 | `tests/ux/UX0024.test.tsx` | ✅ |
| UX0025 | 積木模式 - 檢查答案 | `tests/ux/UX0025.test.tsx` | ✅ |
| UX0026 | 聽寫模式 - 播放語音 | `tests/ux/UX0026.test.tsx` | ✅ |
| UX0027 | 聽寫模式 - 輸入單字 | `tests/ux/UX0027.test.tsx` | ✅ |
| UX0028 | 聽寫模式 - 檢查答案 | `tests/ux/UX0028.test.tsx` | ✅ |

### Flashcard Component (UX0029-UX0031)

| UX 編號 | 路徑名稱 | 測試檔案 | 狀態 |
|---------|---------|---------|------|
| UX0029 | 查看單字卡正面 | `tests/ux/UX0029.test.tsx` | ✅ |
| UX0030 | 翻轉單字卡查看背面 | `tests/ux/UX0030.test.tsx` | ✅ |
| UX0031 | 查看單字分析資訊 | `tests/ux/UX0031.test.tsx` | ✅ |

## 統計

- **總計**: 31 個 UX 路徑（排除 Error Test 2個）
- **已實作**: 31 個
  - Dashboard: 4個
  - Word Library: 11個
  - Learning Mode: 13個
  - Flashcard: 3個
- **已移除**: 2 個（Error Test）
- **缺失**: 0 個

## 測試實作指南

### 1. 使用共用測試元件

測試應使用 `tests/utils/` 目錄下的共用元件，符合 DRY & KISS 原則：

- `test-helpers.tsx` - 基礎測試輔助函數
- `navigation-helpers.tsx` - 導航測試（UX0002, UX0003, UX0005）
- `form-helpers.tsx` - 表單輸入測試（UX0011, UX0027）
- `button-helpers.tsx` - 按鈕點擊測試（UX0004, UX0020, UX0023, UX0026）
- `list-helpers.tsx` - 列表操作測試（UX0006, UX0007, UX0008）
- `card-helpers.tsx` - 卡片翻轉測試（UX0030, UX0021）
- `answer-helpers.tsx` - 答案檢查測試（UX0025, UX0028）

### 2. 測試結構

每個測試檔案應遵循以下結構：

```typescript
import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../utils/test-helpers';
import Component from '../../components/Component';

describe('UX####: 路徑名稱', () => {
  it('應該符合觸發條件', async () => {
    // 觸發條件：...
    // 操作步驟：...
    // 預期結果：...
  });
});
```

### 3. 驗證檢查

執行以下命令檢查測試狀態：

```bash
# 檢查 UX-測試 對應
npm run ux:test:check

# 列出所有 UX 路徑及其測試狀態
npm run ux:test:list
```

## 更新記錄

- 2025-01-XX: 建立初始對應表
- 2025-01-XX: 完成第一優先級測試實作（7個）
- 2025-01-XX: 完成 Word Library 模組測試實作（11個）
- 2025-01-XX: 完成 Learning Mode 模組測試實作（13個）
- 2025-01-XX: 移除 Error Test 模組測試（2個）
- 2025-01-XX: 移除 Error Test 功能（UX0032-UX0033）

