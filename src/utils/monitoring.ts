/**
 * Sentry Error Monitoring Integration
 * Version: 1.0.0
 * 
 * Comprehensive error tracking and monitoring for production
 */

import * as Sentry from '@sentry/react';

// Initialize Sentry
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;
  
  if (!dsn) {
    console.warn('💡 Sentry DSN not configured - error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    integrations: [],
    
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    
    // Release tracking
    release: `wasel@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    
    // Ignore common errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
    ],
    
    // Enhanced error context
    beforeSend(event, hint) {
      // Add user context — only send non-PII identifier
    const raw = localStorage.getItem('wasel_local_user_v2');
    if (raw) {
      try {
        const userData = JSON.parse(raw);
        // Only send user ID to Sentry — never email or name
        event.user = { id: userData.id };
      } catch {
        // ignore parse errors
      }
    }
      
      // Add custom tags
      event.tags = {
        ...event.tags,
        language: localStorage.getItem('wasel_language') || 'ar',
        theme: localStorage.getItem('wasel_theme') || 'dark',
      };
      
      return event;
    },
  });
  
  if (import.meta.env.DEV) console.log('[Sentry] Initialized');
}

// Custom error logging functions
export const logger = {
  error: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
    if (import.meta.env.DEV) console.error('[Wasel]', message, error, context);

    Sentry.captureException(error || new Error(message), {
      level: 'error',
      tags: { type: 'application_error' },
      extra: context,
    });
  },

  warning: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.DEV) console.warn('[Wasel]', message, context);

    Sentry.captureMessage(message, {
      level: 'warning',
      tags: { type: 'application_warning' },
      extra: context,
    });
  },

  info: (message: string, context?: Record<string, any>) => {
    if (import.meta.env.DEV) console.info('[Wasel]', message);

    if (context?.important) {
      Sentry.captureMessage(message, {
        level: 'info',
        tags: { type: 'application_info' },
        extra: context,
      });
    }
  },

  startTransaction: (name: string, op: string) => {
    logger.addBreadcrumb(`Transaction: ${name}`, 'performance', { op });
    return { finish: () => undefined };
  },

  addBreadcrumb: (message: string, category: string, data?: Record<string, any>) => {
    Sentry.addBreadcrumb({ message, category, level: 'info', data });
  },
};

// Track API calls
export function trackAPICall(endpoint: string, method: string, duration: number, status: number) {
  logger.addBreadcrumb(`API ${method} ${endpoint}`, 'api', {
    endpoint,
    method,
    duration,
    status,
  });
  
  // Report slow API calls
  if (duration > 3000) {
    logger.warning(`Slow API call: ${method} ${endpoint}`, {
      duration,
      status,
      endpoint,
    });
  }
}

// Track user actions
export function trackUserAction(action: string, data?: Record<string, any>) {
  logger.addBreadcrumb(action, 'user_action', data);
}

// Track navigation
export function trackNavigation(from: string, to: string) {
  logger.addBreadcrumb(`Navigation: ${from} → ${to}`, 'navigation', {
    from,
    to,
  });
}

// Error boundary wrapper
export const ErrorBoundary = Sentry.ErrorBoundary;

// Performance monitoring hook
export function usePerformanceMonitoring(componentName: string) {
  const transaction = logger.startTransaction(componentName, 'component.render');
  
  return () => {
    transaction.finish();
  };
}

export default Sentry;
