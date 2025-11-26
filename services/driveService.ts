import { GOOGLE_DRIVE_API_KEY, GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_SCOPES } from "../constants";

declare global {
  interface Window {
    gapi: any;
    google: any;
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

    // Override the callback for this specific request
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        // Detailed error logging for common OAuth mismatch
        if (resp.error === 'invalid_request' && resp.error_description?.includes('redirect_uri')) {
             console.error(`[OAuth Error] Origin Mismatch! Go to Cloud Console > Credentials > OAuth Client. Add URI: ${window.location.origin}`);
        }
        reject(resp);
      } else {
        resolve(resp);
      }
    };
    
    // Check if we have a valid token
    const token = window.gapi.client.getToken();
    if (token === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

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
    const fileMetadata = {
      'name': name,
      'parents': ['appDataFolder']
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: mimeType }));

    const accessToken = window.gapi.client.getToken().access_token;
    
    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
      body: form
    });
  },

  async updateFile(fileId: string, content: string, mimeType = 'application/json') {
     const form = new FormData();
    // Only update content
    form.append('file', new Blob([content], { type: mimeType }));

    const accessToken = window.gapi.client.getToken().access_token;
    
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
      body: form
    });
  },

  async getFileContent(fileId: string) {
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    return response.body;
  }
};