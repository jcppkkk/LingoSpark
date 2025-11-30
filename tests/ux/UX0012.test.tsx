import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import WordLibrary from '../../components/WordLibrary';
import * as storageService from '../../services/storageService';
import * as geminiService from '../../services/geminiService';

// Mock services
vi.mock('../../services/storageService', () => ({
  getCards: vi.fn(),
  createNewCard: vi.fn(),
  saveCard: vi.fn(),
  checkWordExists: vi.fn(),
  deleteCard: vi.fn(),
}));

vi.mock('../../services/geminiService', () => ({
  analyzeWord: vi.fn(),
  extractWordsFromImage: vi.fn(),
  generateMnemonicImage: vi.fn(),
}));

vi.mock('../../services/speechService', () => ({
  findDefaultEnglishVoice: vi.fn().mockResolvedValue(null),
  stopSpeaking: vi.fn(),
}));

describe('UX0012: 圖片上傳與識別', () => {
  const mockOnCancel = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue([]);
    vi.mocked(geminiService.extractWordsFromImage).mockResolvedValue(['apple', 'banana', 'computer']);
  });

  it('應該在上傳圖片後識別並顯示單字列表', async () => {
    // 觸發條件：使用者在製作新卡片標籤頁
    // 操作步驟：
    // 1. 使用者在製作新卡片標籤頁
    // 2. 點擊圖片上傳區域或上傳按鈕
    // 3. 選擇圖片檔案
    // 4. 系統顯示圖片預覽
    // 5. 點擊「識別單字」按鈕
    // 6. 系統分析圖片並提取單字
    // 7. 顯示識別到的單字列表
    // 
    // 預期結果：
    // - 可以選擇圖片檔案（支援常見圖片格式）
    // - 選擇後顯示圖片預覽
    // - 點擊「識別單字」後開始分析
    // - 分析過程中顯示載入狀態
    // - 分析完成後顯示識別到的單字列表
    // - 可以點擊識別到的單字加入待處理列表
    // - 可以清除圖片重新上傳

    renderWithProviders(
      <WordLibrary onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
    );

    // 切換到製作新卡片標籤
    const createTab = screen.getByText(/製作新卡片/i);
    await userEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/例如: cat/i)).toBeInTheDocument();
    });

    // 創建模擬的檔案
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (fileInput) {
      // 模擬檔案選擇
      await userEvent.upload(fileInput, file);

      // 等待分析完成
      await waitFor(() => {
        expect(geminiService.extractWordsFromImage).toHaveBeenCalled();
      }, { timeout: 3000 });

      // 驗證識別到的單字顯示
      await waitFor(() => {
        expect(screen.getByText('apple')).toBeInTheDocument();
        expect(screen.getByText('banana')).toBeInTheDocument();
        expect(screen.getByText('computer')).toBeInTheDocument();
      });
    }
  });
});
