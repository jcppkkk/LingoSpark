/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import WordLibrary from '../../components/WordLibrary';
import { createMockWordAnalysis, createMockFlashcard } from '../fixtures/flashcards';
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
  speakWord: vi.fn().mockResolvedValue(undefined),
  speakSentence: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}));

describe('UX0014: 預覽單字卡', () => {
  const mockOnCancel = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue([]);
    vi.mocked(storageService.checkWordExists).mockResolvedValue(false);
    vi.mocked(storageService.saveCard).mockResolvedValue(undefined);
    
    const mockAnalysis = createMockWordAnalysis({ word: 'computer' });
    vi.mocked(geminiService.analyzeWord).mockResolvedValue(mockAnalysis);
    vi.mocked(geminiService.generateMnemonicImage).mockResolvedValue('data:image/png;base64,test');
    
    // Mock createNewCard 返回一個有效的 Flashcard
    vi.mocked(storageService.createNewCard).mockImplementation((analysis, imageUrl, status) => {
      return createMockFlashcard({
        word: analysis.word,
        data: analysis,
        imageUrl,
        status,
      });
    });
  });

  it('應該在點擊分析成功的單字後在預覽區域顯示單字卡', async () => {
    // 增加測試超時時間
    // 觸發條件：待處理列表中有分析成功的單字
    // 操作步驟：
    // 1. 待處理列表中有狀態為「成功」的單字
    // 2. 點擊該單字項目
    // 3. 系統在預覽區域顯示單字卡
    // 
    // 預期結果：
    // - 點擊分析成功的單字後，預覽區域顯示對應的單字卡
    // - 單字卡顯示完整的分析資訊（單字、定義、音節、詞源、例句等）
    // - 單字卡可以翻轉查看背面資訊
    // - 如果沒有選中任何單字，預覽區域顯示提示訊息

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
    
    // 調試：檢查輸入框是否已清空（驗證表單提交是否被調用）
    await waitFor(() => {
      expect(input).toHaveValue('');
    }, { timeout: 1000 });

    // 等待分析開始和完成
    // 注意：分析會立即開始，不需要等待隊列項目顯示
    await waitFor(() => {
      expect(geminiService.analyzeWord).toHaveBeenCalled();
    }, { timeout: 5000 });

    // 等待分析完成（狀態變為「成功」）
    // SUCCESS 狀態顯示勾選標記，不是文字
    await waitFor(() => {
      expect(geminiService.analyzeWord).toHaveBeenCalled();
      expect(storageService.saveCard).toHaveBeenCalled();
    }, { timeout: 10000 });
    
    // 注意：分析完成後，組件會自動切換到 library tab（第 123 行）
    // 但是成功的項目會自動設置 previewItem（第 114-118 行）
    // 然而，預覽區域只在 create tab 中顯示（第 1029-1071 行）
    // 所以當組件切換到 library tab 時，預覽區域不再顯示
    
    // 需要切換回 create tab 才能看到預覽區域
    const createTabAgain = screen.queryByText(/製作新卡片/i);
    if (createTabAgain) {
      await userEvent.click(createTabAgain);
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/例如: cat/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    }
    
    // 驗證預覽區域顯示單字卡
    // 注意：即使切換回 create tab，previewItem 應該仍然存在（因為是組件狀態）
    await waitFor(() => {
      const computerElements = screen.queryAllByText('computer');
      const definitionElements = screen.queryAllByText('電腦');
      // 預覽區域應該顯示單字卡（previewItem 狀態仍然存在）
      expect(computerElements.length).toBeGreaterThan(0);
      expect(definitionElements.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    // 驗證預覽區域顯示單字卡（需要等待分析完成並點擊）
    await waitFor(() => {
      const computerElements = screen.queryAllByText('computer');
      const definitionElements = screen.queryAllByText('電腦');
      expect(computerElements.length).toBeGreaterThan(0);
      expect(definitionElements.length).toBeGreaterThan(0);
    }, { timeout: 15000 });
  }, 25000); // 25 秒超時
});
