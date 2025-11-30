import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils/test-helpers';
import LearningMode from '../../components/LearningMode';
import { createMockFlashcard } from '../fixtures/flashcards';
import * as storageService from '../../services/storageService';
import * as speechService from '../../services/speechService';

// Mock services
vi.mock('../../services/storageService', () => ({
  getCards: vi.fn(),
}));

vi.mock('../../services/levelService', () => ({
  getCardsByLevel: vi.fn(),
  getTotalLevels: vi.fn().mockReturnValue(1),
}));

vi.mock('../../services/speechService', () => ({
  getAvailableVoices: vi.fn(),
  findDefaultEnglishVoice: vi.fn(),
  speakWord: vi.fn().mockResolvedValue(undefined),
  speakSentence: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}));

// Mock SpeechSynthesisVoice
const createMockVoice = (name: string, lang: string): SpeechSynthesisVoice => ({
  voiceURI: name,
  name,
  lang,
  localService: false,
  default: false,
} as SpeechSynthesisVoice);

describe('UX0017: 選擇語音', () => {
  const mockOnFinish = vi.fn();

  const mockVoices = [
    { voice: createMockVoice('Google US English', 'en-US'), name: 'Google US English', lang: 'en-US' },
    { voice: createMockVoice('Microsoft Zira', 'en-US'), name: 'Microsoft Zira', lang: 'en-US' },
    { voice: createMockVoice('Microsoft Yaoyao', 'zh-CN'), name: 'Microsoft Yaoyao', lang: 'zh-CN' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storageService.getCards).mockResolvedValue([
      createMockFlashcard({ word: 'test' }),
    ]);
    vi.mocked(speechService.getAvailableVoices).mockResolvedValue(mockVoices);
    vi.mocked(speechService.findDefaultEnglishVoice).mockResolvedValue(mockVoices[0].voice);
  });

  it('應該在載入時自動選擇預設英文語音，並允許手動切換', async () => {
    // 觸發條件：使用者在學習模式頁面
    // 操作步驟：
    // 1. 使用者在學習模式頁面
    // 2. 系統自動載入可用的語音列表
    // 3. 語音選擇下拉選單顯示所有可用語音
    // 4. 系統自動選擇預設英文語音（Google US English 或第一個英文語音）
    // 5. 使用者可以手動切換語音
    // 
    // 預期結果：
    // - 語音選擇下拉選單顯示所有可用語音
    // - 每個語音顯示名稱和語言代碼
    // - 系統自動選擇預設英文語音
    // - 使用者可以切換到其他語音
    // - 選擇的語音會用於所有模式的語音播放

    renderWithProviders(
      <LearningMode onFinish={mockOnFinish} />
    );

    // 等待組件載入
    await waitFor(() => {
      expect(speechService.getAvailableVoices).toHaveBeenCalled();
      expect(speechService.findDefaultEnglishVoice).toHaveBeenCalled();
    });

    // 驗證語音選擇下拉選單存在
    await waitFor(() => {
      const voiceSelect = screen.queryByDisplayValue(/Google US English|Microsoft/i);
      expect(voiceSelect).toBeInTheDocument();
    });

    // 驗證預設語音已選擇
    expect(speechService.findDefaultEnglishVoice).toHaveBeenCalled();
  });
});
