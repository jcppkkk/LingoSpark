import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';

// Initialize Sentry as early as possible
Sentry.init({
  dsn: "https://20f8b8f1f8eeb83a29a7faf46349880e@o4510430087610368.ingest.us.sentry.io/4510430094819328",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    // Automatically track fetch and XHR errors
    Sentry.httpClientIntegration(),
    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  // Tracing
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  // Enable logs to be sent to Sentry
  enableLogs: true,
  // 過濾 Google OAuth COOP 警告（不影響功能，只是瀏覽器安全策略警告）
  ignoreErrors: [
    /Cross-Origin-Opener-Policy.*window\.opener/i,
    /COOP.*window\.opener/i,
  ],
  beforeSend(event, hint) {
    // 過濾 Google API 相關的 COOP 警告
    const error = hint.originalException || hint.syntheticException;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message);
      if (message.includes('Cross-Origin-Opener-Policy') && message.includes('window.opener')) {
        return null; // 不發送此事件到 Sentry
      }
    }
    // 檢查事件訊息
    if (event.message) {
      if (event.message.includes('Cross-Origin-Opener-Policy') && event.message.includes('window.opener')) {
        return null;
      }
    }
    return event;
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);