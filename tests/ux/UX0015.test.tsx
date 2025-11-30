import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import WordLibrary from '../../components/WordLibrary';
import { createMockWordAnalysis } from '../fixtures/flashcards';
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

describe('UX0015: 儲存新單字卡', () => {
  const mockOnCancel = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue([]);
    vi.mocked(storageService.checkWordExists).mockResolvedValue(false);
    vi.mocked(storageService.createNewCard).mockResolvedValue(undefined);
    vi.mocked(storageService.saveCard).mockResolvedValue(undefined);
    
    const mockAnalysis = createMockWordAnalysis({ word: 'computer' });
    vi.mocked(geminiService.analyzeWord).mockResolvedValue(mockAnalysis);
    vi.mocked(geminiService.generateMnemonicImage).mockResolvedValue('data:image/png;base64,test');
  });

  it('應該在分析成功後自動儲存單字卡並刷新列表', async () => {
    // 觸發條件：待處理列表中有分析成功的單字，系統自動儲存
    // 操作步驟：
    // 1. 單字分析成功後
    // 2. 系統自動生成圖片（如果 AI 分析包含 imagePrompt）
    // 3. 系統自動將單字卡儲存到資料庫
    // 4. 單字卡狀態變更為「成功」
    // 5. 系統自動切換到字庫管理標籤頁
    // 6. 字庫列表自動刷新
    // 
    // 預期結果：
    // - 分析成功後自動儲存單字卡
    // - 如果圖片生成成功，單字卡包含圖片
    // - 如果圖片生成失敗，單字卡仍可儲存（僅文字內容）
    // - 儲存後單字卡出現在字庫列表中
    // - 系統自動切換到字庫管理標籤頁
    // - 字庫列表顯示新加入的單字
    // - 待處理列表中的單字狀態更新為「成功」

    renderWithProviders(
      <WordLibrary onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
    );

    // 切換到製作新卡片標籤
    const createTab = screen.getByText(/製作新卡片/i);
    await userEvent.click(createTab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/例如: cat/i)).toBeInTheDocument();
    });

    // 輸入單字並提交
    const input = screen.getByPlaceholderText(/例如: cat/i);
    await userEvent.type(input, 'computer');
    await userEvent.keyboard('{Enter}');

    // 等待分析完成
    await waitFor(() => {
      expect(geminiService.analyzeWord).toHaveBeenCalled();
    }, { timeout: 3000 });

    // 等待儲存完成
    await waitFor(() => {
      expect(storageService.createNewCard).toHaveBeenCalled();
      expect(storageService.saveCard).toHaveBeenCalled();
    }, { timeout: 5000 });

    // 驗證自動切換到字庫管理標籤頁
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜尋單字或定義/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // 驗證字庫列表刷新（重新載入卡片）
    await waitFor(() => {
      expect(storageService.getCards).toHaveBeenCalledTimes(2); // 初始載入 + 刷新
    });
  });
});
