import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeCsrfProtection } from './utils/csrf';
import { initializeSessionManagement } from './utils/session';
import { clearMasterKey } from './utils/encryption';
import {
  safeStorageGetItem,
  safeStorageRemoveItem,
  safeStorageSetItem,
} from './utils/browserStorage';
import { verifyBackendConnection, startHealthCheckMonitoring } from './utils/healthCheck';
import { sanitizeLogMessage } from './utils/sanitization';
import { circuitBreakers } from './utils/circuitBreaker';
import { resetApiCircuitBreaker, getApiCircuitBreakerState } from './services/core';
import { initializeAppInsights } from './utils/appInsights';

const LOCAL_DEV_RESET_KEY = 'wasel-local-dev-cache-reset';

function isLocalDevelopmentOrigin(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const { hostname, protocol } = new URL(window.location.origin);
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

async function resetLocalDevelopmentArtifacts(): Promise<void> {
  if (!isLocalDevelopmentOrigin() || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) {
      safeStorageRemoveItem('sessionStorage', LOCAL_DEV_RESET_KEY);
      return;
    }

    await Promise.allSettled(registrations.map(registration => registration.unregister()));

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.allSettled(cacheKeys.map(cacheKey => caches.delete(cacheKey)));
    }

    if (!safeStorageGetItem('sessionStorage', LOCAL_DEV_RESET_KEY)) {
      safeStorageSetItem('sessionStorage', LOCAL_DEV_RESET_KEY, '1');
      window.location.reload();
      return;
    }

    safeStorageRemoveItem('sessionStorage', LOCAL_DEV_RESET_KEY);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Wasel] Local cache cleanup skipped.', error);
    }
  }
}

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

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    const diagnostics: Record<string, unknown> = {};
    if (typeof navigator !== 'undefined') {
      diagnostics.userAgent = navigator.userAgent;
      diagnostics.platform = navigator.platform;
      diagnostics.language = navigator.language;
      diagnostics.onLine = navigator.onLine;
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number } }).connection;
      if (connection) {
        diagnostics.connectionType = connection.effectiveType;
        diagnostics.downlink = connection.downlink;
      }
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      if (memory) diagnostics.deviceMemory = memory;
      const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency;
      if (cores) diagnostics.hardwareConcurrency = cores;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(
      '[Wasel] Unhandled render error:',
      sanitizeLogMessage(message),
      sanitizeLogMessage(info.componentStack ?? ''),
      diagnostics,
    );

    // Chunk-load failures (e.g. stale SW cache serving a hash that no longer
    // exists on the server) are the primary cause of app_mount_timeout on
    // mobile. A plain reload re-hits the same cache; hard-recover clears it.
    const isChunkError =
      /loading chunk/i.test(message) ||
      /failed to fetch dynamically imported module/i.test(message) ||
      /importing a module script failed/i.test(message);
    if (isChunkError) {
      const hardRecover = (window as unknown as { waselHardRecover?: () => void }).waselHardRecover;
      if (typeof hardRecover === 'function') {
        hardRecover();
      }
    }
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

const rootElement = document.getElementById('root');

// Verify critical environment is configured before the app boots.
const environmentIsValid = (() => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    const isPlaceholder = (v: string | undefined) =>
      !v || v.startsWith('your-') || v === 'undefined' || v === 'null';
    const isValidUrl = (v: string) => {
      try { return /^https?:\/\//.test(new URL(v).href); } catch { return false; }
    };
    if (isPlaceholder(supabaseUrl) || !isValidUrl(supabaseUrl ?? '')) {
      throw new Error(
        'VITE_SUPABASE_URL is not configured. Set a real Supabase project URL in .env.',
      );
    }
    if (isPlaceholder(anonKey)) {
      throw new Error(
        'VITE_SUPABASE_ANON_KEY is not configured. Set a real anon key in .env.',
      );
    }
    return true;
  } catch (envError) {
    console.error('[Wasel] Environment not configured:', envError);
    const configErrorDiv = document.createElement('div');
    configErrorDiv.style.padding = '24px';
    configErrorDiv.style.color = '#ef4444';
    configErrorDiv.style.fontFamily = 'monospace';
    const heading = document.createElement('h1');
    heading.textContent = 'Configuration Error';
    const paragraph = document.createElement('p');
    paragraph.textContent = 'The application is not configured correctly. Contact support.';
    configErrorDiv.appendChild(heading);
    configErrorDiv.appendChild(paragraph);
    if (rootElement) {
      rootElement.innerHTML = '';
      rootElement.appendChild(configErrorDiv);
    }
    return false;
  }
})();

if (!rootElement) {
  throw new Error('[Wasel] Root element #root not found. Check index.html.');
}

