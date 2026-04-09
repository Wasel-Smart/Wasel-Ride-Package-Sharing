import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import {
  getDirectionForLanguage,
  getInitialLanguage,
  getLocaleForLanguage,
} from './utils/locale';
import { initializeThemeFromStorage } from './utils/theme';
import { enforceDemoModeSafety, validateEnvironmentConfig } from './utils/environment';
import { scheduleDeferredTask } from './utils/runtimeScheduling';

const initialThemePreference = initializeThemeFromStorage();
const initialLanguage = getInitialLanguage();
const initialDirection = getDirectionForLanguage(initialLanguage);
const initialLocale = getLocaleForLanguage(initialLanguage);

document.documentElement.dir = initialDirection;
document.documentElement.lang = initialLocale;

// Validate environment configuration early
try {
  validateEnvironmentConfig();
  enforceDemoModeSafety();
} catch (error) {
  console.error('[Wasel] Failed to initialize application due to configuration error:', error);
  const isArabic = initialLanguage === 'ar';
  const configurationTitle = isArabic ? '\u0641\u064a \u0645\u0634\u0643\u0644\u0629 \u0628\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a' : 'Configuration Error';
  const configurationBody = error instanceof Error
    ? error.message
    : isArabic
      ? '\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641 \u0641\u064a \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a.'
      : 'Unknown configuration error';
  const configurationHelp = isArabic
    ? '\u0631\u0627\u062c\u0639 \u0645\u062a\u063a\u064a\u0631\u0627\u062a \u0627\u0644\u0628\u064a\u0626\u0629 \u0623\u0648 \u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0641\u0631\u064a\u0642 \u0627\u0644\u062f\u0639\u0645.'
    : 'Please contact support or check your environment variables.';

  document.body.innerHTML = `
    <div dir="${initialDirection}" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif); background: ${initialThemePreference === 'light' ? '#f5faff' : '#061726'}; color: ${initialThemePreference === 'light' ? '#10243d' : '#eff6ff'};">
      <div style="text-align: ${isArabic ? 'right' : 'center'}; max-width: 500px; padding: 40px; background: ${initialThemePreference === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(10,22,40,0.94)'}; border-radius: 16px; box-shadow: 0 12px 36px ${initialThemePreference === 'light' ? 'rgba(16,36,61,0.10)' : 'rgba(0,0,0,0.28)'}; border: 1px solid ${initialThemePreference === 'light' ? 'rgba(16,36,61,0.08)' : 'rgba(93,150,210,0.14)'};">
        <h1 style="color: ${initialThemePreference === 'light' ? '#c2410c' : '#fca5a5'}; margin: 0 0 16px;">${configurationTitle}</h1>
        <p style="color: ${initialThemePreference === 'light' ? '#33526f' : 'rgba(239,246,255,0.78)'}; margin: 16px 0;">${configurationBody}</p>
        <p style="color: ${initialThemePreference === 'light' ? '#64748b' : 'rgba(239,246,255,0.56)'}; font-size: 14px;">${configurationHelp}</p>
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

// Real Core Web Vitals reported to Supabase `web_vitals` table.
scheduleDeferredTask(async () => {
  const { initWebVitalsReporter } = await import('./utils/webVitalsReporter');
  initWebVitalsReporter();
}, 2_500);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[Wasel] Service Worker registration failed:', error);
    });
  });
}
