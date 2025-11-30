import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import { testCardFlip } from '../utils/card-helpers';
import FlashcardComponent from '../../components/FlashcardComponent';
import { createMockFlashcard } from '../fixtures/flashcards';

// Mock speech service
vi.mock('../../services/speechService', () => ({
  speakWord: vi.fn().mockResolvedValue(undefined),
  speakSentence: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}));

describe('UX0030: 翻轉單字卡查看背面', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應該在點擊卡片後翻轉顯示背面內容', async () => {
    // 觸發條件：使用者在查看單字卡正面
    // 操作步驟：
    // 1. 使用者在查看單字卡正面
    // 2. 點擊單字卡（或翻轉按鈕）
    // 3. 單字卡執行翻轉動畫
    // 4. 顯示單字卡背面內容
    // 
    // 預期結果：
    // - 點擊單字卡後觸發翻轉動畫（3D 翻轉效果）
    // - 動畫流暢自然（約 700ms）
    // - 翻轉後顯示背面內容
    // - 背面顯示單字（標題）
    // - 背面顯示音節拆解和 IPA
    // - 背面顯示中文定義（突出顯示）
    // - 背面顯示詞源分析（如果有）
    // - 背面顯示例句（英文和中文翻譯）
    // - 背面內容可以滾動查看（如果內容較長）
    // - 再次點擊可以翻轉回正面

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

    const { container } = renderWithProviders(
      <FlashcardComponent card={mockCard} />
    );

    // 驗證正面內容
    const computerElements = screen.getAllByText('computer');
    expect(computerElements.length).toBeGreaterThan(0);

    // 找到卡片元素並點擊
    const cardElement = container.querySelector('[class*="card"]') || container.firstChild;
    if (cardElement) {
      await userEvent.click(cardElement as HTMLElement);
    }

    // 等待翻轉動畫完成
    await waitFor(
      () => {
        // 驗證背面內容
        expect(screen.getByText('電腦')).toBeInTheDocument();
        expect(screen.getByText(/I use a computer every day/i)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });
});

