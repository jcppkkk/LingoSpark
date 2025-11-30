import { WordAnalysis } from '../../types';

export const mockWordAnalyses: WordAnalysis[] = [
  {
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
  },
  {
    word: 'interesting',
    definition: '有趣的',
    ipa: '/ˈɪntrəstɪŋ/',
    syllables: ['in', 'ter', 'est', 'ing'],
    stressIndex: 0,
    roots: [
      { part: 'in', meaning: '在...裡面', type: 'prefix' },
      { part: 'ter', meaning: '關心', type: 'root' },
    ],
    sentence: 'This book is very interesting.',
    sentenceTranslation: '這本書很有趣。',
    imagePrompt: 'An interesting book with colorful pages',
  },
];

