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

// ── Security bootstrappers ─────────────────────────────────────────────────
// These run synchronously before React mounts so CSRF and session tokens
// are available to the first authenticated API call.

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

// ── Backend connectivity check (non-blocking) ─────────────────────────────
// verifyBackendConnection is fire-and-forget; it does NOT delay first render.
verifyBackendConnection()
  .then(result => {
    if (result.connected) {
      if (import.meta.env.DEV) {
        console.info('[Wasel] ✓ Backend connected:', result.message);
      }
      startHealthCheckMonitoring(60_000);
    } else {
      console.warn('[Wasel] ⚠ Backend connection issue:', sanitizeLogMessage(result.message));
    }
  })
  .catch(error => {
    console.error('[Wasel] Backend health check failed:', sanitizeLogMessage(String(error)));
  });

// ── Encryption key cleanup on logout ──────────────────────────────────────
window.addEventListener('storage', e => {
  if (e.key === 'wasel-auth-state' && !e.newValue) {
    clearMasterKey();
  }
});

// ── Mount React ────────────────────────────────────────────────────────────
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('[Wasel] Root element #root not found. Check index.html.');
}

// NOTE: Do NOT clear rootElement.innerHTML here.
// If a static skeleton or SSR shell is present, React should hydrate it.
// Clearing it causes a flash of empty content before React mounts.

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// ── Local dev: unregister stale service workers ────────────────────────────
// Called AFTER render so it does not delay the first paint.
// If a reload is required, it happens after the UI is visible.
void resetLocalDevelopmentArtifacts();

// ── Production service worker registration ────────────────────────────────
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

// ── DEV-only debug utilities ───────────────────────────────────────────────
// Esbuild tree-shakes this entire block in production builds.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as Window & { __waselDebug?: unknown }).__waselDebug = {
    resetApiCircuitBreaker,
    getApiCircuitBreakerState,
    getAllCircuitBreakers: () => circuitBreakers.getAllStats(),
    resetAllCircuitBreakers: () => circuitBreakers.resetAll(),
  };
  console.info('[Wasel] Debug utilities available at window.__waselDebug');
}
