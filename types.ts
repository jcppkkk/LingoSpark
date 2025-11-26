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
  sentence: string; // Example sentence
  sentenceTranslation: string;
  mnemonicHint: string; // Text suggestion for memory
  imagePrompt?: string; // The specific visual description used for generation
}

export interface MnemonicOption {
  imageUrl: string;
  mnemonicHint: string;
  imagePrompt: string;
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
  imageUrl?: string; // Base64 string (Optimized: stored separately in DB)
  imagePrompt?: string; // Stored prompt for regeneration
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