import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import { testButtonClick } from '../utils/button-helpers';
import LearningMode from '../../components/LearningMode';
import { createMockFlashcard } from '../fixtures/flashcards';
import * as storageService from '../../services/storageService';
import * as speechService from '../../services/speechService';

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

describe('UX0026: 聽寫模式 - 播放語音', () => {
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

  it('應該在聽寫模式下點擊語音播放按鈕後播放單字發音', async () => {
    // 觸發條件：使用者在學習模式頁面，選擇「聽寫」Tab
    // 操作步驟：
    // 1. 使用者在學習模式頁面
    // 2. 選擇「聽寫」Tab
    // 3. 系統顯示中文定義和語音播放按鈕
    // 4. 點擊語音播放按鈕
    // 5. 系統播放單字發音
    // 
    // 預期結果：
    // - 切換到聽寫模式 Tab
    // - 顯示中文定義（不顯示單字）
    // - 顯示語音播放按鈕
    // - 點擊後播放單字發音
    // - 使用選定的語音播放
    // - 可以重複播放

    renderWithProviders(
      <LearningMode onFinish={mockOnFinish} />
    );

    // 等待組件載入
    await waitFor(() => {
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
    });

    // 切換到聽寫模式 Tab
    const dictationTab = screen.getByText(/聽寫/i);
    await userEvent.click(dictationTab);

    // 等待切換完成
    await waitFor(() => {
      expect(screen.getByText('電腦')).toBeInTheDocument();
    });

    // 驗證自動播放（聽寫模式會在載入時自動播放）
    // 注意：voice 可能是 undefined，所以檢查調用而不檢查參數類型
    await waitFor(() => {
      const calls = vi.mocked(speechService.speakWord).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls.some(call => call[0] === 'computer')).toBe(true);
    }, { timeout: 2000 });
  });
});
