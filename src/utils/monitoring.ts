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
let browserRuntimeMonitoringInitialized = false;

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

function captureRuntimeSignal(
  message: string,
  level: 'info' | 'warning' | 'error',
  extra?: Record<string, unknown>,
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    scope.setTag('runtime_signal', 'browser');
    if (extra) {
      scope.setContext('runtime', redactSensitiveValue(extra) as Record<string, unknown>);
    }
    Sentry.captureMessage(message);
  });
}

function installBrowserRuntimeMonitoring() {
  if (browserRuntimeMonitoringInitialized || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('error', (event) => {
    if (!event.error) {
      return;
    }

    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setTag('runtime_signal', 'window_error');
      scope.setContext('runtime', {
        pathname: window.location.pathname,
        filename: event.filename || null,
        line: event.lineno || null,
        column: event.colno || null,
      });
      Sentry.captureException(event.error);
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const rejection =
      event.reason instanceof Error
        ? event.reason
        : new Error(
            typeof event.reason === 'string'
              ? event.reason
              : 'Unhandled promise rejection',
          );

    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setTag('runtime_signal', 'unhandled_rejection');
      scope.setContext('runtime', {
        pathname: window.location.pathname,
      });
      Sentry.captureException(rejection);
    });
  });

  window.addEventListener('offline', () => {
    captureRuntimeSignal('Browser went offline', 'warning', {
      online: navigator.onLine,
      pathname: window.location.pathname,
    });
  });

  window.addEventListener('online', () => {
    Sentry.addBreadcrumb({
      category: 'connectivity',
      message: 'Browser connectivity restored',
      level: 'info',
      data: {
        pathname: window.location.pathname,
      },
    });
  });

  browserRuntimeMonitoringInitialized = true;
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
    integrations: [
      Sentry.browserTracingIntegration({
        enableLongAnimationFrame: true,
        enableLongTask: true,
        enableInp: true,
        traceFetch: true,
        traceXHR: true,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    release: `wasel@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    sendDefaultPii: false,
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/([a-z0-9-]+\.)?supabase\.co/i,
      /^https:\/\/wasel14\.online/i,
    ],
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

  installBrowserRuntimeMonitoring();

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
