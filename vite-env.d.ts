/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly API_KEY?: string;
  readonly GEMINI_API_KEY?: string;
  // 可以添加其他環境變數
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

