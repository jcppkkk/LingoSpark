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
  stopSpeaking: vi.fn(),
}));

describe('UX0007: 篩選單字（全部/待複習/已學會）', () => {
  const mockOnCancel = vi.fn();
  const mockOnSuccess = vi.fn();

  const now = Date.now();
  const mockCards = [
    createMockFlashcard({
      word: 'apple',
      nextReviewDate: now - 1000, // 待複習
      repetition: 0,
    }),
    createMockFlashcard({
      word: 'banana',
      nextReviewDate: now + 100000, // 未到期
      repetition: 5, // 已學會
    }),
    createMockFlashcard({
      word: 'computer',
      nextReviewDate: now - 1000, // 待複習
      repetition: 2,
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue(mockCards);
  });

  it('應該在選擇篩選條件後過濾單字列表', async () => {
    // 觸發條件：使用者在字庫管理標籤頁
    // 操作步驟：
    // 1. 使用者在字庫管理標籤頁
    // 2. 點擊篩選下拉選單
    // 3. 選擇篩選條件（全部/待複習/已學會）
    // 4. 系統過濾單字列表
    // 
    // 預期結果：
    // - 下拉選單可以選擇篩選條件
    // - 選擇後單字列表即時更新
    // - 顯示符合篩選條件的單字
    // - 「全部」顯示所有單字
    // - 「待複習」只顯示待複習的單字
    // - 「已學會」只顯示已學會的單字

    renderWithProviders(
      <WordLibrary onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
    );

    // 等待組件載入
    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
    });

    // 驗證所有單字都顯示（預設為「全部」）
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
    expect(screen.getByText('computer')).toBeInTheDocument();

    // 選擇「待複習」篩選
    const filterSelect = screen.getByDisplayValue('全部');
    await userEvent.selectOptions(filterSelect, 'due');

    // 驗證只顯示待複習的單字
    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.queryByText('banana')).not.toBeInTheDocument(); // 已學會，不顯示
      expect(screen.getByText('computer')).toBeInTheDocument();
    });

    // 選擇「已學會」篩選
    await userEvent.selectOptions(filterSelect, 'learned');

    // 驗證只顯示已學會的單字
    await waitFor(() => {
      expect(screen.queryByText('apple')).not.toBeInTheDocument();
      expect(screen.getByText('banana')).toBeInTheDocument();
      expect(screen.queryByText('computer')).not.toBeInTheDocument();
    });

    // 選擇「全部」篩選
    await userEvent.selectOptions(filterSelect, 'all');

    // 驗證顯示所有單字
    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getByText('banana')).toBeInTheDocument();
      expect(screen.getByText('computer')).toBeInTheDocument();
    });
  });
});
