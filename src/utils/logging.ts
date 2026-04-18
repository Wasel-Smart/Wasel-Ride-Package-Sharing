import { redactSensitiveValue } from './redaction';

export type LogContext = Record<string, unknown>;

export interface MonitoringSink {
  captureException: (error: Error | unknown, context?: LogContext) => void;
  captureMessage: (
    message: string,
    level: 'info' | 'warning' | 'error',
    context?: LogContext,
  ) => void;
  addBreadcrumb: (message: string, category: string, data?: LogContext) => void;
}

let monitoringSink: MonitoringSink | null = null;

function isLogContextCandidate(value: unknown): value is LogContext {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Error);
}

function redactContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  return redactSensitiveValue(context) as LogContext;
}

export function registerMonitoringSink(sink: MonitoringSink | null): void {
  monitoringSink = sink;
}

export const logger = {
  error: (
    message: string,
    errorOrContext?: Error | unknown | LogContext,
    context?: LogContext,
  ) => {
    const resolvedContext =
      context ?? (isLogContextCandidate(errorOrContext) ? errorOrContext : undefined);
    const resolvedError =
      context === undefined && isLogContextCandidate(errorOrContext) ? undefined : errorOrContext;
    const sanitizedContext = redactContext(resolvedContext);
    if (import.meta.env.DEV) {
      console.error('[Wasel]', message, resolvedError, sanitizedContext);
    }

    monitoringSink?.captureException(resolvedError || new Error(message), {
      level: 'error',
      tags: { type: 'application_error' },
      ...sanitizedContext,
    });
  },

  warning: (message: string, context?: LogContext) => {
    const sanitizedContext = redactContext(context);
    if (import.meta.env.DEV) {
      console.warn('[Wasel]', message, sanitizedContext);
    }

    monitoringSink?.captureMessage(message, 'warning', {
      level: 'warning',
      tags: { type: 'application_warning' },
      ...sanitizedContext,
    });
  },

  info: (message: string, context?: LogContext) => {
    const sanitizedContext = redactContext(context);
    if (context?.important) {
      monitoringSink?.captureMessage(message, 'info', {
        level: 'info',
        tags: { type: 'application_info' },
        ...sanitizedContext,
      });
    }
  },

  startTransaction: (name: string, op: string) => {
    logger.addBreadcrumb(`Transaction: ${name}`, 'performance', { op });
    return { finish: () => undefined };
  },

  addBreadcrumb: (message: string, category: string, data?: LogContext) => {
    monitoringSink?.addBreadcrumb(message, category, redactContext(data));
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

export function usePerformanceMonitoring(componentName: string) {
  const transaction = logger.startTransaction(componentName, 'component.render');

  return () => {
    transaction.finish();
  };
}
