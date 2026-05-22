import * as Sentry from '@sentry/react';
import type { DomainEventEnvelope } from '../domain/events';

import { createCorrelationId, createStructuredLogEntry } from '../platform/observability';
import { sanitizeLogMessage } from './sanitization';
import { safeStorageGetItem } from './browserStorage';

let sentryInitialized = false;

type SentryRuntime = typeof Sentry & {
  captureException?: (error: unknown, context?: Record<string, unknown>) => void;
  captureMessage?: (message: string, context?: Record<string, unknown>) => void;
  addBreadcrumb?: (breadcrumb: Record<string, unknown>) => void;
};

const sentryRuntime = Sentry as SentryRuntime;

function writeConsole(
  level: 'info' | 'warning' | 'error',
  message: string,
  context?: Record<string, unknown>,
): void {
  if (!import.meta.env.DEV) {
    return;
  }

  const entry = createStructuredLogEntry(level, message, 'wasel-web', context);
  const serialized = JSON.stringify(entry);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warning') {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function initSentry(): void {
  if (sentryInitialized) {
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  const environment = import.meta.env.MODE;

  if (!dsn) {
    writeConsole('warning', 'Sentry DSN is not configured; remote error capture is disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [],
    tracesSampleRate: environment === 'production' ? 0.1 : 1,
    release: `wasel@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
    ],
    beforeSend(
      event: Sentry.ErrorEvent,
    ) {
      try {
        const raw = safeStorageGetItem('sessionStorage', 'wasel_user_session');
        if (raw) {
          const userData = JSON.parse(raw) as { id?: string };
          // Only attach the opaque user ID - never PII
          if (userData.id && typeof userData.id === 'string') {
            event.user = { id: userData.id };
          }
        }
      } catch {
        // Ignore malformed local state.
      }

      const allowedLanguages = ['ar', 'en'];
      const allowedThemes = ['dark', 'light'];
      const lang =
        safeStorageGetItem('localStorage', 'wasel-language') ||
        safeStorageGetItem('localStorage', 'wasel_language') ||
        'ar';
      const theme = safeStorageGetItem('localStorage', 'wasel_theme') || 'dark';

      event.tags = {
        ...event.tags,
        language: allowedLanguages.includes(lang) ? lang : 'ar',
        theme: allowedThemes.includes(theme) ? theme : 'dark',
      };

      return event;
    },
  });

  sentryInitialized = true;
  writeConsole('info', 'Sentry initialized.');
}

function isSentryActive(): boolean {
  return sentryInitialized;
}

export const logger = {
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    writeConsole('error', sanitizeLogMessage(message), context);
    if (!isSentryActive()) {
      return;
    }

    sentryRuntime.captureException?.(error || new Error(sanitizeLogMessage(message)), {
      level: 'error',
      tags: { type: 'application_error' },
      extra: context,
    });
  },

  warning(message: string, context?: Record<string, unknown>): void {
    writeConsole('warning', sanitizeLogMessage(message), context);
    if (!isSentryActive()) {
      return;
    }

    sentryRuntime.captureMessage?.(sanitizeLogMessage(message), {
      level: 'warning',
      tags: { type: 'application_warning' },
      extra: context,
    });
  },

  info(message: string, context?: Record<string, unknown>): void {
    writeConsole('info', sanitizeLogMessage(message), context);
    if (context?.important && isSentryActive()) {
    sentryRuntime.captureMessage?.(sanitizeLogMessage(message), {
        level: 'info',
        tags: { type: 'application_info' },
        extra: context,
      });
    }
  },

  metric(name: string, value: number, tags?: Record<string, string>): void {
    writeConsole('info', `metric:${name}`, { value, tags });
    if (!isSentryActive()) {
      return;
    }

    sentryRuntime.addBreadcrumb?.({
      category: 'metric',
      message: name,
      level: 'info',
      data: {
        value,
        ...tags,
      },
    });
  },

  startTransaction(name: string, _op: string) {
    // Stub — Sentry SDK v10 no longer uses manual transactions.
    // Retained for call-site compatibility; upgrade callers to use Sentry spans if needed.
    const label = sanitizeLogMessage(name);
    logger.addBreadcrumb(`Transaction:${label}`, 'performance');
    return { finish: () => undefined };
  },

  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    if (!isSentryActive()) {
      return;
    }

    sentryRuntime.addBreadcrumb?.({ message, category, level: 'info', data });
  },
};

export function trackAPICall(
  endpoint: string,
  method: string,
  duration: number,
  status: number,
): void {
  logger.addBreadcrumb(`API ${sanitizeLogMessage(method)} ${sanitizeLogMessage(endpoint)}`, 'api', {
    endpoint: sanitizeLogMessage(endpoint),
    method: sanitizeLogMessage(method),
    duration,
    status,
  });

  logger.metric('api.duration_ms', duration, {
    endpoint: sanitizeLogMessage(endpoint),
    method: sanitizeLogMessage(method),
    status: String(status),
  });

  if (duration > 3000) {
    logger.warning(`Slow API call: ${sanitizeLogMessage(method)} ${sanitizeLogMessage(endpoint)}`, {
      duration,
      status,
      endpoint: sanitizeLogMessage(endpoint),
    });
  }
}

export function trackUserAction(action: string, data?: Record<string, unknown>): void {
  logger.addBreadcrumb(action, 'user_action', data);
}

export function trackNavigation(from: string, to: string): void {
  logger.addBreadcrumb(`Navigation: ${from} -> ${to}`, 'navigation', {
    from,
    to,
  });
}

export function trackDomainEvent(event: DomainEventEnvelope): void {
  logger.addBreadcrumb(`DomainEvent:${event.type}`, 'domain_event', {
    eventId: event.id,
    traceId: event.traceId,
    producer: event.producer,
  });
}

export const ErrorBoundary = Sentry.ErrorBoundary;

export function usePerformanceMonitoring(componentName: string): () => void {
  const transaction = logger.startTransaction(componentName, 'component.render');
  return () => {
    transaction.finish();
  };
}

export default Sentry;
