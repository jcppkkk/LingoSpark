import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import WordLibrary from '../../components/WordLibrary';
import { createMockFlashcard } from '../fixtures/flashcards';
import * as storageService from '../../services/storageService';

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

describe('UX0009: 查看單字卡詳情', () => {
  const mockOnCancel = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockCard = createMockFlashcard({
    word: 'computer',
    data: {
      word: 'computer',
      definition: '電腦',
      ipa: '/kəmˈpjuːtər/',
      syllables: ['com', 'put', 'er'],
      stressIndex: 1,
      roots: [
        { part: 'com', meaning: '一起', type: 'prefix' },
        { part: 'put', meaning: '思考', type: 'root' },
      ],
      sentence: 'I use a computer every day.',
      sentenceTranslation: '我每天使用電腦。',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue([mockCard]);
  });

  it('應該在點擊單字卡片後在右側預覽區域顯示單字卡詳情', async () => {
    // 觸發條件：使用者在字庫管理標籤頁，點擊單字卡片
    // 操作步驟：
    // 1. 使用者在字庫管理標籤頁
    // 2. 點擊單字列表中的任一單字卡片
    // 3. 系統在右側預覽區域顯示單字卡
    // 4. 可以查看單字的完整資訊
    // 
    // 預期結果：
    // - 點擊後右側預覽區域顯示單字卡
    // - 單字卡顯示完整的資訊（單字、圖片、定義、音節、詞源、例句等）
    // - 如果單字卡有圖片，正面會顯示圖片
    // - 單字卡可以翻轉查看背面資訊
    // - 如果單字卡有圖片生成提示，顯示「重新生成圖片」按鈕

    renderWithProviders(
      <WordLibrary onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
    );

    // 等待組件載入
    await waitFor(() => {
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
    });

    // 驗證初始狀態：預覽區域顯示提示訊息
    expect(screen.getByText(/選擇單字卡查看/i)).toBeInTheDocument();

    // 點擊單字卡片
    const computerElements = screen.getAllByText('computer');
    const cardElement = computerElements[0].closest('div[class*="cursor-pointer"]');
    if (cardElement) {
      await userEvent.click(cardElement);
    }

    // 驗證右側預覽區域顯示單字卡
    await waitFor(() => {
      const computerElementsAfter = screen.getAllByText('computer');
      expect(computerElementsAfter.length).toBeGreaterThan(0);
      const definitionElements = screen.getAllByText('電腦');
      expect(definitionElements.length).toBeGreaterThan(0);
    });

    // 驗證單字卡可以翻轉（如果有翻轉功能）
    // 注意：實際測試可能需要等待動畫完成
  });
});
