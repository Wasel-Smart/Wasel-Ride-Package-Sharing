/**
 * Sentry Error Monitoring Integration
 * Version: 1.0.0
 *
 * Comprehensive error tracking and monitoring for production
 */

import * as Sentry from '@sentry/react';
import {
  logger,
  registerMonitoringSink,
  trackAPICall,
  trackNavigation,
  trackUserAction,
  usePerformanceMonitoring,
  type LogContext,
} from './logging';
import { hasTelemetryConsent } from './consent';
import { redactSensitiveValue } from './redaction';
import { omitUndefined } from './object';

let sentryInitialized = false;

function safeStorageGet(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function redactContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  return redactSensitiveValue(context) as LogContext;
}

export function initSentry() {
  if (sentryInitialized || !hasTelemetryConsent()) {
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  if (!dsn) {
    if (import.meta.env.DEV) {
      console.warn('[Sentry] DSN not configured - error monitoring disabled');
    }
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [],
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    release: `wasel@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
    ],
    beforeSend(event) {
      const raw = safeStorageGet('wasel_local_user_v2');

      if (raw) {
        try {
          const userData = JSON.parse(raw);
          event.user = { id: userData.id };
        } catch {
          // Ignore malformed local user payloads.
        }
      }

      event.tags = {
        ...event.tags,
        language: safeStorageGet('wasel_language') || 'ar',
        theme: safeStorageGet('wasel_theme') || 'dark',
      };

      if (event.extra) {
        event.extra = redactSensitiveValue(event.extra) as Record<string, unknown>;
      }

      return event;
    },
  });

  registerMonitoringSink({
    captureException: (error, context) => {
      Sentry.captureException(
        error || new Error('Unknown error'),
        omitUndefined({
          extra: redactContext(context),
        }),
      );
    },
    captureMessage: (message, level, context) => {
      Sentry.captureMessage(
        message,
        omitUndefined({
          level,
          extra: redactContext(context),
        }),
      );
    },
    addBreadcrumb: (message, category, data) => {
      Sentry.addBreadcrumb(omitUndefined({
        message,
        category,
        level: 'info' as const,
        data: redactContext(data),
      }));
    },
  });

  sentryInitialized = true;
}

export const ErrorBoundary = Sentry.ErrorBoundary;

export {
  logger,
  trackAPICall,
  trackNavigation,
  trackUserAction,
  usePerformanceMonitoring,
};

export default Sentry;
