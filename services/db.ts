/**
 * IndexedDB Wrapper
 * Acts as the "Local SQLite" for the application.
 * Stores structured data (Cards) and binary data (Images) separately.
 */

const DB_NAME = 'LingoSparkDB';
const DB_VERSION = 1;
const STORE_CARDS = 'cards';
const STORE_IMAGES = 'images'; // To keep the main store light, images are separate

let dbInstance: IDBDatabase | null = null;

// @ARCH: db - FEAT: 初始化資料庫
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database error", event);
      reject("Database error");
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion;
      
      console.log(`[DB] Upgrading from version ${oldVersion} to ${newVersion}`);
      
      // IMPORTANT: Only create object stores if they don't exist
      // Never delete existing object stores during upgrade to preserve data
      
      // Cards Store: Key is UUID
      if (!db.objectStoreNames.contains(STORE_CARDS)) {
        console.log(`[DB] Creating object store: ${STORE_CARDS}`);
        db.createObjectStore(STORE_CARDS, { keyPath: 'id' });
      } else {
        console.log(`[DB] Object store ${STORE_CARDS} already exists, preserving data`);
      }

      // Images Store: Key is Card UUID
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        console.log(`[DB] Creating object store: ${STORE_IMAGES}`);
        db.createObjectStore(STORE_IMAGES); // Out-of-line keys
      } else {
        console.log(`[DB] Object store ${STORE_IMAGES} already exists, preserving data`);
      }
      
      // Future: Add migration logic here if needed
      // For example, if you need to add indexes or modify structure:
      // if (oldVersion < 2) {
      //   // Migration logic for version 2
      // }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      
      // Add error handler to database connection
      dbInstance.onerror = (event) => {
        console.error("[DB] Database connection error:", event);
      };
      
      // Log successful connection
      console.log(`[DB] Database opened successfully (version ${dbInstance.version})`);
      
      resolve(dbInstance);
    };
    
    request.onblocked = () => {
      console.warn("[DB] Database upgrade blocked - another tab may have the database open");
      // Don't reject, just warn - the upgrade will proceed when the other tab closes
    };
  });
};

// @ARCH: db - FEAT: 資料庫操作介面
export const dbOps = {
  // @ARCH: db - FEAT: 取得所有單字卡
  async getAllCards(): Promise<any[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CARDS, STORE_IMAGES], 'readonly');
      const store = transaction.objectStore(STORE_CARDS);
      const imageStore = transaction.objectStore(STORE_IMAGES);
      
      const request = store.getAll();

      request.onsuccess = async () => {
        const cards = request.result;
        // Re-attach images lazily or immediately? 
        // For performance in 'List' views, we might not want images. 
        // But for this app, we attach them.
        
        // This part could be optimized to lazy load images.
        // For now, we load them to maintain API compatibility.
        const cardsWithImages = await Promise.all(cards.map(async (card) => {
           const imgReq = imageStore.get(card.id);
           const imgData: string | undefined = await new Promise(res => {
             imgReq.onsuccess = () => res(imgReq.result);
             imgReq.onerror = () => res(undefined);
           });
           return { ...card, imageUrl: imgData };
        }));

        resolve(cardsWithImages);
      };
      request.onerror = () => reject(request.error);
    });
  },

  // @ARCH: db - FEAT: 儲存單字卡
  async saveCard(card: any): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CARDS, STORE_IMAGES], 'readwrite');
      
      const cardStore = transaction.objectStore(STORE_CARDS);
      const imageStore = transaction.objectStore(STORE_IMAGES);

      // Separate image data
      const { imageUrl, ...cardData } = card;

      cardStore.put(cardData);
      
      if (imageUrl) {
        imageStore.put(imageUrl, card.id);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  // @ARCH: db - FEAT: 刪除單字卡
  async deleteCard(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CARDS, STORE_IMAGES], 'readwrite');
      transaction.objectStore(STORE_CARDS).delete(id);
      transaction.objectStore(STORE_IMAGES).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  // @ARCH: db - FEAT: 取得單字卡圖片
  async getCardImage(id: string): Promise<string | undefined> {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_IMAGES], 'readonly');
      const req = transaction.objectStore(STORE_IMAGES).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
  },

  // @ARCH: db - UX: 匯出資料用於同步
  // Export all data for Sync (JSON format)
  async exportDataForSync(): Promise<{cards: any[]}> {
    const db = await initDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_CARDS], 'readonly');
      const req = transaction.objectStore(STORE_CARDS).getAll();
      req.onsuccess = () => resolve({ cards: req.result });
    });
  },

  // @ARCH: db - UX: 從同步匯入資料
  // Import data from Sync
  async importDataFromSync(cards: any[]): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CARDS], 'readwrite');
      const store = transaction.objectStore(STORE_CARDS);
      
      cards.forEach(card => {
        store.put(card);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
};