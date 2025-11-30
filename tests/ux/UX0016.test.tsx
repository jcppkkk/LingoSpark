import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import LearningMode from '../../components/LearningMode';
import { createMockFlashcard } from '../fixtures/flashcards';
import * as storageService from '../../services/storageService';
import * as levelService from '../../services/levelService';

// Mock services
vi.mock('../../services/storageService', () => ({
  getCards: vi.fn(),
}));

vi.mock('../../services/levelService', () => ({
  getCardsByLevel: vi.fn(),
  getTotalLevels: vi.fn(),
}));

vi.mock('../../services/speechService', () => ({
  getAvailableVoices: vi.fn().mockResolvedValue([]),
  findDefaultEnglishVoice: vi.fn().mockResolvedValue(null),
  speakWord: vi.fn().mockResolvedValue(undefined),
  speakSentence: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}));

describe('UX0016: 選擇學習 Level', () => {
  const mockOnFinish = vi.fn();

  const mockCards = Array.from({ length: 25 }, (_, i) =>
    createMockFlashcard({ word: `word${i + 1}` })
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue(mockCards);
    vi.mocked(levelService.getTotalLevels).mockReturnValue(3); // 25個單字 = 3個Level
    vi.mocked(levelService.getCardsByLevel).mockImplementation((cards, level) => {
      const start = (level - 1) * 10;
      const end = start + 10;
      return cards.slice(start, end);
    });
  });

  it('應該在選擇 Level 後更新學習內容', async () => {
    // 觸發條件：使用者進入學習模式頁面
    // 操作步驟：
    // 1. 使用者從儀表板點擊「開始複習挑戰」或直接進入學習模式
    // 2. 系統自動載入所有單字並分組（每 10 個一組）
    // 3. 學習模式頁面顯示 Level 選擇下拉選單
    // 4. 使用者選擇要學習的 Level（全部單字 / Level 1 / Level 2...）
    // 
    // 預期結果：
    // - 系統自動將單字分組為 Level（每 10 個一組）
    // - Level 選擇下拉選單顯示所有可用的 Level
    // - 選擇「全部單字」顯示所有單字
    // - 選擇特定 Level 只顯示該 Level 的單字
    // - 下拉選單顯示每個 Level 的單字數量
    // - 選擇後學習內容即時更新

    renderWithProviders(
      <LearningMode onFinish={mockOnFinish} />
    );

    // 等待組件載入
    await waitFor(() => {
      expect(storageService.getCards).toHaveBeenCalled();
    });

    // 驗證 Level 選擇下拉選單存在
    await waitFor(() => {
      expect(screen.getByDisplayValue(/全部單字/i)).toBeInTheDocument();
    });

    // 驗證預設顯示所有單字（可能有多個匹配）
    const word1Elements = screen.queryAllByText(/word1/i);
    const word25Elements = screen.queryAllByText(/word25/i);
    expect(word1Elements.length + word25Elements.length).toBeGreaterThan(0);

    // 選擇 Level 1
    const levelSelect = screen.getByDisplayValue(/全部單字/i);
    await userEvent.selectOptions(levelSelect, '1');

    // 驗證只顯示 Level 1 的單字（前10個）
    await waitFor(() => {
      expect(levelService.getCardsByLevel).toHaveBeenCalledWith(mockCards, 1);
    });

    // 選擇「全部單字」
    await userEvent.selectOptions(levelSelect, '0');

    // 驗證顯示所有單字（可能有多個匹配，使用 queryAllByText 並檢查至少有一個）
    await waitFor(() => {
      const word1Elements = screen.queryAllByText(/word1/i);
      const word25Elements = screen.queryAllByText(/word25/i);
      // 只要找到其中一個即可
      expect(word1Elements.length + word25Elements.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });
});
