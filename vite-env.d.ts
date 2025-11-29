/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_ENABLE_ERROR_TEST?: string;
  readonly API_KEY?: string;
  readonly GEMINI_API_KEY?: string;
  // 可以添加其他環境變數
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

