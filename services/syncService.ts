import { dbOps } from "./db";
import { driveOps, authenticate, initGoogleDrive } from "./driveService";
import { SyncStatus, Flashcard } from "../types";
import { migrateCards } from "./migrationService";

// Google Drive 檔案資訊
interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

// 同步資料格式
interface SyncData {
  cards: Flashcard[];
}

let syncState: SyncStatus = { isSyncing: false, lastSyncedAt: null, error: null };
let listeners: ((status: SyncStatus) => void)[] = [];
let hasAuthenticated = false;

const notify = () => {
  listeners.forEach(l => l({ ...syncState }));
};

export const subscribeToSyncStatus = (listener: (status: SyncStatus) => void) => {
  listeners.push(listener);
  listener({ ...syncState });
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

export const initSync = async () => {
    try {
        const success = await initGoogleDrive();
        
        if (!success) {
          console.warn("Sync service disabled due to missing configuration or initialization failure.");
          return;
        }

        // Setup listener for online status
        window.addEventListener('online', () => {
            console.log("Network online, triggering background sync...");
            performSync(false);
        });
        
        // REMOVED: Initial performSync call. 
        // We do NOT want to trigger auth popup on app load. 
        // Sync should only start if user manually clicks "Sync" or after they have logged in once.
    } catch (e) {
        console.warn("Drive init failed unexpectedly", e);
    }
}

export const performSync = async (isManual = false) => {
  if (syncState.isSyncing) return;
  
  if (!navigator.onLine) {
      console.log("Offline, skipping sync");
      return;
  }

  // Prevent background sync if we haven't authenticated yet this session.
  // This ensures we don't show random popups to the user.
  if (!isManual && !hasAuthenticated) {
      console.log("Skipping background sync: User has not authenticated yet.");
      return;
  }

  syncState = { ...syncState, isSyncing: true, error: null };
  notify();

  try {
    // 1. Authenticate (Silent if possible, Popup if manual)
    await authenticate();
    hasAuthenticated = true; // Mark as authenticated so future background syncs work

    // 2. Check Drive for 'cards.json'
    const files = await driveOps.listFiles();
    const backupFile = files?.find((f: DriveFile) => f.name === 'lingospark_cards.json');

    // @ARCH: SyncService - FEAT: 同步前資料遷移
    // 3. Export Local Data (ensure all local cards are migrated before export)
    const rawLocalData = await dbOps.exportDataForSync();
    const migratedLocalCards = migrateCards(rawLocalData.cards as Flashcard[]);
    const localData = { cards: migratedLocalCards };
    
    // Save migrated local cards back to DB if needed
    const needsLocalSave = rawLocalData.cards.some((card: Flashcard, index: number) => 
      card.dataVersion !== migratedLocalCards[index].dataVersion
    );
    if (needsLocalSave) {
      await Promise.all(migratedLocalCards.map(card => dbOps.saveCard(card)));
      console.log(`[Sync] Migrated ${migratedLocalCards.length} local cards before sync`);
    }
    
    // STRATEGY: 
    // If no backup exists -> Upload Local
    // If backup exists -> Download and Merge (Simple union based on ID)
    
    if (!backupFile) {
        await driveOps.createFile('lingospark_cards.json', JSON.stringify(localData));
    } else {
        // Download remote
        const remoteContent = await driveOps.getFileContent(backupFile.id);
        
        // Validate and parse remote content
        let remoteCards: Flashcard[] = [];
        try {
            // Ensure remoteContent is a string
            const contentString = typeof remoteContent === 'string' 
                ? remoteContent 
                : JSON.stringify(remoteContent);
            
            // Check if content is empty or whitespace
            if (!contentString || !contentString.trim()) {
                console.warn("[Sync] Remote file is empty, treating as new file");
            } else {
                // Check if this is old multipart format (starts with boundary marker)
                if (contentString.trim().startsWith('------WebKitFormBoundary') || 
                    contentString.trim().startsWith('--') && contentString.includes('Content-Disposition')) {
                    console.warn("[Sync] Detected old multipart format file. Deleting and recreating...");
                    await driveOps.deleteFile(backupFile.id);
                    // Recreate with correct format
                    await driveOps.createFile('lingospark_cards.json', JSON.stringify(localData));
                    console.log("[Sync] Recreated file with correct format");
                    return; // Exit early, file is now recreated with local data
                }
                
                const parsed = JSON.parse(contentString) as SyncData;
                remoteCards = parsed?.cards || [];
                console.log(`[Sync] Loaded ${remoteCards.length} cards from Drive`);
            }
        } catch (parseError: unknown) {
            // Check if this might be old multipart format
            const contentString = typeof remoteContent === 'string' 
                ? remoteContent 
                : String(remoteContent);
            
            if (contentString.includes('WebKitFormBoundary') || 
                (contentString.includes('Content-Disposition') && contentString.includes('form-data'))) {
                console.warn("[Sync] Detected old multipart format file. Deleting and recreating...");
                await driveOps.deleteFile(backupFile.id);
                // Recreate with correct format
                await driveOps.createFile('lingospark_cards.json', JSON.stringify(localData));
                console.log("[Sync] Recreated file with correct format");
                return; // Exit early, file is now recreated with local data
            }
            
            console.error("[Sync] Failed to parse remote file content:", parseError);
            console.error("[Sync] Remote content preview:", contentString.substring(0, 100));
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            throw new Error(`無法解析遠端檔案內容: ${errorMessage}`);
        }
        
        // Merge: Add remote cards that don't exist locally
        // (A better way is to compare updatedAt timestamps)
        const localIds = new Set(localData.cards.map((c: Flashcard) => c.id));
        const newRemoteCards = remoteCards.filter((c: Flashcard) => !localIds.has(c.id));
        
        if (newRemoteCards.length > 0) {
            // @ARCH: SyncService - FEAT: 遠端卡片遷移與匯入
            // Migrate remote cards before importing
            const migratedRemoteCards = migrateCards(newRemoteCards as Flashcard[]);
            await dbOps.importDataFromSync(migratedRemoteCards);
            console.log(`[Sync] Imported ${newRemoteCards.length} cards from Drive (migrated if needed)`);
        }

        // Upload updated local back to drive (after merge and migration)
        // This ensures Drive always has the latest migrated version
        const updatedLocalData = await dbOps.exportDataForSync();
        await driveOps.updateFile(backupFile.id, JSON.stringify(updatedLocalData));
        console.log(`[Sync] Uploaded ${updatedLocalData.cards.length} cards to Drive`);
    }

    // 4. Handle Images (Delta Upload)
    // TODO: Implement image sync loop

    syncState = { ...syncState, isSyncing: false, lastSyncedAt: Date.now() };
    notify();

  } catch (err: unknown) {
    console.error("Sync Error", err);
    const errorMessage = err instanceof Error ? err.message : "Sync Failed";
    syncState = { ...syncState, isSyncing: false, error: errorMessage };
    notify();
  }
};