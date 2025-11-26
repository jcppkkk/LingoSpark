import { Flashcard, LearningStats } from "../types";
import { DEFAULT_EFACTOR, DEFAULT_INTERVAL, DEFAULT_REPETITION } from "../constants";
import { dbOps } from "./db";
import { performSync } from "./syncService";

// Now calls IndexedDB asynchronously

export const getCards = async (): Promise<Flashcard[]> => {
  return await dbOps.getAllCards();
};

export const saveCard = async (card: Flashcard): Promise<void> => {
  const cardWithTimestamp = {
      ...card,
      updatedAt: Date.now()
  };
  await dbOps.saveCard(cardWithTimestamp);
  
  // Trigger background sync if online (Debounced in real app, here simple)
  if (navigator.onLine) {
      // Pass false to indicate this is a background sync
      performSync(false).catch(console.error);
  }
};

export const deleteCard = async (id: string): Promise<void> => {
  await dbOps.deleteCard(id);
};

export const getStats = async (): Promise<LearningStats> => {
  const cards = await getCards();
  const now = Date.now();
  const due = cards.filter(c => c.nextReviewDate <= now).length;
  const learned = cards.filter(c => c.repetition > 3).length;
  
  return {
    totalCards: cards.length,
    dueCards: due,
    learnedCount: learned
  };
};

export const checkWordExists = async (word: string): Promise<boolean> => {
    const cards = await getCards();
    return cards.some(c => c.word.toLowerCase() === word.toLowerCase());
};

export const createNewCard = (analysisData: any, imageUrl?: string): Flashcard => {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), // Fallback
    word: analysisData.word,
    data: analysisData,
    imageUrl: imageUrl,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    interval: DEFAULT_INTERVAL,
    repetition: DEFAULT_REPETITION,
    efactor: DEFAULT_EFACTOR,
    nextReviewDate: Date.now(),
  };
};

export const processReview = (card: Flashcard, quality: number): Flashcard => {
  let { repetition, interval, efactor } = card;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * efactor);
    }
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }

  efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (efactor < 1.3) efactor = 1.3;

  const nextReviewDate = Date.now() + (interval * 24 * 60 * 60 * 1000);

  return {
    ...card,
    repetition,
    interval,
    efactor,
    nextReviewDate,
    updatedAt: Date.now()
  };
};