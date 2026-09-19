import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { getStartupConfigurationError, getObservabilityWarnings } from './utils/runtimeConfigGuard';
import { sanitizeLogMessage } from './utils/sanitization';
import { safeStorageGetItem, safeStorageRemoveItem, safeStorageSetItem } from './utils/browserStorage';
import { initializeAppInsights } from './utils/appInsights';
import { initializeCsrfProtection } from './utils/csrf';
import { initializeSessionManagement } from './utils/session';
import { verifyBackendConnection, startHealthCheckMonitoring } from './utils/healthCheck';
import { clearMasterKey } from './utils/encryption';

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
      if (memory) {diagnostics.deviceMemory = memory;}
      const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency;
      if (cores) {diagnostics.hardwareConcurrency = cores;}
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(
      '[Wasel] Unhandled render error:',
      sanitizeLogMessage(message),
      sanitizeLogMessage(info.componentStack ?? ''),
      diagnostics,
    );

    const isChunkError =
      /loading chunk/i.test(message) ||
      /failed to fetch dynamically imported module/i.test(message) ||
      /importing a module script failed/i.test(message) ||
      /Invalid hook call/i.test(message);
    if (isChunkError) {
      void waselHardRecover();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: '#fff', background: '#050B12' }}>
          <div style={{ maxWidth: '560px', background: '#0e2240', border: '1px solid rgba(20,127,228,0.16)', borderRadius: '16px', padding: '28px' }}>
            <h1 style={{ margin: 0, color: '#FF8A0B' }}>Application Error</h1>
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
    const configError = getStartupConfigurationError(import.meta.env);
    if (configError) {throw new Error(configError);}
    const obsWarnings = getObservabilityWarnings(import.meta.env);
    for (const warning of obsWarnings) {
      console.warn('[Wasel] Observability:', sanitizeLogMessage(warning));
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

const CHUNK_RECOVERY_KEY_PREFIX = 'wasel-chunk-recovery:';
let chunkRecoveryInProgress = false;
let serviceWorkerReloadScheduled = false;

function getBuildVersion(): string {
  return document.querySelector('meta[name="build-time"]')?.getAttribute('content') || 'unknown';
}

function getChunkRecoveryKey(): string {
  return `${CHUNK_RECOVERY_KEY_PREFIX}${getBuildVersion()}:${window.location.pathname}`;
}

function isChunkLoadFailure(value: unknown): boolean {
  let message = '';
  if (value instanceof Error) {
    message = value.message;
  } else if (typeof value === 'string') {
    message = value;
  } else if (value && typeof value === 'object') {
    const candidate = value as { message?: unknown };
    message = typeof candidate.message === 'string' ? candidate.message : '';
  }

  return /loading chunk|failed to fetch dynamically imported module|importing a module script failed|chunkloaderror|invalid hook call/i.test(message);
}

function reloadAfterServiceWorkerUpdate(): void {
  if (serviceWorkerReloadScheduled) return;
  serviceWorkerReloadScheduled = true;
  window.location.reload();
}

async function waselHardRecover(): Promise<void> {
  if (chunkRecoveryInProgress) return;
  chunkRecoveryInProgress = true;

  try {
    const recoveryKey = getChunkRecoveryKey();
    if (window.sessionStorage.getItem(recoveryKey)) return;
    window.sessionStorage.setItem(recoveryKey, '1');
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
  } catch {
    // Recovery must continue even if cache or registration cleanup is blocked.
  }

  window.location.replace(window.location.href);
}

(window as unknown as { waselHardRecover?: () => Promise<void> }).waselHardRecover = waselHardRecover;

if (import.meta.env.PROD && import.meta.env.MODE !== 'test') {
  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadFailure(event.reason)) return;
    event.preventDefault();
    void waselHardRecover();
  });

  window.addEventListener('error', (event) => {
    if (!isChunkLoadFailure(event.message)) return;
    void waselHardRecover();
  });
}

if (environmentIsValid) {
  rootElement.textContent = '';

  const AppTree = import.meta.env.DEV ? React.StrictMode : React.Fragment;

  ReactDOM.createRoot(rootElement).render(
    <AppTree>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </AppTree>,
  );

  void resetLocalDevelopmentArtifacts();

  const scheduleIdle = (callback: () => void, delay = 0) =>
    typeof requestIdleCallback !== 'undefined'
      ? requestIdleCallback(callback, { timeout: delay + 1000 })
      : setTimeout(callback, delay);

  // Defer non-critical initializations to reduce initial bundle impact.
  void scheduleIdle(async () => {
    try {
      initializeAppInsights();
      initializeCsrfProtection();
      initializeSessionManagement();

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
            startHealthCheckMonitoring(5 * 60_000);
          }
        })
        .catch(error => {
          if (import.meta.env.DEV) {
            console.warn('[Wasel] Backend health check skipped:', sanitizeLogMessage(String(error)));
          }
        });

      window.addEventListener('storage', e => {
        if (e.key === 'wasel-auth-state' && !e.newValue) {
          clearMasterKey();
        }
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[Wasel] Deferred initialization failed:', error);
      }
    }
  });

  // Expose circuit breaker utilities globally — DEV builds only.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    void import('./utils/circuitBreaker').then(({ circuitBreakers }) => {
      void import('./services/core').then(({ resetApiCircuitBreaker, getApiCircuitBreakerState }) => {
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
      });
    });
  }

  if (import.meta.env.PROD && import.meta.env.MODE !== 'test' && 'serviceWorker' in navigator && !window.location.hostname.includes('127.0.0.1') && window.location.hostname !== 'localhost') {
    window.addEventListener('load', async () => {
      try {
        const existing = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(
          existing
            .filter(r => !r.active?.scriptURL.endsWith('/sw.js'))
            .map(r => r.unregister()),
        );
      } catch { /* non-fatal */ }

      const onControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        reloadAfterServiceWorkerUpdate();
      };

      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((registration) => {
        registration.update().catch(() => { });

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch((error) => {
        console.warn('[Wasel] Service Worker registration failed:', sanitizeLogMessage(String(error)));
      });
    });
  }

  // Hard recover from chunk-loading failures caused by stale caches after deployment.
  // Clears all caches, unregisters service workers, and forces a full reload.
  (window as unknown as { waselHardRecover?: () => void }).waselHardRecover = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
    } catch {
      // Ignore cleanup errors — we're recovering anyway
    }
    window.location.reload();
  };

  function isStandalonePWA(): boolean {
    if (typeof window === 'undefined') {return false;}
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (mediaQuery.matches) {return true;}
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {return true;}
    return false;
  }

  if (isStandalonePWA()) {
    document.documentElement.classList.add('pwa-standalone');
  }

  type ServiceWorkerMessage = { type: 'NAVIGATE'; url: string } | { type: 'BACKGROUND_SYNC' } | { type: 'SW_UPDATED' };

  function handleServiceWorkerMessage(event: MessageEvent<ServiceWorkerMessage>) {
    const message = event.data;

    if (!message) {return;}

    if (message.type === 'NAVIGATE') {
      window.location.href = message.url;
    }

    if (message.type === 'BACKGROUND_SYNC') {
      window.dispatchEvent(new Event('online'));
    }

    if (message.type === 'SW_UPDATED') {
      window.location.reload();
    }
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }
}
