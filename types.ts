export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ADD_WORD = 'ADD_WORD',
  PRACTICE = 'PRACTICE',
  CARD_DETAILS = 'CARD_DETAILS',
  ERROR_TEST = 'ERROR_TEST'
}

export interface WordAnalysis {
  word: string;
  definition: string;
  ipa: string; // Phonetic spelling
  syllables: string[]; // e.g., ["in", "ter", "est", "ing"]
  stressIndex: number; // Which syllable index has primary stress
  roots: { part: string; meaning: string; type: 'prefix' | 'root' | 'suffix' }[];
  sentence: string; // Example sentence (適合小三學生)
  sentenceTranslation: string;
  imagePrompt?: string; // 圖像生成提示（用於生成圖片）
}

export enum CardStatus {
  NORMAL = 'normal',           // 正常狀態
  GENERATING = 'generating',   // 正在產生（新增單字時）
  UPDATING = 'updating',       // 正在更新（重新產生圖片/記憶法時）
}

export interface Flashcard {
  id: string;
  word: string;
  data: WordAnalysis;
  imageUrl?: string; // Base64 string (圖片儲存在 DB 的 images store)
  imagePrompt?: string; // 圖像生成提示（用於重新生成圖片）
  createdAt: number;
  
  // Spaced Repetition Data
  interval: number; // Days until next review
  repetition: number; // Number of successful reviews
  efactor: number; // Easiness factor (SuperMemo-2)
  nextReviewDate: number; // Timestamp

  // Sync Metadata
  updatedAt: number;
  isDeleted?: boolean;
  
  // Migration & Status
  dataVersion?: number; // Migration version of the data structure
  status?: CardStatus; // Current card status (for UI display)
}

export interface LearningStats {
  totalCards: number;
  dueCards: number;
  learnedCount: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
}

// 學習模式相關類型
export enum LearningMode {
  LEARNING = 'learning',    // 學習模式
  BLOCK = 'block',          // 積木模式
  DICTATION = 'dictation'   // 聽寫模式
}

// 學習分組
export interface LearningLevel {
  level: number; // Level 編號 (1, 2, 3...)
  cards: Flashcard[];
}

// 語音相關
export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
}