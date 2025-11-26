import { dbOps } from "./db";
import { driveOps, authenticate, initGoogleDrive } from "./driveService";
import { SyncStatus } from "../types";

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
    const backupFile = files?.find((f: any) => f.name === 'lingospark_cards.json');

    // 3. Export Local Data
    const localData = await dbOps.exportDataForSync();
    
    // STRATEGY: 
    // If no backup exists -> Upload Local
    // If backup exists -> Download and Merge (Simple union based on ID)
    
    if (!backupFile) {
        await driveOps.createFile('lingospark_cards.json', JSON.stringify(localData));
    } else {
        // Download remote
        const remoteContent: any = await driveOps.getFileContent(backupFile.id);
        const remoteCards = JSON.parse(remoteContent).cards || [];
        
        // Merge: Add remote cards that don't exist locally
        // (A better way is to compare updatedAt timestamps)
        const localIds = new Set(localData.cards.map((c: any) => c.id));
        const newRemoteCards = remoteCards.filter((c: any) => !localIds.has(c.id));
        
        if (newRemoteCards.length > 0) {
            await dbOps.importDataFromSync(newRemoteCards);
            console.log(`Imported ${newRemoteCards.length} cards from Drive`);
        }

        // Upload updated local back to drive
        const updatedLocalData = await dbOps.exportDataForSync();
        await driveOps.updateFile(backupFile.id, JSON.stringify(updatedLocalData));
    }

    // 4. Handle Images (Delta Upload)
    // TODO: Implement image sync loop

    syncState = { ...syncState, isSyncing: false, lastSyncedAt: Date.now() };
    notify();

  } catch (err: any) {
    console.error("Sync Error", err);
    syncState = { ...syncState, isSyncing: false, error: err.message || "Sync Failed" };
    notify();
  }
};