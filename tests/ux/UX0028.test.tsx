import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import { testAnswerCheck } from '../utils/answer-helpers';
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

describe('UX0028: 聽寫模式 - 檢查答案', () => {
  const mockOnFinish = vi.fn();

  const mockCard = createMockFlashcard({
    word: 'computer',
    data: {
      word: 'computer',
      definition: '電腦',
      ipa: '/kəmˈpjuːtər/',
      syllables: ['com', 'put', 'er'],
      stressIndex: 1,
      roots: [],
      sentence: 'I use a computer every day.',
      sentenceTranslation: '我每天使用電腦。',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue([mockCard]);
  });

  it('應該在輸入單字後檢查答案並顯示結果', async () => {
    // 觸發條件：使用者在聽寫模式，已輸入單字
    // 操作步驟：
    // 1. 使用者在聽寫模式，輸入框中有文字
    // 2. 點擊「檢查」按鈕或按 Enter 鍵
    // 3. 系統檢查答案是否正確
    // 4. 顯示檢查結果
    // 
    // 預期結果：
    // - 點擊「檢查」或按 Enter 後開始檢查答案
    // - 答案比較不區分大小寫
    // - 如果答案正確：
    //   - 輸入框變為綠色邊框和背景
    //   - 顯示「太棒了！」訊息（綠色，動畫效果）
    //   - 播放成功音效（上升音調）
    //   - 輸入框禁用
    //   - 顯示「下一個」按鈕
    // - 如果答案錯誤：
    //   - 輸入框變為紅色邊框和背景
    //   - 顯示「正確答案是: [單字]」訊息（紅色）
    //   - 可以重新輸入
    // - 檢查後可以點擊「下一個」繼續下一個單字

    renderWithProviders(
      <LearningMode onFinish={mockOnFinish} />
    );

    // 等待組件載入並切換到聽寫模式
    await waitFor(() => {
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
    });

    const dictationTab = screen.getByText(/聽寫/i);
    await userEvent.click(dictationTab);

    // 等待聽寫模式載入
    await waitFor(() => {
      expect(screen.getByText('電腦')).toBeInTheDocument();
    });

    // 查找輸入框
    const input = screen.getByRole('textbox') || screen.getByPlaceholderText(/輸入/i);

    // 輸入正確答案
    await userEvent.type(input, 'computer');

    // 按 Enter 檢查答案
    await userEvent.keyboard('{Enter}');

    // 驗證答案檢查結果（DictationModeTab 顯示 "答對了！"）
    await waitFor(() => {
      expect(screen.getByText(/答對了/i)).toBeInTheDocument();
    });

    // 驗證輸入框禁用
    expect(input).toBeDisabled();
  });

  it('應該在輸入錯誤答案時顯示錯誤訊息', async () => {
    renderWithProviders(
      <LearningMode onFinish={mockOnFinish} />
    );

    await waitFor(() => {
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
    });

    const dictationTab = screen.getByText(/聽寫/i);
    await userEvent.click(dictationTab);

    await waitFor(() => {
      expect(screen.getByText('電腦')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox') || screen.getByPlaceholderText(/輸入/i);

    // 輸入錯誤答案
    await userEvent.type(input, 'wrong');

    // 按 Enter 檢查答案
    await userEvent.keyboard('{Enter}');

    // 驗證顯示錯誤訊息
    await waitFor(() => {
      expect(screen.getByText(/正確答案是|再試一次/i)).toBeInTheDocument();
    });
  });
});
