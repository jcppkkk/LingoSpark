import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDB, dbOps } from '../services/db';

describe('資料庫版本升級測試', () => {
  const TEST_DB_NAME = 'LingoSparkDB_Test';
  let originalDBName: string;
  let originalDBVersion: number;

  beforeEach(async () => {
    // 備份原始設定
    const dbModule = await import('../services/db');
    // 注意：這裡我們需要測試實際的資料庫行為
    // 由於 db.ts 使用常數，我們需要測試實際的升級場景
  });

  afterEach(async () => {
    // 清理測試資料庫
    return new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase('LingoSparkDB_Test');
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve();
      deleteRequest.onblocked = () => resolve();
    });
  });

  it('應該在首次創建時建立 object stores', async () => {
    // 刪除測試資料庫（如果存在）
    await new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase('LingoSparkDB_Test');
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve();
      deleteRequest.onblocked = () => resolve();
    });

    // 創建新資料庫
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('LingoSparkDB_Test', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images');
        }
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });

    expect(db.objectStoreNames.contains('cards')).toBe(true);
    expect(db.objectStoreNames.contains('images')).toBe(true);
    db.close();
  });

  it('應該在版本升級時保留現有資料', async () => {
    const dbName = 'LingoSparkDB_Test';
    const testCard = {
      id: 'test-card-1',
      word: 'test',
      data: { word: 'test', definition: '測試' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      interval: 1,
      repetition: 0,
      efactor: 2.5,
      nextReviewDate: Date.now(),
      dataVersion: 1,
    };

    // 步驟 1: 創建版本 1 的資料庫並添加資料
    const dbV1 = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images');
        }
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });

    // 添加測試資料
    await new Promise<void>((resolve, reject) => {
      const transaction = dbV1.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      const request = store.put(testCard);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    dbV1.close();

    // 步驟 2: 升級到版本 2（模擬版本升級）
    const dbV2 = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 2);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        console.log(`[Test] Upgrading from version ${oldVersion} to 2`);
        
        // 重要：只創建不存在的 object store，不刪除現有的
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images');
        }
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });

    // 步驟 3: 驗證資料是否保留
    const retrievedCard = await new Promise<any>((resolve, reject) => {
      const transaction = dbV2.transaction(['cards'], 'readonly');
      const store = transaction.objectStore('cards');
      const request = store.get('test-card-1');
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });

    expect(retrievedCard).toBeTruthy();
    expect(retrievedCard.id).toBe('test-card-1');
    expect(retrievedCard.word).toBe('test');
    expect(dbV2.objectStoreNames.contains('cards')).toBe(true);
    expect(dbV2.objectStoreNames.contains('images')).toBe(true);

    dbV2.close();
  });

  it('應該在多次版本升級時保留所有資料', async () => {
    const dbName = 'LingoSparkDB_Test_Multi';
    const testCards = [
      {
        id: 'card-1',
        word: 'apple',
        data: { word: 'apple', definition: '蘋果' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        interval: 1,
        repetition: 0,
        efactor: 2.5,
        nextReviewDate: Date.now(),
        dataVersion: 1,
      },
      {
        id: 'card-2',
        word: 'banana',
        data: { word: 'banana', definition: '香蕉' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        interval: 1,
        repetition: 0,
        efactor: 2.5,
        nextReviewDate: Date.now(),
        dataVersion: 1,
      },
    ];

    // 創建版本 1 並添加多筆資料
    const dbV1 = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // 添加多筆資料
    await new Promise<void>((resolve, reject) => {
      const transaction = dbV1.transaction(['cards'], 'readwrite');
      const store = transaction.objectStore('cards');
      
      testCards.forEach(card => {
        store.put(card);
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    dbV1.close();

    // 升級到版本 2
    const dbV2 = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, 2);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images');
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // 驗證所有資料都保留
    const allCards = await new Promise<any[]>((resolve, reject) => {
      const transaction = dbV2.transaction(['cards'], 'readonly');
      const store = transaction.objectStore('cards');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    expect(allCards.length).toBe(2);
    expect(allCards.find(c => c.id === 'card-1')).toBeTruthy();
    expect(allCards.find(c => c.id === 'card-2')).toBeTruthy();

    dbV2.close();
  });

  it('應該正確處理 initDB 函數', async () => {
    // 測試實際的 initDB 函數
    const db = await initDB();
    
    expect(db).toBeTruthy();
    expect(db.name).toBe('LingoSparkDB');
    expect(db.version).toBeGreaterThan(0);
    expect(db.objectStoreNames.contains('cards')).toBe(true);
    expect(db.objectStoreNames.contains('images')).toBe(true);
  });

  it('應該能夠保存和讀取卡片資料', async () => {
    const testCard = {
      id: 'test-save-1',
      word: 'hello',
      data: {
        word: 'hello',
        definition: '你好',
        ipa: '/həˈloʊ/',
        syllables: ['hel', 'lo'],
        stressIndex: 1,
        roots: [],
        sentence: 'Hello, world!',
        sentenceTranslation: '你好，世界！',
        mnemonicHint: '測試記憶提示',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      interval: 1,
      repetition: 0,
      efactor: 2.5,
      nextReviewDate: Date.now(),
      dataVersion: 2,
      imageUrl: 'data:image/png;base64,test',
    };

    // 保存卡片
    await dbOps.saveCard(testCard);

    // 讀取所有卡片
    const cards = await dbOps.getAllCards();
    
    const foundCard = cards.find(c => c.id === 'test-save-1');
    expect(foundCard).toBeTruthy();
    expect(foundCard?.word).toBe('hello');
    expect(foundCard?.data.definition).toBe('你好');
  });
});

