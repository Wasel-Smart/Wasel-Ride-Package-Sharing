import * as Sentry from '@sentry/react';
import { initializePlatformTelemetry, subscribeToDomainEvent, trackDomainEvent } from '@/platform';
import { registerMonitoringSink, type LogContext } from './logging';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
let sentryInitialized = false;
let eventObserverAttached = false;

type MonitoringContext = Record<string, unknown>;

function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    const sensitiveParams = ['token', 'key', 'secret', 'password', 'api_key', 'access_token'];
    sensitiveParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });

    return urlObj.toString();
  } catch {
    return url;
  }
}

export function initializeSentry() {
  if (sentryInitialized) {
    return;
  }

  initializePlatformTelemetry({
    environment: APP_ENV,
    exporterUrl: import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: 'wasel-web',
    serviceVersion: APP_VERSION,
  });

  if (!eventObserverAttached) {
    subscribeToDomainEvent((event) => {
      trackDomainEvent(event);
    });
    eventObserverAttached = true;
  }

  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    sentryInitialized = true;
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    release: `wasel@${APP_VERSION}`,

    // Performance sampling
    tracesSampleRate: APP_ENV === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: APP_ENV === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    // Error filtering
    beforeSend(event, hint) {
      const error = hint.originalException;

      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') && error.message.includes('ad')) {
          return null;
        }

        if (error.message.includes('ResizeObserver')) {
          return null;
        }

        if (error.name === 'AbortError') {
          return null;
        }
      }

      return event;
    },

    // Breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'log' && APP_ENV === 'production') {
        return null;
      }

      if (typeof breadcrumb.data?.url === 'string') {
        breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url);
      }

      return breadcrumb;
    },

    // Ignore certain errors
    ignoreErrors: [
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',

      'NetworkError',
      'Network request failed',

      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
      'ComboSearch is not defined',

      'fb_xd_fragment',

      'bmi_SafeAddOnload',
      'EBCallBackMessageReceived',
    ],

    // Deny URLs
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,

      /graph\.facebook\.com/i,

      /google-analytics\.com/i,
      /googletagmanager\.com/i,
    ],
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('wasel-user-identified', ((event: Event) => {
      const customEvent = event as CustomEvent<{ userId?: string; email?: string }>;
      const { userId, email } = customEvent.detail ?? {};
      if (!userId) {
        return;
      }

      Sentry.setUser({
        id: userId,
        email,
      });
    }) as EventListener);
  }

  registerMonitoringSink({
    captureException(error, context) {
      Sentry.withScope((scope) => {
        applyContext(scope, context);

        if (error instanceof Error) {
          Sentry.captureException(error);
          return;
        }

        const fallbackError =
          typeof error === 'string'
            ? new Error(error)
            : new Error('Unknown application error');
        Sentry.captureException(fallbackError);
      });
    },
    captureMessage(message, level, context) {
      Sentry.withScope((scope) => {
        applyContext(scope, context);
        Sentry.captureMessage(message, level);
      });
    },
    addBreadcrumb(message, category, data) {
      Sentry.addBreadcrumb({
        message,
        category,
        level: 'info',
        data: redactMonitoringContext(data),
      });
    },
  });

  sentryInitialized = true;
}

export const initSentry = initializeSentry;

export function captureException(error: Error, context?: MonitoringContext) {
  if (APP_ENV === 'development') {
    console.error('Error captured:', error, context);
  }

  Sentry.captureException(error, {
    contexts: context ? { custom: context } : undefined,
  });
}

export function startTransaction(name: string, op: string) {
  const span = Sentry.startInactiveSpan({ name, op });
  return {
    finish: () => span?.end(),
  };
}

export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: MonitoringContext,
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

export function showReportDialog() {
  Sentry.showReportDialog();
}

export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

export function setContext(name: string, context: MonitoringContext) {
  Sentry.setContext(name, context);
}

export { Sentry };

function redactMonitoringContext(context?: LogContext): MonitoringContext | undefined {
  if (!context) {
    return undefined;
  }

  return sanitizeMonitoringValue(context) as MonitoringContext;
}

function sanitizeMonitoringValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeMonitoringValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('token') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('password') ||
          lowerKey.includes('authorization')
        ) {
          return [key, '[REDACTED]'];
        }

        if (typeof nestedValue === 'string' && lowerKey.includes('url')) {
          return [key, sanitizeUrl(nestedValue)];
        }

        return [key, sanitizeMonitoringValue(nestedValue)];
      }),
    );
  }

  if (typeof value === 'string') {
    return value.length > 800 ? `${value.slice(0, 797)}...` : value;
  }

  return value;
}

function applyContext(scope: Sentry.Scope, context?: LogContext): void {
  const sanitizedContext = redactMonitoringContext(context);
  if (!sanitizedContext) {
    return;
  }

  const tags =
    sanitizedContext.tags &&
    typeof sanitizedContext.tags === 'object' &&
    !Array.isArray(sanitizedContext.tags)
      ? sanitizedContext.tags as Record<string, unknown>
      : undefined;

  if (tags) {
    Object.entries(tags).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        scope.setTag(key, String(value));
      }
    });
  }

  const level = typeof sanitizedContext.level === 'string' ? sanitizedContext.level : undefined;
  if (level) {
    scope.setLevel(level as Sentry.SeverityLevel);
  }

  scope.setContext('app', sanitizedContext);
}
