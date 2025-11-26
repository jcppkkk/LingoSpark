import { GOOGLE_DRIVE_API_KEY, GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_SCOPES } from "../constants";

declare global {
  interface Window {
    gapi: any;
    google: any;
    setGoogleToken?: (tokenData: any) => void;
  }
}

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// 1. Initialize GAPI and GIS
export const initGoogleDrive = async (): Promise<boolean> => {
  // Helper log for developers to find the correct Origin
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    console.log(`[Drive Sync] Your current Origin is: "${origin}"`);
    
    if (origin.includes(".goog") || origin.includes("webcontainer") || origin.includes("replit")) {
        console.warn(`[Drive Sync] WARNING: You appear to be on a dynamic cloud URL. Google OAuth DOES NOT support wildcards. You must add EXACTLY "${origin}" to your Cloud Console.`);
    } else {
        console.log(`[Drive Sync] Please ensure this URL is in 'Authorized JavaScript origins' in Google Cloud Console.`);
    }
  }

  if (GOOGLE_DRIVE_CLIENT_ID.includes("YOUR_CLIENT_ID")) {
    console.warn("Google Drive Sync is disabled. Please set CLIENT_ID in constants.ts");
    return false;
  }

  return new Promise((resolve) => {
    const checkInit = () => {
      if (typeof window !== 'undefined' && window.gapi && window.google) {
         startGapi(resolve);
      } else {
        setTimeout(checkInit, 500);
      }
    };
    checkInit();
  });
};

const startGapi = (resolve: (val: boolean) => void) => {
    window.gapi.load('client', async () => {
      try {
        const initConfig: any = {
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        };

        const apiKey = GOOGLE_DRIVE_API_KEY as string;
        // Only add apiKey if it's a valid API Key (starts with AIza), NOT a Client Secret (starts with GOCSPX)
        if (apiKey && !apiKey.startsWith("GOCSPX")) {
             initConfig.apiKey = apiKey;
        } else if (apiKey && apiKey.startsWith("GOCSPX")) {
             console.warn("Ignoring invalid API Key (looks like a Client Secret).");
        }

        await window.gapi.client.init(initConfig);
        
        // Try to restore token from localStorage after init
        try {
          const savedTokenStr = localStorage.getItem('google_drive_token');
          if (savedTokenStr) {
            const savedToken = JSON.parse(savedTokenStr);
            // Check if token is still valid (not expired) and has access_token
            const now = Math.floor(Date.now() / 1000);
            const tokenAge = now - (savedToken.saved_at || 0);
            const expiresIn = savedToken.expires_in || 3600;
            
            if (tokenAge < expiresIn && savedToken.access_token) {
              // Token is still valid, restore it
              window.gapi.client.setToken(savedToken);
              console.log("[Drive] 從 localStorage 自動恢復 Token");
            } else {
              // Token expired or invalid, remove it
              localStorage.removeItem('google_drive_token');
              console.log("[Drive] localStorage 中的 Token 已過期或無效，已清除");
            }
          }
        } catch (e) {
          console.warn("[Drive] 無法從 localStorage 恢復 Token:", e);
        }
        
        gapiInited = true;
        maybeResolve(resolve);
      } catch (err) {
        console.error("GAPI init failed", err);
        resolve(false);
      }
    });

    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_DRIVE_CLIENT_ID,
        scope: GOOGLE_DRIVE_SCOPES,
        callback: () => {}, // empty callback to satisfy type check, we use requestAccessToken callback
      });
      gisInited = true;
      maybeResolve(resolve);
    } catch (err) {
       console.error("GIS init failed", err);
       resolve(false);
    }
};

const maybeResolve = (resolve: (val: boolean) => void) => {
  if (gapiInited && gisInited) resolve(true);
};

