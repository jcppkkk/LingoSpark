import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import WordLibrary from '../../components/WordLibrary';
import { mockFlashcards } from '../fixtures/flashcards';
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

describe('UX0005: 切換標籤頁（字庫管理 / 製作新卡片）', () => {
  const mockOnCancel = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue(mockFlashcards);
  });

  it('應該在點擊標籤後切換到對應的內容區域', async () => {
    // 觸發條件：使用者在字庫管理頁面
    // 操作步驟：
    // 1. 使用者在字庫管理頁面
    // 2. 點擊「我的字庫」或「製作新卡片」標籤
    // 3. 頁面切換到對應的標籤內容
    // 
    // 預期結果：
    // - 標籤頁正確切換
    // - 對應的內容區域顯示
    // - 標籤頁狀態正確更新（高亮顯示當前標籤）

    renderWithProviders(
      <WordLibrary onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
    );

    // 等待組件載入
    await waitFor(() => {
      expect(storageService.getCards).toHaveBeenCalled();
    });

    // 驗證初始狀態：應該顯示「我的字庫」標籤內容
    expect(screen.getByText(/我的字庫/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/搜尋單字或定義/i)).toBeInTheDocument();

    // 點擊「製作新卡片」標籤
    const createTab = screen.getByText(/製作新卡片/i);
    await userEvent.click(createTab);

    // 驗證切換到製作新卡片視圖
    await waitFor(() => {
      expect(screen.getByText(/輸入英文單字/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/例如: cat/i)).toBeInTheDocument();
    });

    // 點擊「我的字庫」標籤切換回去
    const libraryTab = screen.getByText(/我的字庫/i);
    await userEvent.click(libraryTab);

    // 驗證切換回字庫管理視圖
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜尋單字或定義/i)).toBeInTheDocument();
    });
  });
});
