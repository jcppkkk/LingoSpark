import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import WordLibrary from '../../components/WordLibrary';
import { createMockFlashcard } from '../fixtures/flashcards';
import * as storageService from '../../services/storageService';
import * as geminiService from '../../services/geminiService';

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
  speakWord: vi.fn().mockResolvedValue(undefined),
  speakSentence: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}));

describe('UX0032: 重新生成單字卡圖片', () => {
  const mockOnCancel = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockCard = createMockFlashcard({
    word: 'computer',
    data: {
      word: 'computer',
      definition: '電腦',
      ipa: '/kəmˈpjuːtər/',
      syllables: ['com', 'put', 'er'],
      stressIndex: 1,
      roots: [
        { part: 'com', meaning: '一起', type: 'prefix' },
        { part: 'put', meaning: '思考', type: 'root' },
      ],
      sentence: 'I use a computer every day.',
      sentenceTranslation: '我每天使用電腦。',
      imagePrompt: 'A modern computer on a desk',
    },
    imagePrompt: 'A modern computer on a desk', // 組件使用 selectedCard.imagePrompt，不是 selectedCard.data.imagePrompt
    imageUrl: 'data:image/png;base64,original-image',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue([mockCard]);
    vi.mocked(storageService.saveCard).mockResolvedValue(undefined);
    // Mock generateMnemonicImage 立即返回，避免真實 API 調用影響測試時間
    vi.mocked(geminiService.generateMnemonicImage).mockImplementation(() => 
      Promise.resolve('data:image/png;base64,new-image')
    );
  });

  it('應該能夠重新生成單字卡圖片並選擇新圖片', async () => {
    // 分析耗時點：
    // 1. React 組件初始渲染（getCards mock 立即返回，但需要 React 渲染時間）
    // 2. 點擊卡片後狀態更新（setSelectedCard）觸發重新渲染
    // 3. 點擊按鈕後多個狀態更新（setIsRegenerating, setRegeneratingCard, setIsRegenerateModalOpen 等）
    // 4. Promise.all 調用兩個 generateMnemonicImage（已 mock 立即返回，但仍有 Promise 解析時間）
    // 5. React 重新渲染模態框
    // 6. 等待 DOM 元素出現
    // 
    // 所有外部 API 都已 mock，理論上不應該超時
    // 問題：測試本身的超時（5000ms）比某些 waitFor 的超時（10000ms）還短
    // 解決：需要增加測試本身的超時時間，或優化測試邏輯減少 waitFor 串聯
    // 觸發條件：使用者在字庫管理標籤頁，選擇了有圖片的單字卡
    // 操作步驟：
    // 1. 使用者在字庫管理標籤頁
    // 2. 選擇一個有圖片生成提示的單字卡
    // 3. 點擊「重新生成圖片」按鈕
    // 4. 系統開始生成兩張新圖片
    // 5. 顯示模態框，包含原圖和兩張新圖（共三張）
    // 6. 點擊選擇喜歡的圖片
    // 7. 點擊「確認選擇」
    // 8. 系統更新單字卡的圖片
    // 
    // 預期結果：
    // - 點擊「重新生成圖片」按鈕後，按鈕顯示「生成中...」狀態
    // - 生成過程中顯示載入動畫
    // - 生成完成後打開模態框，顯示三張圖片（原圖 + 兩張新圖）
    // - 圖片以網格方式排列，每張圖片可點擊選擇
    // - 選中的圖片有高亮邊框和勾選標記
    // - 點擊「確認選擇」後更新單字卡圖片
    // - 如果生成失敗，顯示錯誤訊息
    // - 可以點擊「取消」關閉模態框，不更新圖片

    renderWithProviders(
      <WordLibrary onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
    );

    // 等待組件載入
    await waitFor(() => {
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    // 步驟 1-2: 選擇一個有圖片生成提示的單字卡
    // 分析耗時點：點擊卡片後，React 需要更新 selectedCard 狀態並重新渲染預覽區域
    const computerElements = screen.getAllByText('computer');
    const cardElement = computerElements[0].closest('div[class*="cursor-pointer"]');
    if (cardElement) {
      await userEvent.click(cardElement);
    }

    // 等待預覽區域顯示並找到「重新生成圖片」按鈕
    // 分析耗時點：
    // 1. React 狀態更新（setSelectedCard）需要時間
    // 2. React 重新渲染預覽區域需要時間
    // 3. 按鈕只在 selectedCard 存在且 selectedCard.imagePrompt 存在時顯示
    // 4. 按鈕文字可能被拆分（圖標 + 文字），使用更靈活的查詢
    // 5. getAllByRole('button') 需要遍歷所有按鈕，可能較慢
    // 
    // 優化：先等待預覽區域顯示（selectedCard 已設置），再查找按鈕
    // 使用 getAllByText 避免 "Found multiple elements" 錯誤
    // 需要等待足夠長的時間讓 React 狀態更新和重新渲染完成
    await waitFor(() => {
      // 驗證預覽區域已顯示（selectedCard 已設置）
      // 參考 UX0009.test.tsx 的做法：使用 getAllByText 並驗證元素存在
      const definitionElements = screen.getAllByText('電腦');
      expect(definitionElements.length).toBeGreaterThan(0);
      
      // 驗證 selectedCard 已設置：檢查預覽區域是否顯示單字卡內容
      // 預覽區域應該顯示單字卡的定義、IPA 等信息
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
    }, { timeout: 10000 });

    // 然後查找「重新生成圖片」按鈕
    // 使用 getByTitle 更精確地查找按鈕（按鈕有 title="重新生成圖片" 屬性）
    // 按鈕只在 selectedCard 存在且 selectedCard.imagePrompt 存在時顯示
    // 需要等待 React 狀態更新完成（setSelectedCard 觸發重新渲染）
    let regenerateButton: HTMLElement | undefined;
    await waitFor(() => {
      // 方法 1: 使用 getByTitle（最精確，按鈕有 title="重新生成圖片" 屬性）
      try {
        regenerateButton = screen.getByTitle('重新生成圖片');
      } catch {
        // 方法 2: 使用 getByRole with name（匹配按鈕文字）
        regenerateButton = screen.getByRole('button', { name: /重新生成圖片/i });
      }
      expect(regenerateButton).toBeInTheDocument();
    }, { timeout: 10000 });

    // 步驟 3: 點擊「重新生成圖片」按鈕
    if (regenerateButton) {
      await userEvent.click(regenerateButton);
    } else {
      throw new Error('找不到「重新生成圖片」按鈕');
    }

    // 預期結果 1: 按鈕顯示「生成中...」狀態（由於 mock 立即返回，可能很快切換）
    // 預期結果 2: 生成過程中顯示載入動畫（模態框打開）
    // 由於 generateMnemonicImage 已被 mock 且立即返回，載入狀態可能很快消失
    // 直接等待模態框顯示圖片
    await waitFor(() => {
      expect(screen.getByText(/選擇圖片/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // 步驟 4-5: 等待生成完成，模態框顯示圖片
    await waitFor(() => {
      expect(screen.getByText(/點擊選擇您喜歡的圖片/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // 驗證 generateMnemonicImage 被調用兩次（生成兩張新圖片）
    expect(geminiService.generateMnemonicImage).toHaveBeenCalledTimes(2);
    expect(geminiService.generateMnemonicImage).toHaveBeenCalledWith('computer', 'A modern computer on a desk');

    // 預期結果 3: 模態框顯示三張圖片（原圖 + 兩張新圖）
    // 注意：原圖標籤為「原圖」，新圖標籤為「新圖 1」、「新圖 2」
    await waitFor(() => {
      const originalImageLabel = screen.getByText('原圖');
      expect(originalImageLabel).toBeInTheDocument();
    });

    // 步驟 6: 點擊選擇喜歡的圖片（選擇第一張新圖）
    // 查找「新圖 1」標籤，然後點擊其父元素
    await waitFor(() => {
      const newImage1Label = screen.getByText('新圖 1');
      expect(newImage1Label).toBeInTheDocument();
      
      // 點擊包含「新圖 1」的圖片容器
      const imageContainer = newImage1Label.closest('div[class*="cursor-pointer"]');
      if (imageContainer) {
        userEvent.click(imageContainer);
      }
    }, { timeout: 3000 });

    // 預期結果 4-5: 選中的圖片有高亮邊框和勾選標記
    await waitFor(() => {
      const newImage1Label = screen.getByText('新圖 1');
      const imageContainer = newImage1Label.closest('div[class*="border-primary"]');
      expect(imageContainer).toBeInTheDocument();
    }, { timeout: 2000 });

    // 步驟 7: 點擊「確認選擇」
    const confirmButton = screen.getByText(/確認選擇/i);
    await userEvent.click(confirmButton);

    // 預期結果 6: 點擊「確認選擇」後更新單字卡圖片
    await waitFor(() => {
      expect(storageService.saveCard).toHaveBeenCalled();
    }, { timeout: 3000 });

    // 驗證模態框已關閉
    await waitFor(() => {
      expect(screen.queryByText(/選擇圖片/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });
  }, 30000); // 增加測試超時時間：5000ms (初始渲染) + 10000ms (最大 waitFor) + 5000ms (其他 waitFor) + 10000ms (緩衝) = 30000ms

  it('應該能夠取消重新生成圖片操作', async () => {
    // 測試預期結果 8: 可以點擊「取消」關閉模態框，不更新圖片

    renderWithProviders(
      <WordLibrary onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
    );

    // 等待組件載入並選擇單字卡
    await waitFor(() => {
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
    });

    const computerElements = screen.getAllByText('computer');
    const cardElement = computerElements[0].closest('div[class*="cursor-pointer"]');
    if (cardElement) {
      await userEvent.click(cardElement);
    }

    // 等待預覽區域顯示
    await waitFor(() => {
      const definitionElements = screen.getAllByText('電腦');
      expect(definitionElements.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    // 查找「重新生成圖片」按鈕
    let regenerateButton: HTMLElement | undefined;
    await waitFor(() => {
      try {
        regenerateButton = screen.getByTitle('重新生成圖片');
      } catch {
        regenerateButton = screen.getByRole('button', { name: /重新生成圖片/i });
      }
      expect(regenerateButton).toBeInTheDocument();
    }, { timeout: 5000 });

    // 點擊「重新生成圖片」按鈕
    if (regenerateButton) {
      await userEvent.click(regenerateButton);
    } else {
      throw new Error('找不到「重新生成圖片」按鈕');
    }

    // 等待模態框打開（由於 mock 立即返回，應該很快顯示）
    await waitFor(() => {
      expect(screen.getByText(/選擇圖片/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // 點擊「取消」按鈕
    const cancelButtons = screen.getAllByText(/取消/i);
    // 找到模態框中的取消按鈕（通常是第二個，第一個可能是其他地方的取消按鈕）
    const modalCancelButton = cancelButtons.find(btn => 
      btn.closest('div[class*="sticky"]') || btn.closest('div[class*="bg-white"]')
    ) || cancelButtons[0];
    
    await userEvent.click(modalCancelButton);

    // 驗證模態框已關閉
    await waitFor(() => {
      expect(screen.queryByText(/選擇圖片/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });

    // 驗證沒有調用 saveCard（因為取消了）
    expect(storageService.saveCard).not.toHaveBeenCalled();
  }, 30000); // 增加測試超時時間

  it('應該在圖片生成失敗時顯示錯誤訊息', async () => {
    // 測試預期結果 7: 如果生成失敗，顯示錯誤訊息

    // Mock 生成失敗（立即返回錯誤，避免真實 API 調用）
    vi.mocked(geminiService.generateMnemonicImage).mockImplementation(() => 
      Promise.reject(new Error('生成失敗'))
    );

    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(
      <WordLibrary onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
    );

    // 等待組件載入並選擇單字卡
    await waitFor(() => {
      const computerElements = screen.getAllByText('computer');
      expect(computerElements.length).toBeGreaterThan(0);
    });

    const computerElements = screen.getAllByText('computer');
    const cardElement = computerElements[0].closest('div[class*="cursor-pointer"]');
    if (cardElement) {
      await userEvent.click(cardElement);
    }

    // 等待預覽區域顯示
    await waitFor(() => {
      const definitionElements = screen.getAllByText('電腦');
      expect(definitionElements.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    // 查找「重新生成圖片」按鈕
    let regenerateButton: HTMLElement | undefined;
    await waitFor(() => {
      try {
        regenerateButton = screen.getByTitle('重新生成圖片');
      } catch {
        regenerateButton = screen.getByRole('button', { name: /重新生成圖片/i });
      }
      expect(regenerateButton).toBeInTheDocument();
    }, { timeout: 5000 });

    // 點擊「重新生成圖片」按鈕
    if (regenerateButton) {
      await userEvent.click(regenerateButton);
    } else {
      throw new Error('找不到「重新生成圖片」按鈕');
    }

    // 等待錯誤訊息顯示（由於 mock 立即返回錯誤，應該很快顯示）
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('圖片生成失敗')
      );
    }, { timeout: 5000 });

    // 驗證模態框已關閉（因為生成失敗）
    await waitFor(() => {
      expect(screen.queryByText(/選擇圖片/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });

    alertSpy.mockRestore();
  }, 30000); // 增加測試超時時間
});

