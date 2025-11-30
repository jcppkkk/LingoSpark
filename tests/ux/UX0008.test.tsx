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

describe('UX0008: 排序單字（A-Z/新增日期/熟練度）', () => {
  const mockOnCancel = vi.fn();
  const mockOnSuccess = vi.fn();

  const now = Date.now();
  const mockCards = [
    createMockFlashcard({
      word: 'zebra',
      createdAt: now - 2000,
      repetition: 1,
      efactor: 2.0,
    }),
    createMockFlashcard({
      word: 'apple',
      createdAt: now - 1000,
      repetition: 3,
      efactor: 2.5,
    }),
    createMockFlashcard({
      word: 'banana',
      createdAt: now,
      repetition: 5,
      efactor: 3.0,
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue(mockCards);
  });

  it('應該在選擇排序方式後重新排序單字列表', async () => {
    // 觸發條件：使用者在字庫管理標籤頁
    // 操作步驟：
    // 1. 使用者在字庫管理標籤頁
    // 2. 點擊排序下拉選單
    // 3. 選擇排序方式（A-Z/新增日期/熟練度）
    // 4. 系統重新排序單字列表
    // 
    // 預期結果：
    // - 下拉選單可以選擇排序方式
    // - 選擇後單字列表即時重新排序
    // - 「A-Z」按字母順序排序
    // - 「新增日期」按建立時間排序（最新在前）
    // - 「熟練度」按熟練度排序（高熟練度在前）

    renderWithProviders(
      <WordLibrary onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
    );

    // 等待組件載入
    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
    });

    // 驗證預設排序（A-Z）
    const cards = screen.getAllByText(/apple|banana|zebra/i);
    expect(cards[0]).toHaveTextContent('apple');
    expect(cards[1]).toHaveTextContent('banana');
    expect(cards[2]).toHaveTextContent('zebra');

    // 選擇「新增日期」排序
    const sortSelect = screen.getByDisplayValue('A-Z');
    await userEvent.selectOptions(sortSelect, 'date');

    // 驗證按日期排序（最新在前：banana > apple > zebra）
    await waitFor(() => {
      const sortedCards = screen.getAllByText(/apple|banana|zebra/i);
      expect(sortedCards[0]).toHaveTextContent('banana'); // 最新
      expect(sortedCards[1]).toHaveTextContent('apple');
      expect(sortedCards[2]).toHaveTextContent('zebra'); // 最舊
    });

    // 選擇「熟練度」排序
    await userEvent.selectOptions(sortSelect, 'proficiency');

    // 驗證按熟練度排序（高熟練度在前：banana > apple > zebra）
    await waitFor(() => {
      const sortedCards = screen.getAllByText(/apple|banana|zebra/i);
      expect(sortedCards[0]).toHaveTextContent('banana'); // 最高熟練度
      expect(sortedCards[1]).toHaveTextContent('apple');
      expect(sortedCards[2]).toHaveTextContent('zebra'); // 最低熟練度
    });

    // 切換回「A-Z」排序
    await userEvent.selectOptions(sortSelect, 'a-z');

    // 驗證恢復字母順序
    await waitFor(() => {
      const sortedCards = screen.getAllByText(/apple|banana|zebra/i);
      expect(sortedCards[0]).toHaveTextContent('apple');
      expect(sortedCards[1]).toHaveTextContent('banana');
      expect(sortedCards[2]).toHaveTextContent('zebra');
    });
  });
});
