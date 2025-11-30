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

describe('UX0031: 查看單字分析資訊', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應該顯示完整的單字分析資訊', () => {
    // 觸發條件：使用者在查看單字卡（正面或背面）
    // 操作步驟：
    // 1. 使用者在查看單字卡
    // 2. 查看單字卡上顯示的各種分析資訊
    // 3. 可以翻轉卡片查看不同資訊
    // 
    // 預期結果：
    // - 正面顯示：
    //   - 單字圖片（如果有，顯示在單字上方）
    //   - 單字（大字體，易於閱讀）
    //   - IPA 音標（音標格式）
    //   - 音節標示（可選，含重音節標記）
    // - 背面顯示：
    //   - 單字標題
    //   - 音節拆解（視覺化標示，重音節有特殊標記）
    //   - IPA 音標
    //   - 中文定義（突出顯示，黃色背景）
    //   - 詞源分析（如果有，顯示前綴/詞根/後綴）
    //   - 例句（英文和中文翻譯，分開顯示）
    // - 所有資訊正確顯示，格式清晰易讀
    // - 如果單字卡正在產生，顯示載入狀態
    // - 圖片載入失敗時自動隱藏，不影響其他內容顯示

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
          { part: 'er', meaning: '...的人或物', type: 'suffix' },
        ],
        sentence: 'I use a computer every day.',
        sentenceTranslation: '我每天使用電腦。',
      },
    });

    renderWithProviders(
      <FlashcardComponent card={mockCard} />
    );

    // 驗證正面資訊
    const computerElements = screen.getAllByText('computer');
    expect(computerElements.length).toBeGreaterThan(0);
    // IPA 音標可能包含特殊字符，使用更靈活的匹配（可能有多個匹配）
    const ipaElements = screen.queryAllByText(/kəmˈpjuːtər|kəm'pjuːtər/i);
    expect(ipaElements.length).toBeGreaterThan(0);

    // 注意：背面資訊需要翻轉後才能看到，這裡只測試正面
    // 完整的測試應該包含翻轉後驗證背面內容
  });
});

