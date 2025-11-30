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

describe('UX0022: 學習模式 - 切換到下一個單字', () => {
  const mockOnFinish = vi.fn();

  const mockCards = [
    createMockFlashcard({ word: 'apple', id: 'card-1' }),
    createMockFlashcard({ word: 'banana', id: 'card-2' }),
    createMockFlashcard({ word: 'computer', id: 'card-3' }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue(mockCards);
  });

  it('應該在點擊下一個按鈕後切換到下一個單字', async () => {
    // 觸發條件：使用者在學習模式，查看當前單字卡
    // 操作步驟：
    // 1. 使用者在學習模式，查看當前單字卡
    // 2. 點擊「下一個」按鈕
    // 3. 系統切換到下一個單字
    // 
    // 預期結果：
    // - 點擊「下一個」按鈕後切換到下一個單字
    // - 如果當前是最後一個單字，切換到第一個單字（循環）
    // - 進度條更新顯示當前進度
    // - 單字編號更新（例如：2 / 10）
    // - 單字卡重置為正面顯示
    // - 音節顯示狀態重置為隱藏

    renderWithProviders(
      <LearningMode onFinish={mockOnFinish} />
    );

    // 等待組件載入
    await waitFor(() => {
      const appleElements = screen.getAllByText('apple');
      expect(appleElements.length).toBeGreaterThan(0);
    });

    // 驗證初始進度顯示
    expect(screen.getByText(/1.*3|1 \/ 3/i)).toBeInTheDocument();

    // 點擊「下一個」按鈕
    const nextButton = screen.getByText(/下一個/i);
    await userEvent.click(nextButton);

    // 驗證切換到下一個單字
    await waitFor(() => {
      const bananaElements = screen.getAllByText('banana');
      expect(bananaElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/2.*3|2 \/ 3/i)).toBeInTheDocument();
    });

    // 再次點擊「下一個」
    await userEvent.click(nextButton);

    // 驗證切換到第三個單字
    await waitFor(() => {
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/3.*3|3 \/ 3/i)).toBeInTheDocument();
    });

    // 再次點擊「下一個」（應該循環回第一個）
    await userEvent.click(nextButton);

    // 驗證循環回第一個單字
    await waitFor(() => {
      const appleElements = screen.getAllByText('apple');
      expect(appleElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/1.*3|1 \/ 3/i)).toBeInTheDocument();
    });
  });
});
