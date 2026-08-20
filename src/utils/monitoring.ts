import * as Sentry from '@sentry/react';
import type { DomainEventEnvelope } from '../domain/events';
import { createCorrelationId, createStructuredLogEntry } from '../platform/observability';
import { sanitizeLogMessage } from './sanitization';

let sentryInitialized = false;

function writeConsole(
  level: 'info' | 'warning' | 'error',
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry = createStructuredLogEntry(level, sanitizeLogMessage(message), 'wasel-web', context);
  const serialized = JSON.stringify(entry);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warning') {
    console.warn(serialized);
    return;
  }

  if (import.meta.env.DEV) {
    console.info(serialized);
  }
}

export function initSentry(): void {
  if (sentryInitialized) {
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  if (!dsn) {
    if (import.meta.env.DEV) {
      writeConsole('warning', 'Sentry DSN is not configured; remote error capture is disabled.');
    }
    return;
  }

  const sentryIntegrations: unknown[] = [];

  const browserTracingIntegration = (Sentry as unknown as Record<string, () => unknown>).browserTracingIntegration;
  if (typeof browserTracingIntegration === 'function') {
    sentryIntegrations.push(browserTracingIntegration());
  }

  const replayIntegration = (Sentry as unknown as Record<string, (o: unknown) => unknown>).replayIntegration;
  if (typeof replayIntegration === 'function') {
    sentryIntegrations.push(replayIntegration({ maskAllText: true, blockAllMedia: true }));
  }

  Sentry.init({
    dsn,
    environment,
    integrations: sentryIntegrations,
    tracesSampleRate: environment === 'production' ? 0.1 : 1,
    replaysSessionSampleRate: environment === 'production' ? 0.05 : 0,
    replaysOnErrorSampleRate: 1.0,
    release: `wasel@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    // Ignore common, non-actionable browser errors to reduce noise.
    ignoreErrors: [
      // Often caused by browser extensions or third-party scripts.
      'ResizeObserver loop limit exceeded',
      // A generic error that Sentry captures when a Promise is rejected with a non-Error object.
      'Non-Error promise rejection captured',
      // General network failures, often due to user's connectivity, not a bug.
      'Network request failed',
      'Failed to fetch',
    ],
    beforeSend(event) {
      try {
        // Attempt to enrich the event with the user's ID for better traceability.
        const raw = localStorage.getItem('wasel_local_user_v2');
        if (raw) {
          const userData = JSON.parse(raw) as unknown;
          // Only attach the opaque user ID — never PII
          if (
            userData !== null &&
            typeof userData === 'object' &&
            'id' in (userData as object) &&
            typeof (userData as Record<string, unknown>).id === 'string'
          ) {
            const id = (userData as Record<string, string>).id;
            // Validate strict UUID v4 format before attaching to prevent arbitrary string injection
            if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
              event.user = { id };
            }
          }
        }
      } catch {
        // Ignore malformed local state.
      }

      const allowedLanguages = ['ar', 'en'];
      const allowedThemes = ['dark', 'light'];
      const lang = localStorage.getItem('wasel_language') || 'ar';
      const theme = localStorage.getItem('wasel_theme') || 'dark';

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

export const logger = {
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const safeMessage = sanitizeLogMessage(message);
    writeConsole('error', safeMessage, context);
    if (typeof (Sentry as unknown as Record<string, unknown>).captureException === 'function') {
      (Sentry as unknown as { captureException: (e: unknown, o: unknown) => void }).captureException(error || new Error(safeMessage), {
        level: 'error',
        tags: { type: 'application_error' },
        extra: context,
      });
    }
  },

  warning(message: string, context?: Record<string, unknown>): void {
    writeConsole('warning', sanitizeLogMessage(message), context);
    if (import.meta.env.PROD && typeof (Sentry as unknown as Record<string, unknown>).captureMessage === 'function') {
      (Sentry as unknown as { captureMessage: (m: string, o: unknown) => void }).captureMessage(sanitizeLogMessage(message), {
        level: 'warning',
        tags: { type: 'application_warning' },
        extra: context,
      });
    }
  },

  info(message: string, context?: Record<string, unknown>): void {
    writeConsole('info', sanitizeLogMessage(message), context);
    if (import.meta.env.PROD && context?.important && typeof (Sentry as unknown as Record<string, unknown>).captureMessage === 'function') {
      (Sentry as unknown as { captureMessage: (m: string, o: unknown) => void }).captureMessage(sanitizeLogMessage(message), {
        level: 'info',
        tags: { type: 'application_info' },
        extra: context,
      });
    }
  },

  metric(name: string, value: number, tags?: Record<string, string>): void {
    const safeName = sanitizeLogMessage(name);
    writeConsole('info', `metric:${safeName}`, { value, tags });
    if (typeof (Sentry as unknown as Record<string, unknown>).addBreadcrumb === 'function') {
      (Sentry as unknown as { addBreadcrumb: (b: unknown) => void }).addBreadcrumb({
        category: 'metric',
        message: safeName,
        level: 'info',
        data: { value, ...tags },
      });
    }
  },

  startTransaction(name: string, op: string) {
    const requestId = createCorrelationId('txn');
    logger.addBreadcrumb(`Transaction:${name}`, 'performance', { op, requestId });
    return { finish: () => undefined };
  },

  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    if (typeof (Sentry as unknown as Record<string, unknown>).addBreadcrumb === 'function') {
      (Sentry as unknown as { addBreadcrumb: (b: unknown) => void }).addBreadcrumb({ message, category, level: 'info', data });
    }
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

  logger.metric('api.duration_ms', duration, { // Already sanitized
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
