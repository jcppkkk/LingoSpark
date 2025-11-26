<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LingoSpark - AI Phonics & Memory

一個智能單字卡應用程式，使用 Google Gemini AI 進行自然拼讀分析、詞源拆解、記憶圖像生成，並結合間隔重複學習演算法，幫助您更有效率地學習英文單字。

## 專案簡介

LingoSpark 是一個現代化的單字學習工具，透過 AI 技術自動分析單字的多個面向：

- **自然拼讀（Phonics）**：自動拆解音節並標示重音
- **詞源分析（Etymology）**：拆解字根、前綴、後綴並解釋含義
- **記憶圖像生成**：使用 AI 生成幫助記憶的視覺提示
- **間隔重複學習**：採用 SuperMemo-2 演算法，優化複習時機
- **雲端同步**：支援 Google Drive 備份與同步

## 主要功能

### 📊 儀表板（Dashboard）

- 顯示學習統計：總單字量、待複習數量、已學會數量
- 快速開始複習或新增單字
- 雲端備份狀態顯示與手動同步

### ➕ 新增單字（Add Word）

- 手動輸入單字或批次匯入
- 支援圖片上傳，自動識別圖片中的單字
- AI 自動分析單字的多個面向
- 預覽單字卡並選擇記憶圖像

### 📚 練習模式（Practice Mode）

- 間隔重複演算法自動排程複習
- 互動式單字卡翻轉學習
- 根據記憶程度調整下次複習時間

## 技術棧

- **前端框架**：React 19 + TypeScript
- **建置工具**：Vite 6
- **AI 服務**：Google Gemini AI (@google/genai)
- **圖示庫**：Lucide React
- **資料儲存**：IndexedDB（本地） + Google Drive API（雲端同步）

## 安裝與使用

### 前置需求

- Node.js（建議使用最新 LTS 版本）

### 安裝步驟

1. **安裝依賴套件**

   ```bash
   npm install
   ```

2. **設定環境變數**

   在專案根目錄建立 `.env.local` 檔案，並設定您的 Gemini API Key：

   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **（選用）設定 Google Drive 同步**

   如需使用雲端備份功能，請在 `constants.ts` 中設定 `GOOGLE_DRIVE_CLIENT_ID`。

4. **啟動開發伺服器**

   ```bash
   npm run dev
   ```

   應用程式將在 `http://localhost:3000` 啟動。

### 建置生產版本

```bash
npm run build
```

### 預覽生產版本

```bash
npm run preview
```

## 專案結構

```
LingoSpark/
├── components/          # React 組件
│   ├── Dashboard.tsx    # 儀表板
│   ├── AddWord.tsx      # 新增單字頁面
│   ├── PracticeMode.tsx # 練習模式
│   └── FlashcardComponent.tsx # 單字卡組件
├── services/            # 服務層
│   ├── geminiService.ts # Gemini AI 服務
│   ├── storageService.ts # 本地儲存服務
│   ├── syncService.ts   # 雲端同步服務
│   ├── driveService.ts  # Google Drive API
│   └── db.ts           # IndexedDB 資料庫
├── types.ts            # TypeScript 型別定義
├── constants.ts        # 常數設定
├── App.tsx             # 主應用程式
└── vite.config.ts      # Vite 設定檔
```

## 功能特色

### 🤖 AI 驅動分析

- 自動生成 IPA 音標
- 音節拆解與重音標示
- 字根、前綴、後綴分析
- 例句與翻譯生成
- 記憶提示與圖像生成

### 📈 間隔重複學習

- 採用 SuperMemo-2 演算法
- 根據記憶程度動態調整複習間隔
- 追蹤學習進度與熟練度

### ☁️ 雲端同步

- Google Drive 自動備份
- 跨裝置資料同步
- 離線使用支援

### 🎨 現代化 UI

- 響應式設計
- 流暢的動畫效果
- 直觀的使用者介面

## 相關連結

- [在 AI Studio 查看應用](https://ai.studio/apps/drive/1h7CICdSVIkOZufEiH67w9GBLU4zAF6WB)

## 授權

本專案採用 [MIT License](LICENSE) 授權。

### 授權條款

MIT License 是一種寬鬆的開源授權，允許：

- ✅ **商業使用**：可用於商業專案
- ✅ **修改**：可自由修改程式碼
- ✅ **分發**：可自由分發原始碼或編譯版本
- ✅ **專有軟體**：可整合到專有軟體中

### 唯一要求

使用本專案時，請保留原始的版權聲明和 MIT License 授權條款。

詳細授權內容請參閱 [LICENSE](LICENSE) 檔案。
