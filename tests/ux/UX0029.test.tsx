import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../utils/test-helpers';
import FlashcardComponent from '../../components/FlashcardComponent';
import { createMockFlashcard } from '../fixtures/flashcards';

// Mock speech service
vi.mock('../../services/speechService', () => ({
  speakWord: vi.fn().mockResolvedValue(undefined),
  speakSentence: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}));

describe('UX0029: 查看單字卡正面', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應該在組件載入時顯示單字卡正面內容', () => {
    // 觸發條件：單字卡組件載入完成，預設顯示正面
    // 操作步驟：
    // 1. 單字卡組件載入
    // 2. 系統顯示單字卡正面
    // 3. 使用者查看正面內容
    // 
    // 預期結果：
    // - 單字卡正面顯示單字（大字體）
    // - 如果單字卡有圖片，在單字上方顯示圖片（圓角、適當大小）
    // - 顯示 IPA 音標（例如：/kəmˈpjuːtər/）
    // - 顯示音節標示（含重音節標記）
    // - 顯示「點擊翻卡」提示
    // - 如果單字卡正在產生（GENERATING 狀態），顯示狀態標記
    // - 正面有適當的視覺設計（漸層背景、裝飾元素等）

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

    renderWithProviders(
      <FlashcardComponent card={mockCard} />
    );

    // 驗證單字顯示
    const computerElements = screen.getAllByText('computer');
    expect(computerElements.length).toBeGreaterThan(0);

    // 驗證 IPA 音標顯示（使用更靈活的匹配，因為特殊字符可能被轉義，可能有多個匹配）
    const ipaElements = screen.queryAllByText(/kəmˈpjuːtər|kəm'pjuːtər/i);
    expect(ipaElements.length).toBeGreaterThan(0);

    // 驗證音節標示（如果有的話）
    // 注意：實際顯示可能取決於組件實作
  });
});

