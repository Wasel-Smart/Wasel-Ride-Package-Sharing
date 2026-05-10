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

class RootErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean; message: string }> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown startup error',
    };
  }

  componentDidCatch(error: unknown) {
    console.error('[Wasel] Unhandled render error:', sanitizeForLog(String(error)));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: '#fff', background: '#0B0F14' }}>
          <div style={{ maxWidth: '560px', background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px' }}>
            <h1 style={{ margin: 0, color: '#F5B041' }}>Application Error</h1>
            <p style={{ marginTop: '12px' }}>A runtime error prevented the app from rendering.</p>
            <p style={{ fontFamily: 'monospace', fontSize: '13px', opacity: 0.85 }}>{this.state.message}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


function initializeTelemetry() {
  if (telemetryInitialized || !hasTelemetryConsent()) {
    return;
  }

  telemetryInitialized = true;

  if (import.meta.env.PROD) {
    initializeSentry();
  }

  scheduleDeferredTask(async () => {
    const [{ initWebVitalsReporter }, { initPerformanceMonitoring }] = await Promise.all([
      import('./utils/webVitalsReporter'),
      import('./utils/performance'),
    ]);
    initWebVitalsReporter();
    initPerformanceMonitoring();
  }, 2_500);
}

function initializePerformanceOptimizations() {
  resourceHints.preconnectCriticalOrigins();
  lazyLoader.initialize({ rootMargin: '100px', threshold: 0.01 });
  
  if (adaptiveLoading.shouldPrefetchRoutes()) {
    scheduleDeferredTask(() => {
      resourceHints.prefetchCriticalRoutes();
    }, 3_000);
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

// Validate environment configuration early
try {
  validateEnvironmentConfig();
  enforceSyntheticDataSafety();
} catch (error) {
  console.error('[Wasel] Failed to initialize application due to configuration error:', sanitizeForLog(String(error)));
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

  renderStartupConfigurationError({
    direction: initialDirection,
    isArabic,
    themePreference: initialThemePreference,
    title: configurationTitle,
    body: configurationBody,
    help: configurationHelp,
  });
  throw error;
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('[Wasel] Root element #root not found. Check index.html.');
}

rootElement.textContent = '';

initializePerformanceOptimizations();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);

initializeTelemetry();

if (typeof window !== 'undefined') {
  window.addEventListener(CONSENT_DECISION_EVENT, (event: Event) => {
    const detail = (event as CustomEvent<{ accepted?: boolean }>).detail;
    if (detail?.accepted) {
      initializeTelemetry();
    }
  });
}

if (import.meta.env.PROD && import.meta.env.MODE !== 'test' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[Wasel] Service Worker registration failed:', sanitizeForLog(String(error)));
    });
  });
}
