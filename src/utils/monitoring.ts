import type { DomainEventEnvelope } from '../domain/events';
import { createCorrelationId, createStructuredLogEntry } from '../platform/observability';
import { sanitizeLogMessage } from './sanitization';

let sentryInitialized = false;
let sentryInitializationStarted = false;
let sentryClient: typeof import('@sentry/react') | null = null;

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

export async function initSentry(): Promise<void> {
  if (sentryInitialized || sentryInitializationStarted) {
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

  sentryInitializationStarted = true;

  try {
    // Sentry and Session Replay are sizeable. Only download them after the app
    // is interactive and only in deployments that have a DSN configured.
    const Sentry = await import('@sentry/react');
    sentryClient = Sentry;
    const integrations = [];
    if (typeof Sentry.browserTracingIntegration === 'function') {
      integrations.push(Sentry.browserTracingIntegration());
    }
    if (typeof Sentry.replayIntegration === 'function') {
      integrations.push(Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }));
    }

    Sentry.init({
      dsn,
      environment,
      integrations,
      tracesSampleRate: environment === 'production' ? 0.1 : 1,
      replaysSessionSampleRate: environment === 'production' ? 0.05 : 0,
      replaysOnErrorSampleRate: 1.0,
      release: `wasel@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
      // Ignore common, non-actionable browser errors to reduce noise.
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
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
  } catch (error) {
    sentryInitializationStarted = false;
    if (import.meta.env.DEV) {
      writeConsole('warning', 'Sentry initialization failed.', { error: sanitizeLogMessage(String(error)) });
    }
  }
}

export const logger = {
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const safeMessage = sanitizeLogMessage(message);
    writeConsole('error', safeMessage, context);
    if (typeof (sentryClient as unknown as Record<string, unknown> | null)?.captureException === 'function') {
      (sentryClient as unknown as { captureException: (e: unknown, o: unknown) => void }).captureException(error || new Error(safeMessage), {
        level: 'error',
        tags: { type: 'application_error' },
        extra: context,
      });
    }
  },

  warning(message: string, context?: Record<string, unknown>): void {
    writeConsole('warning', sanitizeLogMessage(message), context);
    if (import.meta.env.PROD && typeof (sentryClient as unknown as Record<string, unknown> | null)?.captureMessage === 'function') {
      (sentryClient as unknown as { captureMessage: (m: string, o: unknown) => void }).captureMessage(sanitizeLogMessage(message), {
        level: 'warning',
        tags: { type: 'application_warning' },
        extra: context,
      });
    }
  },

  info(message: string, context?: Record<string, unknown>): void {
    writeConsole('info', sanitizeLogMessage(message), context);
    if (import.meta.env.PROD && context?.important && typeof (sentryClient as unknown as Record<string, unknown> | null)?.captureMessage === 'function') {
      (sentryClient as unknown as { captureMessage: (m: string, o: unknown) => void }).captureMessage(sanitizeLogMessage(message), {
        level: 'info',
        tags: { type: 'application_info' },
        extra: context,
      });
    }
  },

  metric(name: string, value: number, tags?: Record<string, string>): void {
    const safeName = sanitizeLogMessage(name);
    writeConsole('info', `metric:${safeName}`, { value, tags });
    if (typeof (sentryClient as unknown as Record<string, unknown> | null)?.addBreadcrumb === 'function') {
      (sentryClient as unknown as { addBreadcrumb: (b: unknown) => void }).addBreadcrumb({
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
    if (typeof (sentryClient as unknown as Record<string, unknown> | null)?.addBreadcrumb === 'function') {
      (sentryClient as unknown as { addBreadcrumb: (b: unknown) => void }).addBreadcrumb({ message, category, level: 'info', data });
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

export function usePerformanceMonitoring(componentName: string): () => void {
  const transaction = logger.startTransaction(componentName, 'component.render');
  return () => {
    transaction.finish();
  };
}
