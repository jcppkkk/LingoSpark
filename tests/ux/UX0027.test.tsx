import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import { testFormInput } from '../utils/form-helpers';
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

describe('UX0027: 聽寫模式 - 輸入單字', () => {
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

  it('應該在輸入框中輸入英文單字', async () => {
    // 觸發條件：使用者在聽寫模式，已播放語音
    // 操作步驟：
    // 1. 使用者在聽寫模式，看到中文定義和輸入框
    // 2. 在輸入框中輸入英文單字
    // 3. 輸入框即時顯示輸入的文字
    // 
    // 預期結果：
    // - 輸入框可以輸入文字
    // - 輸入框自動獲得焦點（方便快速輸入）
    // - 輸入的文字即時顯示
    // - 輸入框有適當的大小和字體（方便閱讀）
    // - 可以清除輸入重新輸入

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
    
    // 驗證輸入框自動獲得焦點
    await waitFor(() => {
      expect(input).toHaveFocus();
    });

    // 輸入單字
    await userEvent.type(input, 'computer');

    // 驗證輸入值顯示
    expect(input).toHaveValue('computer');
  });
});