if (environmentIsValid) {
  // Initialize observability
  try {
    initializeAppInsights();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Wasel] Application Insights initialization failed.', error);
    }
  }

  // Initialize security features
  try {
    initializeCsrfProtection();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Wasel] CSRF startup initialization failed.', error);
    }
  }

  try {
    initializeSessionManagement();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Wasel] Session startup initialization failed.', error);
    }
  }

  // Verify backend connectivity on startup (both dev and prod).
  // In production we log warnings without blocking render.
  verifyBackendConnection()
    .then(result => {
      if (result.connected) {
        if (import.meta.env.DEV) {
          console.log('[Wasel] ✓ Backend connected:', sanitizeLogMessage(result.message));
        }
        startHealthCheckMonitoring(60_000);
      } else {
        if (import.meta.env.DEV) {
          console.warn('[Wasel] ⚠ Backend connection issue:', sanitizeLogMessage(result.message));
        }
        // Still start monitoring so the app recovers when the backend comes up,
        // but use a longer interval to avoid flooding the console.
        startHealthCheckMonitoring(5 * 60_000);
      }
    })
    .catch(error => {
      if (import.meta.env.DEV) {
        console.warn('[Wasel] Backend health check skipped:', sanitizeLogMessage(String(error)));
      }
    });

  // Clear encryption key on logout
  window.addEventListener('storage', e => {
    if (e.key === 'wasel-auth-state' && !e.newValue) {
      clearMasterKey();
    }
  });

  rootElement.textContent = '';

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>,
  );

  // React 19 render() is async — mark mounted after the first paint, not
  // synchronously after render() returns, so the 15-second timeout in
  // index.html doesn't fire on slow mobile connections while the app is
  // still loading normally.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.dataset.appMounted = 'true';
      const bootStatus = document.getElementById('boot-status');
      if (bootStatus) {
        bootStatus.setAttribute('data-state', 'hidden');
        bootStatus.style.display = 'none';
      }
    });
  });

  void resetLocalDevelopmentArtifacts();

  // Expose circuit breaker utilities globally — DEV builds only.
  // In production this block is dead code and tree-shaken by esbuild.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    (
      window as Window & {
        __waselDebug?: {
          resetApiCircuitBreaker: typeof resetApiCircuitBreaker;
          getApiCircuitBreakerState: typeof getApiCircuitBreakerState;
          getAllCircuitBreakers: () => ReturnType<typeof circuitBreakers.getAllStats>;
          resetAllCircuitBreakers: () => void;
        };
      }
    ).__waselDebug = {
      resetApiCircuitBreaker,
      getApiCircuitBreakerState,
      getAllCircuitBreakers: () => circuitBreakers.getAllStats(),
      resetAllCircuitBreakers: () => circuitBreakers.resetAll(),
    };
    console.info('[Wasel] Debug utilities available at window.__waselDebug');
  }

  if (import.meta.env.PROD && import.meta.env.MODE !== 'test' && 'serviceWorker' in navigator && !window.location.hostname.includes('127.0.0.1') && window.location.hostname !== 'localhost') {
    window.addEventListener('load', async () => {
      // Unregister any SW whose scriptURL no longer points at /sw.js
      // (e.g. a leftover from a previous scope or path change). On mobile,
      // these zombie workers can intercept fetches and serve stale asset
      // hashes that no longer exist on the server, causing app_mount_timeout.
      try {
        const existing = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(
          existing
            .filter(r => !r.active?.scriptURL.endsWith('/sw.js'))
            .map(r => r.unregister()),
        );
      } catch { /* non-fatal */ }

      let swUpdateDetected = false;

      const onControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        if (swUpdateDetected && navigator.serviceWorker.controller) {
          window.location.reload();
        }
      };

      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((registration) => {
        registration.update().catch(() => { });

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        if (registration.waiting) {
          swUpdateDetected = true;
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            swUpdateDetected = true;
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }).catch((error) => {
        console.warn('[Wasel] Service Worker registration failed:', sanitizeLogMessage(String(error)));
      });
    });
  }

  function isStandalonePWA(): boolean {
    if (typeof window === 'undefined') return false;
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (mediaQuery.matches) return true;
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
    return false;
  }

  if (isStandalonePWA()) {
    document.documentElement.classList.add('pwa-standalone');
  }

  type ServiceWorkerMessage = { type: 'NAVIGATE'; url: string } | { type: 'BACKGROUND_SYNC' };

  function handleServiceWorkerMessage(event: MessageEvent<ServiceWorkerMessage>) {
    const message = event.data;

    if (!message) return;

    if (message.type === 'NAVIGATE') {
      window.location.href = message.url;
    }

    if (message.type === 'BACKGROUND_SYNC') {
      window.dispatchEvent(new Event('online'));
    }
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }
}
