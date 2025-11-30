import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import { testCardFlip } from '../utils/card-helpers';
import LearningMode from '../../components/LearningMode';
import { createMockFlashcard } from '../fixtures/flashcards';
import * as storageService from '../../services/storageService';

// Mock services
vi.mock('../../services/storageService', () => ({
  getCards: vi.fn(),
}));

vi.mock('../../services/levelService', () => ({
  getCardsByLevel: vi.fn(),
  getTotalLevels: vi.fn().mockReturnValue(1),
}));

vi.mock('../../services/speechService', () => ({
  getAvailableVoices: vi.fn().mockResolvedValue([]),
  findDefaultEnglishVoice: vi.fn().mockResolvedValue(null),
  speakWord: vi.fn().mockResolvedValue(undefined),
  speakSentence: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}));

describe('UX0021: 學習模式 - 翻轉卡片', () => {
  const mockOnFinish = vi.fn();

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

  it('應該在點擊單字卡後翻轉顯示背面內容', async () => {
    // 觸發條件：使用者在學習模式，查看單字卡正面
    // 操作步驟：
    // 1. 使用者在學習模式，單字卡正面顯示中
    // 2. 點擊單字卡（或翻轉按鈕）
    // 3. 單字卡翻轉顯示背面
    // 
    // 預期結果：
    // - 點擊單字卡後觸發翻轉動畫
    // - 單字卡翻轉到背面
    // - 背面顯示中文定義
    // - 背面顯示例句（英文和中文翻譯）
    // - 背面顯示詞源分析（如果有）
    // - 再次點擊可以翻轉回正面

    renderWithProviders(
      <LearningMode onFinish={mockOnFinish} />
    );

    // 等待組件載入
    await waitFor(() => {
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
    });

    // 驗證正面內容
    const computerElements = screen.getAllByText('computer');
    expect(computerElements.length).toBeGreaterThan(0);

    // 查找單字卡元素並點擊（FlashcardComponent 應該可以點擊翻轉）
    const cardElement = computerElements[0].closest('div[class*="card"]') ||
                       computerElements[0].closest('div');
    
    if (cardElement) {
      await userEvent.click(cardElement as HTMLElement);

      // 等待翻轉動畫完成並驗證背面內容
      await waitFor(() => {
        expect(screen.getByText('電腦')).toBeInTheDocument();
        expect(screen.getByText(/I use a computer every day/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    }
  });
});
