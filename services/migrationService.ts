import { Flashcard } from '../types';

/**
 * Migration System for Flashcard Data
 * 
 * Each migration has a version number. When a card is loaded,
 * it will be automatically migrated to the latest version.
 * 
 * Migration History:
 * - Version 1: Initial version (no migration needed)
 * - Version 2: Add English word annotations to mnemonic hints
 * - Version 3: Remove mnemonic hints and image-related fields (兒童學習模式)
 * - Version 4: Remove mnemonic hints but restore image-related fields (保留圖片功能)
 */

const CURRENT_DATA_VERSION = 4;

/**
 * Get the current data version
 */
export const getCurrentDataVersion = (): number => {
  return CURRENT_DATA_VERSION;
};

/**
 * Get the data version of a card (defaults to 1 if not set)
 */
export const getCardDataVersion = (card: Flashcard): number => {
  return card.dataVersion ?? 1;
};

/**
 * Migrate a single card to the latest version
 */
export const migrateCard = (card: Flashcard): Flashcard => {
  let migratedCard = { ...card };
  const currentVersion = getCardDataVersion(migratedCard);
  
  if (currentVersion >= CURRENT_DATA_VERSION) {
    // Already at latest version
    return migratedCard;
  }

  // Apply migrations in order
  for (let version = currentVersion; version < CURRENT_DATA_VERSION; version++) {
    migratedCard = applyMigration(migratedCard, version + 1);
  }

  // Update version
  migratedCard.dataVersion = CURRENT_DATA_VERSION;
  migratedCard.updatedAt = Date.now();

  return migratedCard;
};

/**
 * Apply a specific migration version
 */
const applyMigration = (card: Flashcard, targetVersion: number): Flashcard => {
  switch (targetVersion) {
    case 2:
      return migrationToV2(card);
    case 3:
      return migrationToV3(card);
    case 4:
      return migrationToV4(card);
    default:
      console.warn(`Unknown migration version: ${targetVersion}`);
      return card;
  }
};

/**
 * Migration to Version 2: Add English word annotations to mnemonic hints
 * 
 * This migration ensures that mnemonic hints that use English word sounds
 * are properly formatted with the 「中文詞」(英文單字) format.
 * 
 * Since old cards may not have this format, we don't need to do anything
 * here - the format will be added when the card is regenerated or updated.
 * However, we ensure the dataVersion is set correctly.
 */
const migrationToV2 = (card: Flashcard): Flashcard => {
  // No data transformation needed - old cards without annotations are still valid
  // The new format will be applied when cards are regenerated
  return card;
};

/**
 * Migration to Version 3: Remove mnemonic hints and image-related fields
 * 
 * This migration removes:
 * - mnemonicHint from WordAnalysis
 * - imagePrompt from WordAnalysis
 * - imageUrl from Flashcard
 * - imagePrompt from Flashcard
 * 
 * These fields are no longer needed for the children's learning mode.
 */
const migrationToV3 = (card: Flashcard): Flashcard => {
  // Remove imageUrl and imagePrompt from Flashcard
  const { imageUrl: _imageUrl, imagePrompt: _imagePrompt, ...cardWithoutImages } = card;
  
  // Remove mnemonicHint and imagePrompt from WordAnalysis (if they exist)
  const { mnemonicHint: _mnemonicHint, imagePrompt: _dataImagePrompt, ...dataWithoutMnemonic } = card.data as any;
  
  return {
    ...cardWithoutImages,
    data: dataWithoutMnemonic
  };
};

/**
 * Migration to Version 4: Remove mnemonic hints but restore image-related fields
 * 
 * This migration:
 * - Removes mnemonicHint from WordAnalysis (if exists)
 * - Preserves imageUrl and imagePrompt in Flashcard (if they exist)
 * - Preserves imagePrompt in WordAnalysis (if it exists)
 * 
 * Note: Cards that were migrated through V3 will have lost their imageUrl and imagePrompt.
 * These will be regenerated when the card is updated or re-analyzed.
 * 
 * This allows image generation while removing memory hint text.
 */
const migrationToV4 = (card: Flashcard): Flashcard => {
  // Remove mnemonicHint from WordAnalysis if it exists
  const { mnemonicHint: _mnemonicHint, ...dataWithoutMnemonic } = card.data as any;
  
  // Preserve imagePrompt in data if it exists
  // If it was removed in V3, it will be added when the card is re-analyzed
  const migratedData = {
    ...dataWithoutMnemonic,
    // imagePrompt will be preserved if it exists, or added by analyzeWord when card is updated
  };
  
  // Preserve imageUrl and imagePrompt in Flashcard if they exist
  // If they were removed in V3, they will be regenerated when the card is updated
  return {
    ...card,
    data: migratedData
    // imageUrl and imagePrompt in Flashcard are preserved if they exist
  };
};

/**
 * Migrate an array of cards
 */
export const migrateCards = (cards: Flashcard[]): Flashcard[] => {
  return cards.map(card => migrateCard(card));
};

