import React from 'react';
import ReactDOM from 'react-dom/client';

import './domains';
import App from './App';
import './index.css';

import {
  getDirectionForLanguage,
  getInitialLanguage,
  getLocaleForLanguage,
} from './utils/locale';

import { initializeThemeFromStorage } from './utils/theme';
import { enforceSyntheticDataSafety, validateEnvironmentConfig } from './utils/environment';
import { scheduleDeferredTask } from './utils/runtimeScheduling';
import {
  installNonBlockingFonts,
  renderStartupConfigurationError,
} from './utils/startupDom';

import { sanitizeForLog } from './utils/logSanitizer';
import { initializeSentry } from './utils/monitoring';
import { CONSENT_DECISION_EVENT, hasTelemetryConsent } from './utils/consent';
import { resourceHints } from './utils/performance/resourceHints';
import { lazyLoader } from './utils/performance/lazyLoading';
import { adaptiveLoading } from './utils/performance/adaptiveLoading';

let telemetryInitialized = false;

function initializeTelemetry() {
  if (telemetryInitialized || !hasTelemetryConsent()) return;

  telemetryInitialized = true;

  if (import.meta.env.PROD) {
    initializeSentry();
  }

  scheduleDeferredTask(async () => {
    const [{ initWebVitalsReporter }, { initPerformanceMonitoring }] =
      await Promise.all([
        import('./utils/webVitalsReporter'),
        import('./utils/performance'),
      ]);

    initWebVitalsReporter();
    initPerformanceMonitoring();
  }, 2500);
}

function initializePerformanceOptimizations() {
  resourceHints.preconnectCriticalOrigins();
  lazyLoader.initialize({ rootMargin: '100px', threshold: 0.01 });

  if (adaptiveLoading.shouldPrefetchRoutes()) {
    scheduleDeferredTask(() => {
      resourceHints.prefetchCriticalRoutes();
    }, 3000);
  }

  if (import.meta.env.DEV) {
    adaptiveLoading.logCapabilities();
  }
}

const initialThemePreference = initializeThemeFromStorage();
const initialLanguage = getInitialLanguage();
const initialDirection = getDirectionForLanguage(initialLanguage);
const initialLocale = getLocaleForLanguage(initialLanguage);

document.documentElement.dir = initialDirection;
document.documentElement.lang = initialLocale;

installNonBlockingFonts();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('[Wasel] Root element #root not found. Check index.html.');
}

let environmentIsValid = true;

try {
  validateEnvironmentConfig();
  enforceSyntheticDataSafety();
} catch (error) {
  environmentIsValid = false;

  console.error(
    '[Wasel] Configuration error:',
    sanitizeForLog(String(error))
  );

  const isArabic = initialLanguage === 'ar';

  renderStartupConfigurationError({
    direction: initialDirection,
    isArabic,
    themePreference: initialThemePreference,
    title: isArabic ? 'مشكلة في الإعدادات' : 'Configuration Error',
    body:
      error instanceof Error
        ? error.message
        : isArabic
        ? 'حدث خطأ غير معروف في الإعدادات.'
        : 'Unknown configuration error',
    help: isArabic
      ? 'راجع متغيرات البيئة أو تواصل مع فريق الدعم.'
      : 'Check environment variables or contact support.',
  });
}

if (environmentIsValid) {
  initializePerformanceOptimizations();

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  initializeTelemetry();
}

window.addEventListener(CONSENT_DECISION_EVENT, (event) => {
  const detail = event?.detail;
  if (detail?.accepted) initializeTelemetry();
});

if (
  import.meta.env.PROD &&
  import.meta.env.MODE !== 'test' &&
  'serviceWorker' in navigator
) {
  window.addEventListener('load', () => {
    const basePath = import.meta.env.BASE_URL || '/';
    const swPath = `${basePath}sw.js`;

    navigator.serviceWorker
      .register(swPath)
      .catch((error) => {
        console.warn(
          '[Wasel] Service Worker registration failed:',
          sanitizeForLog(String(error))
        );
      });
  });
}
