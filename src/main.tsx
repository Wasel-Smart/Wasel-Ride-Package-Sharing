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

// Verify critical environment is configured before the app boots.
try {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. ' +
        'Check .env.local or your deployment environment.',
    );
  }
} catch (envError) {
  console.error('[Wasel] Environment not configured:', envError);
  document.body.innerHTML =
    '<div style="padding:24px;color:#ef4444;font-family:monospace;">' +
    '<h1>Configuration Error</h1>' +
    '<p>The application is not configured correctly. Contact support.</p>' +
    '</div>';
  throw envError;
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
        console.log('[Wasel] ✓ Backend connected:', result.message);
      }
      startHealthCheckMonitoring(60_000);
    } else {
      console.warn('[Wasel] ⚠ Backend connection issue:', sanitizeLogMessage(result.message));
    }
  })
  .catch(error => {
    console.error('[Wasel] Backend health check failed:', sanitizeLogMessage(String(error)));
  });

// Clear encryption key on logout
window.addEventListener('storage', e => {
  if (e.key === 'wasel-auth-state' && !e.newValue) {
    clearMasterKey();
  }
});

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

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
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
