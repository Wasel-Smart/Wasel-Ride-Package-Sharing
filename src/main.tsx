import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { enforceDemoModeSafety, validateEnvironmentConfig } from './utils/environment';

// Validate environment configuration early
try {
  validateEnvironmentConfig();
  enforceDemoModeSafety();
} catch (error) {
  console.error('[Wasel] Failed to initialize application due to configuration error:', error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; background: #f5f5f5;">
      <div style="text-align: center; max-width: 500px; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #d32f2f; margin: 0 0 16px;">Configuration Error</h1>
        <p style="color: #666; margin: 16px 0;">${error instanceof Error ? error.message : 'Unknown configuration error'}</p>
        <p style="color: #999; font-size: 14px;">Please contact support or check your environment variables.</p>
      </div>
    </div>
  `;
  throw error;
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('[Wasel] Root element #root not found. Check index.html.');
}

rootElement.innerHTML = '';

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[Wasel] Service Worker registration failed:', error);
    });
  });
}
