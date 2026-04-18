import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

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
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
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
