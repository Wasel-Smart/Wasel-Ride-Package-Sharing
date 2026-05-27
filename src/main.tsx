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

import {
  verifyBackendConnection,
  startHealthCheckMonitoring,
} from './utils/healthCheck';
import { hasBackendRuntimeConfig } from './utils/env';

import { sanitizeLogMessage } from './utils/sanitization';
import { circuitBreakers } from './utils/circuitBreaker';

import {
  resetApiCircuitBreaker,
  getApiCircuitBreakerState,
} from './services/core';

const LOCAL_DEV_RESET_KEY = 'wasel-local-dev-cache-reset';

const IS_BROWSER =
  typeof window !== 'undefined' &&
  typeof document !== 'undefined';

const IS_DEV = import.meta.env.DEV;
const IS_PROD = import.meta.env.PROD;

/**
 * Safe logger wrapper
 */
const logger = {
  info: (...args: unknown[]) => {
    if (IS_DEV) console.info(...args);
  },

  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  error: (...args: unknown[]) => {
    console.error(...args);
  },
};

/**
 * Check if app is running on localhost dev environment
 */
function isLocalDevelopmentOrigin(): boolean {
  if (!IS_BROWSER) return false;

  try {
    const { hostname, protocol } = new URL(window.location.origin);

    return (
      protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(hostname)
    );
  } catch {
    return false;
  }
}

/**
 * Cleanup stale local service workers and cache
 * Prevents old assets from causing broken dev builds.
 */
async function resetLocalDevelopmentArtifacts(): Promise<void> {
  if (
    !IS_BROWSER ||
    !isLocalDevelopmentOrigin() ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  try {
    const registrations =
      await navigator.serviceWorker.getRegistrations();

    if (registrations.length === 0) {
      safeStorageRemoveItem(
        'sessionStorage',
        LOCAL_DEV_RESET_KEY
      );
      return;
    }

    await Promise.allSettled(
      registrations.map(reg =>
        reg.unregister()
      )
    );

    if ('caches' in window) {
      const cacheKeys = await caches.keys();

      await Promise.allSettled(
        cacheKeys.map(key =>
          caches.delete(key)
        )
      );
    }

    const alreadyReloaded =
      safeStorageGetItem(
        'sessionStorage',
        LOCAL_DEV_RESET_KEY
      );

    if (!alreadyReloaded) {
      safeStorageSetItem(
        'sessionStorage',
        LOCAL_DEV_RESET_KEY,
        '1'
      );

      window.location.reload();
      return;
    }

    safeStorageRemoveItem(
      'sessionStorage',
      LOCAL_DEV_RESET_KEY
    );
  } catch (error) {
    logger.warn(
      '[Wasel] Local cache cleanup skipped.',
      sanitizeLogMessage(String(error))
    );
  }
}

/**
 * Security initialization
 * Must run before first API request.
 */
function initializeSecurity(): void {
  try {
    initializeCsrfProtection();
  } catch (error) {
    logger.warn(
      '[Wasel] CSRF startup failed.',
      sanitizeLogMessage(String(error))
    );
  }

  try {
    initializeSessionManagement();
  } catch (error) {
    logger.warn(
      '[Wasel] Session startup failed.',
      sanitizeLogMessage(String(error))
    );
  }
}

/**
 * Backend health monitoring
 * Fire-and-forget, never blocks render.
 */
async function initializeBackendHealth(): Promise<void> {
  if (!hasBackendRuntimeConfig()) {
    logger.info(
      '[Wasel] Backend health checks skipped because runtime API credentials are not configured.'
    );
    return;
  }

  try {
    const result =
      await verifyBackendConnection();

    if (result.connected) {
      logger.info(
        '[Wasel] Backend connected:',
        result.message
      );

      startHealthCheckMonitoring(
        60_000
      );
    } else {
      logger.warn(
        '[Wasel] Backend issue:',
        sanitizeLogMessage(
          result.message
        )
      );
    }
  } catch (error) {
    logger.error(
      '[Wasel] Health check failed:',
      sanitizeLogMessage(
        String(error)
      )
    );
  }
}

/**
 * Encryption cleanup on logout
 */
function initializeStorageListeners(): void {
  if (!IS_BROWSER) return;

  window.addEventListener(
    'storage',
    (event: StorageEvent) => {
      try {
        if (
          event.key ===
            'wasel-auth-state' &&
          !event.newValue
        ) {
          clearMasterKey();
        }
      } catch (error) {
        logger.warn(
          '[Wasel] Failed to clear master key:',
          sanitizeLogMessage(
            String(error)
          )
        );
      }
    }
  );
}

/**
 * Register production service worker
 */
function registerServiceWorker(): void {
  if (
    !IS_PROD ||
    !IS_BROWSER ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  window.addEventListener(
    'load',
    () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          logger.info(
            '[Wasel] Service worker registered.'
          );
        })
        .catch(error => {
          logger.warn(
            '[Wasel] SW registration failed:',
            sanitizeLogMessage(
              String(error)
            )
          );
        });
    },
    { once: true }
  );
}

/**
 * Debug utilities (DEV only)
 */
function initializeDebugTools(): void {
  if (!IS_DEV || !IS_BROWSER) {
    return;
  }

  interface WaselWindow
    extends Window {
    __waselDebug?: {
      resetApiCircuitBreaker:
        typeof resetApiCircuitBreaker;
      getApiCircuitBreakerState:
        typeof getApiCircuitBreakerState;
      getAllCircuitBreakers: () => unknown;
      resetAllCircuitBreakers: () => void;
    };
  }

  (
    window as WaselWindow
  ).__waselDebug = {
    resetApiCircuitBreaker,
    getApiCircuitBreakerState,
    getAllCircuitBreakers:
      () =>
        circuitBreakers.getAllStats(),
    resetAllCircuitBreakers:
      () =>
        circuitBreakers.resetAll(),
  };

  logger.info(
    '[Wasel] Debug tools available: window.__waselDebug'
  );
}

/**
 * Mount React app
 */
function mountApplication(): void {
  if (!IS_BROWSER) {
    throw new Error(
      '[Wasel] Browser environment unavailable.'
    );
  }

  const rootElement =
    document.getElementById(
      'root'
    );

  if (!rootElement) {
    throw new Error(
      '[Wasel] Root element #root not found.'
    );
  }

  ReactDOM.createRoot(
    rootElement
  ).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

/**
 * Bootstrap application
 */
async function bootstrap(): Promise<void> {
  initializeSecurity();

  initializeStorageListeners();

  mountApplication();

  // Non-blocking background tasks
  void initializeBackendHealth();
  void resetLocalDevelopmentArtifacts();

  registerServiceWorker();
  initializeDebugTools();
}

void bootstrap();
