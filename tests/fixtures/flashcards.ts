import { Flashcard, WordAnalysis } from '../../types';

export const createMockWordAnalysis = (overrides?: Partial<WordAnalysis>): WordAnalysis => ({
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
  imagePrompt: 'A modern computer on a desk',
  ...overrides,
});

export const createMockFlashcard = (overrides?: Partial<Flashcard>): Flashcard => {
  const word = overrides?.word || 'computer';
  const data = overrides?.data || createMockWordAnalysis({ word });
  
  return {
    id: `test-${word}-${Date.now()}`,
    word,
    data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    interval: 1,
    repetition: 0,
    efactor: 2.5,
    nextReviewDate: Date.now(),
    dataVersion: 2,
    ...overrides,
  };
};

export const mockFlashcards: Flashcard[] = [
  createMockFlashcard({ word: 'apple', data: createMockWordAnalysis({ word: 'apple', definition: '蘋果' }) }),
  createMockFlashcard({ word: 'banana', data: createMockWordAnalysis({ word: 'banana', definition: '香蕉' }) }),
  createMockFlashcard({ word: 'orange', data: createMockWordAnalysis({ word: 'orange', definition: '橘子' }) }),
];

