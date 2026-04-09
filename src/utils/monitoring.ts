/**
 * Sentry Error Monitoring Integration
 * Version: 1.0.0
 *
 * Comprehensive error tracking and monitoring for production
 */

import * as Sentry from '@sentry/react';
import { redactSensitiveValue } from './redaction';

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

type LogContext = Record<string, unknown>;

function redactContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  return redactSensitiveValue(context) as LogContext;
}

export function initSentry() {
  if (sentryInitialized) {
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

  sentryInitialized = true;
}

export const logger = {
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    const sanitizedContext = redactContext(context);
    if (import.meta.env.DEV) {
      console.error('[Wasel]', message, error, sanitizedContext);
    }

    Sentry.captureException(error || new Error(message), {
      level: 'error',
      tags: { type: 'application_error' },
      extra: sanitizedContext,
    });
  },

  warning: (message: string, context?: LogContext) => {
    const sanitizedContext = redactContext(context);
    if (import.meta.env.DEV) {
      console.warn('[Wasel]', message, sanitizedContext);
    }

    Sentry.captureMessage(message, {
      level: 'warning',
      tags: { type: 'application_warning' },
      extra: sanitizedContext,
    });
  },

  info: (message: string, context?: LogContext) => {
    const sanitizedContext = redactContext(context);
    if (context?.important) {
      Sentry.captureMessage(message, {
        level: 'info',
        tags: { type: 'application_info' },
        extra: sanitizedContext,
      });
    }
  },

  startTransaction: (name: string, op: string) => {
    logger.addBreadcrumb(`Transaction: ${name}`, 'performance', { op });
    return { finish: () => undefined };
  },

  addBreadcrumb: (message: string, category: string, data?: LogContext) => {
    Sentry.addBreadcrumb({ message, category, level: 'info', data });
  },
};

export function trackAPICall(endpoint: string, method: string, duration: number, status: number) {
  logger.addBreadcrumb(`API ${method} ${endpoint}`, 'api', {
    endpoint,
    method,
    duration,
    status,
  });

  if (duration > 3000) {
    logger.warning(`Slow API call: ${method} ${endpoint}`, {
      duration,
      status,
      endpoint,
    });
  }
}

export function trackUserAction(action: string, data?: LogContext) {
  logger.addBreadcrumb(action, 'user_action', data);
}

export function trackNavigation(from: string, to: string) {
  logger.addBreadcrumb(`Navigation: ${from} -> ${to}`, 'navigation', {
    from,
    to,
  });
}

export const ErrorBoundary = Sentry.ErrorBoundary;

export function usePerformanceMonitoring(componentName: string) {
  const transaction = logger.startTransaction(componentName, 'component.render');

  return () => {
    transaction.finish();
  };
}

export default Sentry;
