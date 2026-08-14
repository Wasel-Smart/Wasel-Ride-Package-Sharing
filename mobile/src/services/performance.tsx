/**
 * Mobile Performance & Error Monitoring Service
 *
 * Integrates Sentry for production-grade error reporting, performance
 * monitoring (traces), and release health with cold-start instrumentation.
 */
import React from 'react';
import * as Sentry from '@sentry/react-native';
import { logger } from './logging';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let isSentryInitialized = false;
const COLD_START_START = Date.now();

export function initPerformanceMonitoring() {
  if (!SENTRY_DSN || isSentryInitialized) {
    if (!SENTRY_DSN) {
      logger.warn('[Performance] Sentry DSN not found, monitoring is disabled.');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: process.env.NODE_ENV === 'development',
      release: `wasel-mobile@${process.env.EXPO_PUBLIC_APP_VERSION || 'unknown'}`,
      dist: process.env.EXPO_PUBLIC_APP_BUILD_NUMBER || 'unknown',
      environment: process.env.NODE_ENV === 'development' ? 'development' : 'production',
      tracesSampleRate: 1.0,
      attachScreenshot: true,
      attachViewHierarchy: true,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      enableTracing: true,
      enableAutoPerformanceTracing: true,
      enableNativeCrashHandling: true,
      enableWatchdogTerminationTracking: true,
      enableAppHangTracking: true,
      appHangTimeoutIntervalMillis: 5000,
      enableMetrics: true,
      enableTimeToInitialDisplayTracking: true,
      enableTimeToFullDisplayTracking: true,
      enableScreenTracking: true,
      enableAutoComponentTracking: true,
    });

    isSentryInitialized = true;
    logger.info('[Performance] Sentry initialized successfully.');
  } catch (error) {
    logger.error('[Performance] Failed to initialize Sentry', error);
  }
}

function startTransaction(name: string, op: string, attributes?: Record<string, string | number | boolean>) {
  if (!isSentryInitialized) return null;
  const transaction = Sentry.startTransaction({ name, op });
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      transaction?.setAttribute(key, value);
    });
  }
  return transaction;
}

function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!isSentryInitialized) {
    logger.error('[Capture Bypassed]', error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

function addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, unknown>) {
  if (!isSentryInitialized) return;
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
  });
}

export function recordColdStart(): void {
  const coldStartMs = Date.now() - COLD_START_START;
  addBreadcrumb(`Cold start: ${coldStartMs}ms`, 'app.lifecycle', 'info', {
    coldStartMs,
    platform: 'react-native',
  });
}

export function recordNavigation(from: string, to: string): void {
  addBreadcrumb(`Navigation: ${from} -> ${to}`, 'navigation', 'info', { from, to });
  startTransaction(`${to}_screen`, 'ui.screen', { from, to });
}

export function recordOfflineAction(actionType: string): void {
  addBreadcrumb(`Offline action queued: ${actionType}`, 'offline', 'info', { actionType });
}

export function recordSyncResult(actionType: string, success: boolean): void {
  addBreadcrumb(`Sync ${actionType}: ${success ? 'success' : 'failure'}`, 'offline', success ? 'info' : 'warning', {
    actionType,
    success,
  });
}

export function recordApiCall(endpoint: string, method: string, status: number, durationMs: number): void {
  addBreadcrumb(`API ${method} ${endpoint} ${status}`, 'http', status < 400 ? 'info' : 'warning', {
    endpoint,
    method,
    status,
    durationMs,
  });
  startTransaction(`api.${method}.${endpoint.replace(/\//g, '_')}`, 'http.client', {
    endpoint,
    method,
    status: String(status),
    durationMs,
  });
}

export const performance = {
  startTransaction,
  captureException,
  addBreadcrumb,
  recordColdStart,
  recordNavigation,
  recordOfflineAction,
  recordSyncResult,
  recordApiCall,
};

export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  screenName: string,
) {
  const PerformanceTrackedComponent = (props: P) => {
    React.useEffect(() => {
      const transaction = startTransaction(`${screenName}_load`, 'ui.load', { screen: screenName });
      return () => {
        transaction?.finish();
      };
    }, []);
    return <Component {...props} />;
  };

  return Sentry.withProfiler(React.memo(PerformanceTrackedComponent));
}