// 2. Authentication
export const authenticate = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      return reject(new Error("Google Drive Client not initialized. Check your Client ID configuration."));
    }

    // 設定超時機制（5分鐘）
    const timeoutId = setTimeout(() => {
      reject(new Error("OAuth 認證超時。請確認：\n1. 彈出視窗未被阻擋\n2. 已在 Google Cloud Console 設定正確的 Authorized JavaScript origins\n3. 如果使用 Cursor IDE，請嘗試在外部瀏覽器中開啟應用"));
    }, 300000); // 5分鐘超時

    // Override the callback for this specific request
    tokenClient.callback = async (resp: any) => {
      clearTimeout(timeoutId);
      
      if (resp.error) {
        // Detailed error logging for common OAuth mismatch
        if (resp.error === 'invalid_request' && resp.error_description?.includes('redirect_uri')) {
             console.error(`[OAuth Error] Origin Mismatch! Go to Cloud Console > Credentials > OAuth Client. Add URI: ${window.location.origin}`);
             reject(new Error(`OAuth 設定錯誤：請在 Google Cloud Console 的 OAuth Client 設定中添加 "${window.location.origin}" 到 Authorized JavaScript origins`));
        } else if (resp.error === 'popup_closed_by_user') {
             reject(new Error("認證視窗被關閉。請重新嘗試並完成認證流程。"));
        } else if (resp.error === 'access_denied' || resp.error_description?.includes('安全疑慮') || resp.error_description?.includes('security') || resp.error_description?.includes('browser')) {
             // Google security warning for automated browsers
             console.error("[OAuth Error] Google 檢測到自動化瀏覽器，拒絕認證");
             reject(new Error("⚠️ 自動化測試環境限制\n\nGoogle 安全政策會阻擋自動化瀏覽器進行 OAuth 認證。\n\n📌 重要說明：\n• 自動化瀏覽器和真實瀏覽器的資料存儲是分開的\n• 即使在一邊完成認證，另一邊也無法使用\n• Token 和應用資料（IndexedDB）都基於瀏覽器環境存儲\n\n✅ 建議：\n在真實瀏覽器（Chrome/Firefox/Safari）中進行完整測試，包括：\n1. OAuth 認證\n2. 雲端備份功能\n3. 資料同步\n\n這是在自動化測試環境中的已知限制。"));
        } else {
             console.error("[OAuth Error]", resp);
             reject(new Error(`OAuth 認證失敗: ${resp.error_description || resp.error}`));
        }
      } else {
        // 驗證 token 是否正確設定
        const token = window.gapi.client.getToken();
        if (token && token.access_token) {
          // Save token to localStorage for cross-page sharing
          try {
            const tokenToSave = {
              ...token,
              saved_at: Math.floor(Date.now() / 1000), // Save timestamp for expiration check
            };
            localStorage.setItem('google_drive_token', JSON.stringify(tokenToSave));
            console.log("[OAuth] 認證成功，Token 已保存到 localStorage");
          } catch (e) {
            console.warn("[OAuth] 無法保存 Token 到 localStorage:", e);
          }
          console.log("[OAuth] 認證成功");
          resolve(resp);
        } else {
          reject(new Error("認證完成但無法取得 access token，請重新嘗試"));
        }
      }
    };
    
    // Check if we have a valid token
    let token = window.gapi.client.getToken();
    
    // If no token in gapi, try to restore from localStorage
    if (token === null) {
      try {
        const savedTokenStr = localStorage.getItem('google_drive_token');
        if (savedTokenStr) {
          const savedToken = JSON.parse(savedTokenStr);
          // Check if token is still valid (not expired)
          const now = Math.floor(Date.now() / 1000);
          const tokenAge = now - (savedToken.saved_at || 0);
          const expiresIn = savedToken.expires_in || 3600;
          
          if (tokenAge < expiresIn && savedToken.access_token) {
            // Token is still valid, restore it
            window.gapi.client.setToken(savedToken);
            token = savedToken;
            console.log("[OAuth] 從 localStorage 恢復 Token");
            
            // If we successfully restored a valid token, resolve immediately
            // No need to call requestAccessToken
            clearTimeout(timeoutId);
            resolve({});
            return;
          } else {
            // Token expired, remove it
            localStorage.removeItem('google_drive_token');
            console.log("[OAuth] localStorage 中的 Token 已過期，已清除");
          }
        }
      } catch (e) {
        console.warn("[OAuth] 無法從 localStorage 讀取 Token:", e);
      }
    }
    
    // If we have a valid token already set in gapi, resolve immediately
    if (token !== null && token.access_token) {
      clearTimeout(timeoutId);
      console.log("[OAuth] 使用現有 token（靜默認證）");
      resolve({});
      return;
    }
    
    // No valid token found, start authentication flow
    console.log("[OAuth] 開始認證流程（需要用戶同意）");
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

