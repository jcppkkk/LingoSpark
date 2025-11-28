import { Flashcard, LearningLevel } from '../types';

/**
 * 學習分組服務
 * 將單字以每10個一組進行分級
 */

const CARDS_PER_LEVEL = 10;

/**
 * 將單字卡分組為不同的 Level
 * @param cards 所有單字卡
 * @returns Map<level, cards[]> 分組後的單字卡
 */
// @ARCH: levelService - FEAT: 將單字卡分組為不同等級
export const groupCardsByLevel = (cards: Flashcard[]): Map<number, Flashcard[]> => {
  const grouped = new Map<number, Flashcard[]>();
  
  // 按創建時間排序，確保分組順序一致
  const sortedCards = [...cards].sort((a, b) => a.createdAt - b.createdAt);
  
  sortedCards.forEach((card, index) => {
    const level = getLevelForCard(index, sortedCards.length);
    
    if (!grouped.has(level)) {
      grouped.set(level, []);
    }
    grouped.get(level)!.push(card);
  });
  
  return grouped;
};

/**
 * 根據索引計算單字卡屬於哪個 Level
 * @param index 單字卡在排序後的索引（從0開始）
 * @param totalCards 總單字數
 * @returns Level 編號（從1開始）
 */
// @ARCH: levelService - FEAT: 計算單字卡等級
export const getLevelForCard = (index: number, totalCards: number): number => {
  // Level 從 1 開始，每 10 個單字一組
  return Math.floor(index / CARDS_PER_LEVEL) + 1;
};

/**
 * 獲取所有 Level 的資訊
 * @param cards 所有單字卡
 * @returns LearningLevel 陣列
 */
// @ARCH: levelService - FEAT: 獲取所有等級資訊
export const getAllLevels = (cards: Flashcard[]): LearningLevel[] => {
  const grouped = groupCardsByLevel(cards);
  const levels: LearningLevel[] = [];
  
  // 按 Level 編號排序
  const sortedLevels = Array.from(grouped.keys()).sort((a, b) => a - b);
  
  for (const level of sortedLevels) {
    levels.push({
      level,
      cards: grouped.get(level) || []
    });
  }
  
  return levels;
};

/**
 * 獲取指定 Level 的單字卡
 * @param cards 所有單字卡
 * @param level Level 編號（0 表示全部單字）
 * @returns 該 Level 的單字卡陣列
 */
// @ARCH: levelService - FEAT: 獲取指定等級的單字卡
export const getCardsByLevel = (cards: Flashcard[], level: number): Flashcard[] => {
  if (level === 0) {
    // 返回全部單字
    return [...cards].sort((a, b) => a.createdAt - b.createdAt);
  }
  
  const grouped = groupCardsByLevel(cards);
  return grouped.get(level) || [];
};

/**
 * 獲取總共有多少個 Level
 * @param totalCards 總單字數
 * @returns Level 總數
 */
// @ARCH: levelService - FEAT: 計算總等級數
export const getTotalLevels = (totalCards: number): number => {
  if (totalCards === 0) return 0;
  return Math.ceil(totalCards / CARDS_PER_LEVEL);
};

