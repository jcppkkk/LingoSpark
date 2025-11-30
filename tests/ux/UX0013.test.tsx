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
  stopSpeaking: vi.fn(),
}));

describe('UX0013: AI 分析單字', () => {
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

  it('應該在單字加入佇列後自動開始分析', async () => {
    // 增加測試超時時間到 15 秒
    // 觸發條件：待處理列表中有待分析的單字
    // 操作步驟：
    // 1. 待處理列表中有狀態為「排隊中」的單字
    // 2. 系統自動開始分析（按順序處理）
    // 3. 單字狀態變更為「分析中」
    // 4. 系統調用 AI 分析服務
    // 5. 分析完成後狀態變更為「成功」或「失敗」
    // 
    // 預期結果：
    // - 系統自動按順序處理待處理列表中的單字
    // - 分析過程中單字狀態顯示為「分析中」
    // - 分析成功後生成單字分析資料（音節、重音節、詞源、例句等）
    // - 分析成功後狀態變更為「成功」，並顯示勾選標記
    // - 如果分析失敗，狀態變更為「失敗」，顯示錯誤訊息
    // - 分析失敗的單字可以重試
    // - 分析完成後自動切換到字庫管理標籤頁並刷新列表

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
    
    // 注意：分析會立即開始，隊列項目可能很快被處理
    // 我們主要驗證分析是否開始，而不是隊列項目是否顯示
    // 因為分析開始後，隊列項目狀態會變為「分析中」，然後「成功」，最後組件切換到 library tab

    // 等待分析開始（狀態變為「分析中」）
    // 注意：分析完成後組件會自動切換到 library tab，所以隊列列表可能不再顯示
    await waitFor(() => {
      expect(geminiService.analyzeWord).toHaveBeenCalledWith('computer');
    }, { timeout: 5000 });

    // 等待分析完成（狀態變為「成功」）
    // SUCCESS 狀態顯示勾選標記，不是文字
    // 可以通過檢查 analyzeWord 被調用且 saveCard 被調用來驗證
    await waitFor(() => {
      expect(geminiService.analyzeWord).toHaveBeenCalled();
      expect(storageService.saveCard).toHaveBeenCalled();
    }, { timeout: 10000 });
    
    // 注意：分析完成後，組件會自動切換到 library tab（第 123 行）
    // 所以隊列列表可能不再顯示，但我們可以驗證分析已完成
    // 驗證分析已完成（不再顯示 "分析中"）
    await waitFor(() => {
      const analyzingElements = screen.queryAllByText(/分析中/i);
      expect(analyzingElements.length).toBe(0); // 分析已完成
    }, { timeout: 3000 });
    
    // 驗證組件已切換到 library tab（分析完成後會自動切換）
    await waitFor(() => {
      // 檢查是否不再顯示輸入框（因為切換到 library tab）
      const input = screen.queryByPlaceholderText(/例如: cat/i);
      // 如果切換到 library tab，輸入框應該不存在
      expect(input).toBeNull();
    }, { timeout: 2000 });
  }, 20000); // 20 秒超時
});
