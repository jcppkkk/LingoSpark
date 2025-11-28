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

## 持續改進

當需要測試新的資料庫功能時：

1. 在 `tests/` 目錄下創建新的測試文件
2. 使用 `describe` 和 `it` 組織測試案例
3. 使用 `beforeEach` 和 `afterEach` 清理測試環境
4. 運行 `npm run test:run` 驗證測試通過