// Helper function to manually set token (for testing/automation)
export const setTokenManually = async (tokenData: {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}): Promise<void> => {
  // Wait for gapi to be initialized if not ready
  if (!window.gapi || !window.gapi.client) {
    console.log("[Drive] 等待 Google API 初始化...");
    let attempts = 0;
    while ((!window.gapi || !window.gapi.client) && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    if (!window.gapi || !window.gapi.client) {
      throw new Error("Google API 初始化超時。請確保已調用 initGoogleDrive() 或等待應用載入完成。");
    }
  }
  
  // Prepare token object
  const token = {
    access_token: tokenData.access_token,
    expires_in: tokenData.expires_in || 3600,
    scope: tokenData.scope || GOOGLE_DRIVE_SCOPES,
    token_type: tokenData.token_type || 'Bearer',
  };
  
  // Set the token in gapi client
  window.gapi.client.setToken(token);
  
  // Also save to localStorage for cross-page sharing
  try {
    localStorage.setItem('google_drive_token', JSON.stringify(token));
    console.log("[Drive] ✅ Token 已手動設置並保存到 localStorage");
  } catch (e) {
    console.warn("[Drive] 無法保存 token 到 localStorage:", e);
    console.log("[Drive] ✅ Token 已手動設置（但未保存到 localStorage）");
  }
};

// Expose setTokenManually to window for easy access in browser console
if (typeof window !== 'undefined') {
  window.setGoogleToken = async (tokenData: any) => {
    try {
      await setTokenManually(tokenData);
      console.log("✅ Token 設置成功！現在可以進行雲端備份了。");
    } catch (error: any) {
      console.error("❌ Token 設置失敗:", error.message);
      console.error("提示：請確保應用已完全載入，或先執行 initGoogleDrive()");
    }
  };
}

// 3. File Operations in AppData
export const driveOps = {
  async listFiles() {
    const response = await window.gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      fields: 'files(id, name, modifiedTime)',
      pageSize: 100
    });
    return response.result.files;
  },

  async createFile(name: string, content: string, mimeType = 'application/json') {
    const accessToken = window.gapi.client.getToken().access_token;
    
    // Step 1: Create file metadata
    const fileMetadata = {
      'name': name,
      'parents': ['appDataFolder']
    };
    
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: new Headers({ 
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify(fileMetadata)
    });
    
    const createdFile = await createResponse.json();
    const fileId = createdFile.id;
    
    // Step 2: Upload file content using media upload
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: new Headers({ 
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': mimeType
      }),
      body: content
    });
    
    return fileId;
  },

  async updateFile(fileId: string, content: string, mimeType = 'application/json') {
    const accessToken = window.gapi.client.getToken().access_token;
    
    // Update file content directly (not using FormData)
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: new Headers({ 
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': mimeType
      }),
      body: content
    });
  },

  async getFileContent(fileId: string): Promise<string> {
    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });
      
      // Ensure we return a string
      if (typeof response.body === 'string') {
        return response.body;
      } else if (response.body) {
        // If it's already an object, stringify it
        return JSON.stringify(response.body);
      } else {
        // Empty file
        return '';
      }
    } catch (error: any) {
      console.error("[Drive] Failed to get file content:", error);
      throw new Error(`無法讀取檔案內容: ${error.message || '未知錯誤'}`);
    }
  },

  async deleteFile(fileId: string): Promise<void> {
    try {
      await window.gapi.client.drive.files.delete({
        fileId: fileId
      });
    } catch (error: any) {
      console.error("[Drive] Failed to delete file:", error);
      throw new Error(`無法刪除檔案: ${error.message || '未知錯誤'}`);
    }
  }
};