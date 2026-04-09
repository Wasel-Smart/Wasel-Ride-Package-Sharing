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
import { initWebVitalsReporter } from './utils/webVitalsReporter';

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
  document.body.innerHTML = `
    <div dir="${initialDirection}" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif); background: ${initialThemePreference === 'light' ? '#f5faff' : '#061726'}; color: ${initialThemePreference === 'light' ? '#10243d' : '#eff6ff'};">
      <div style="text-align: ${isArabic ? 'right' : 'center'}; max-width: 500px; padding: 40px; background: ${initialThemePreference === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(10,22,40,0.94)'}; border-radius: 16px; box-shadow: 0 12px 36px ${initialThemePreference === 'light' ? 'rgba(16,36,61,0.10)' : 'rgba(0,0,0,0.28)'}; border: 1px solid ${initialThemePreference === 'light' ? 'rgba(16,36,61,0.08)' : 'rgba(73,190,242,0.14)'};">
        <h1 style="color: ${initialThemePreference === 'light' ? '#c2410c' : '#fca5a5'}; margin: 0 0 16px;">${isArabic ? 'في مشكلة بالإعدادات' : 'Configuration Error'}</h1>
        <p style="color: ${initialThemePreference === 'light' ? '#33526f' : 'rgba(239,246,255,0.78)'}; margin: 16px 0;">${error instanceof Error ? error.message : isArabic ? 'حدث خطأ غير معروف في الإعدادات.' : 'Unknown configuration error'}</p>
        <p style="color: ${initialThemePreference === 'light' ? '#64748b' : 'rgba(239,246,255,0.56)'}; font-size: 14px;">${isArabic ? 'راجع متغيرات البيئة أو تواصل مع فريق الدعم.' : 'Please contact support or check your environment variables.'}</p>
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

// Real Core Web Vitals — reported to Supabase `web_vitals` table
initWebVitalsReporter();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[Wasel] Service Worker registration failed:', error);
    });
  });
}
