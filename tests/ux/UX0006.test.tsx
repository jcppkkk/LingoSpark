import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import { testListSearch } from '../utils/list-helpers';
import WordLibrary from '../../components/WordLibrary';
import { createMockFlashcard, createMockWordAnalysis } from '../fixtures/flashcards';
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

describe('UX0006: 搜尋單字', () => {
  const mockOnCancel = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockCards = [
    createMockFlashcard({ word: 'apple', data: createMockWordAnalysis({ word: 'apple', definition: '蘋果' }) }),
    createMockFlashcard({ word: 'banana', data: createMockWordAnalysis({ word: 'banana', definition: '香蕉' }) }),
    createMockFlashcard({ word: 'computer', data: createMockWordAnalysis({ word: 'computer', definition: '電腦' }) }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue(mockCards);
  });

  it('應該在輸入搜尋關鍵字後即時過濾單字列表', async () => {
    // 觸發條件：使用者在字庫管理標籤頁
    // 操作步驟：
    // 1. 使用者在字庫管理標籤頁
    // 2. 在搜尋框輸入單字或定義關鍵字
    // 3. 系統即時過濾單字列表
    // 
    // 預期結果：
    // - 搜尋框可以輸入文字
    // - 輸入後即時過濾單字列表
    // - 顯示符合搜尋條件的單字（匹配單字或定義）
    // - 清空搜尋框後恢復顯示所有單字

    renderWithProviders(
      <WordLibrary onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
    );

    // 等待組件載入
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜尋單字或定義/i)).toBeInTheDocument();
    });

    // 驗證所有單字都顯示
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
    expect(screen.getByText('computer')).toBeInTheDocument();

    // 輸入搜尋關鍵字
    const searchInput = screen.getByPlaceholderText(/搜尋單字或定義/i);
    await userEvent.type(searchInput, 'apple');

    // 驗證只顯示符合條件的單字
    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.queryByText('banana')).not.toBeInTheDocument();
      expect(screen.queryByText('computer')).not.toBeInTheDocument();
    });

    // 清空搜尋框
    await userEvent.clear(searchInput);

    // 驗證恢復顯示所有單字
    await waitFor(() => {
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getByText('banana')).toBeInTheDocument();
      expect(screen.getByText('computer')).toBeInTheDocument();
    });
  });
});
