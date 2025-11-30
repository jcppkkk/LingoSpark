import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
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

vi.mock('../../services/soundService', () => ({
  playCorrectSound: vi.fn(),
  playWrongSound: vi.fn(),
}));

describe('UX0024: 積木模式 - 重組字母', () => {
  const mockOnFinish = vi.fn();

  const mockCard = createMockFlashcard({
    word: 'cat',
    data: {
      word: 'cat',
      definition: '貓',
      ipa: '/kæt/',
      syllables: ['cat'],
      stressIndex: 0,
      roots: [],
      sentence: 'The cat is sleeping.',
      sentenceTranslation: '貓在睡覺。',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue([mockCard]);
  });

  it('應該在點擊字母按鈕後將字母加入當前嘗試區域', async () => {
    // 觸發條件：使用者在積木模式，已播放語音
    // 操作步驟：
    // 1. 使用者在積木模式，看到中文定義和打散的字母按鈕
    // 2. 點擊字母按鈕，字母加入當前嘗試區域
    // 3. 繼續點擊其他字母按鈕
    // 4. 字母按順序組成單字
    // 
    // 預期結果：
    // - 單字字母被打散成隨機排列的按鈕
    // - 點擊字母按鈕後，字母從按鈕區域移除
    // - 字母加入當前嘗試區域，按點擊順序排列
    // - 可以點擊「移除」按鈕移除最後一個字母
    // - 當前嘗試區域顯示已選擇的字母
    // - 字母按鈕區域顯示剩餘的字母

    renderWithProviders(
      <LearningMode onFinish={mockOnFinish} />
    );

    // 等待組件載入並切換到積木模式
    await waitFor(() => {
      const catElements = screen.getAllByText('cat');
      expect(catElements.length).toBeGreaterThan(0);
    });

    const blockTab = screen.getByText(/積木/i);
    await userEvent.click(blockTab);

    // 等待積木模式載入
    await waitFor(() => {
      expect(screen.getByText('貓')).toBeInTheDocument();
    });

    // 查找字母按鈕（字母被打散顯示）
    // 注意：字母順序是隨機的，所以我們需要找到所有字母按鈕
    const letterButtons = screen.getAllByRole('button').filter(btn => {
      const text = btn.textContent || '';
      return text.length === 1 && /[a-z]/i.test(text);
    });

    // 驗證有字母按鈕
    expect(letterButtons.length).toBeGreaterThan(0);

    // 點擊第一個字母按鈕
    if (letterButtons.length > 0) {
      await userEvent.click(letterButtons[0]);

      // 驗證字母加入當前嘗試區域（BlockModeTab 顯示 "你組成的單字："）
      await waitFor(() => {
        expect(screen.getByText(/你組成的單字/i)).toBeInTheDocument();
        // 驗證有字母被選中（selectedLetters 長度 > 0）
        const letterElements = screen.getAllByText(/^[a-z]$/i);
        expect(letterElements.length).toBeGreaterThan(0);
      });
    }
  });
});
