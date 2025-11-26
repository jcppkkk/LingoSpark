import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // 只在生產構建時啟用 Sentry plugin
        mode === 'production' && sentryVitePlugin({
          org: env.SENTRY_ORG || process.env.SENTRY_ORG,
          project: env.SENTRY_PROJECT || process.env.SENTRY_PROJECT,
          authToken: env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN,
          // 上傳 source maps
          sourcemaps: {
            assets: './dist/**',
            ignore: ['node_modules'],
            filesToDeleteAfterUpload: './dist/**/*.map',
          },
          // 只在生產構建時上傳
          telemetry: false,
        }),
      ].filter(Boolean),
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // 生成 source maps（Sentry 需要）
        sourcemap: true,
        rollupOptions: {
          output: {
            manualChunks: {
              // 將 React 相關庫分離
              'react-vendor': ['react', 'react-dom'],
              // 將 Google GenAI 分離（可能較大）
              'genai-vendor': ['@google/genai'],
              // 將 Sentry 分離
              'sentry-vendor': ['@sentry/react'],
              // 將圖標庫分離
              'icons-vendor': ['lucide-react'],
            },
          },
        },
        // 提高 chunk 大小警告閾值到 600 KB（因為我們已經做了代碼分割）
        chunkSizeWarningLimit: 600,
      },
    };
});
