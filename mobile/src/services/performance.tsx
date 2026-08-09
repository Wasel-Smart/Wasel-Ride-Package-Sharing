/**
 * Mobile Performance & Error Monitoring Service
 *
 * Integrates Sentry for production-grade error reporting, performance
 * monitoring (traces), and release health.
 */
import React from 'react';
import * as Sentry from '@sentry/react-native';
import { logger } from './logging'; // Assuming a shared logger utility

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let isSentryInitialized = false;

/**
 * Initializes Sentry for the application. Should be called once at app startup.
 */
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
      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production.
      tracesSampleRate: 1.0,
      // Attach screenshots to transactions
      attachScreenshot: true,
      // Attach view hierarchy to transactions
      attachViewHierarchy: true,
      // Enable automatic session tracking
      enableAutoSessionTracking: true,
      // Set the session tracking interval to 30 seconds
      sessionTrackingIntervalMillis: 30000,
    });

    isSentryInitialized = true;
    logger.info('[Performance] Sentry initialized successfully.');
  } catch (error) {
    logger.error('[Performance] Failed to initialize Sentry', error);
  }
}

/**
 * Starts a new performance transaction.
 * @param name - The name of the transaction (e.g., 'screen_load').
 * @param op - The operation being measured (e.g., 'ui.load').
 * @returns A Sentry transaction object, or null if not initialized.
 */
function startTransaction(name: string, op: string) {
  if (!isSentryInitialized) return null;
  return Sentry.startTransaction({ name, op });
}

/**
 * Captures an error or exception and sends it to Sentry.
 * @param error - The error object to capture.
 * @param context - Optional additional context to send with the error.
 */
function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!isSentryInitialized) {
    logger.error('[Capture Bypassed]', error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

/**
 * Records a custom breadcrumb for user activity tracking.
 * @param message - The breadcrumb message.
 * @param category - The category of the breadcrumb (e.g., 'ui.click').
 */
function addBreadcrumb(message: string, category: string) {
  if (!isSentryInitialized) return;
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
  });
}

export const performance = {
  startTransaction,
  captureException,
  addBreadcrumb,
};

/**
 * A React Higher-Order Component that wraps a screen component to automatically
 * track its rendering performance as a Sentry transaction.
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  screenName: string,
) {
  const PerformanceTrackedComponent = (props: P) => {
    React.useEffect(() => {
      const transaction = performance.startTransaction(screenName, 'ui.load');
      return () => {
        transaction?.finish();
      };
    }, []);
    return <Component {...props} />;
  };

  return Sentry.withProfiler(React.memo(PerformanceTrackedComponent));
}