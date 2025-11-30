import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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

describe('UX0018: 學習模式 - 查看單字卡', () => {
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

  it('應該在選擇學習 Tab 後顯示大單字卡', async () => {
    // 觸發條件：使用者在學習模式頁面，選擇「學習」Tab
    // 操作步驟：
    // 1. 使用者在學習模式頁面
    // 2. 選擇「學習」Tab
    // 3. 系統顯示大單字卡
    // 4. 單字以彩色顯示（母音紅色、子音藍色）
    // 
    // 預期結果：
    // - 切換到學習模式 Tab
    // - 顯示大單字卡（正面）
    // - 單字字母以顏色標示（母音 a/e/i/o/u 為紅色，子音為藍色）
    // - 顯示 IPA 音標
    // - 顯示進度條和當前單字編號（例如：1 / 10）
    // - 單字卡可以點擊翻轉查看背面

    renderWithProviders(
      <LearningMode onFinish={mockOnFinish} />
    );

    // 等待組件載入
    await waitFor(() => {
      expect(storageService.getCards).toHaveBeenCalled();
    });

    // 驗證學習模式 Tab 已選擇（預設）
    // 驗證單字卡顯示
    await waitFor(() => {
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
      // IPA 音標可能包含特殊字符，使用更靈活的匹配（可能有多個匹配）
      const ipaElements = screen.queryAllByText(/kəmˈpjuːtər|kəm'pjuːtər/i);
      expect(ipaElements.length).toBeGreaterThan(0);
    });

    // 驗證進度顯示
    expect(screen.getByText(/1.*1|1 \/ 1/i)).toBeInTheDocument();
  });
});
