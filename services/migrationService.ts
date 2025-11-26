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
 */

const CURRENT_DATA_VERSION = 2;

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
 * Migrate an array of cards
 */
export const migrateCards = (cards: Flashcard[]): Flashcard[] => {
  return cards.map(card => migrateCard(card));
};

