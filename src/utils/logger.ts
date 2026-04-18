/**
 * Production-grade structured logging system
 * Supports correlation IDs, log levels, and sanitization
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogContext = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const CURRENT_LOG_LEVEL: LogLevel = 
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 
  (import.meta.env.PROD ? 'warn' : 'debug');

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie'];

function sanitizeContext(context: LogContext): LogContext {
  const sanitized: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeContext(value as LogContext);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LOG_LEVEL];
}

function formatLogEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.correlationId ? `[${entry.correlationId}]` : '',
    entry.message,
  ].filter(Boolean);

  return parts.join(' ');
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? sanitizeContext(context) : undefined,
    correlationId: getCorrelationId(),
    userId: getUserId(),
    sessionId: getSessionId(),
  };
}

function getCorrelationId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).__wasel_correlation_id__;
}

function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = window.localStorage.getItem('wasel_local_user_v2');
    if (stored) {
      const user = JSON.parse(stored);
      return user.id;
    }
  } catch {}
  return undefined;
}

function getSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).__wasel_session_id__;
}

export function setCorrelationId(id: string): void {
  if (typeof window !== 'undefined') {
    (window as any).__wasel_correlation_id__ = id;
  }
}

export function setSessionId(id: string): void {
  if (typeof window !== 'undefined') {
    (window as any).__wasel_session_id__ = id;
  }
}

function writeLog(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const formatted = formatLogEntry(entry);
  const consoleMethod = entry.level === 'debug' ? 'log' : entry.level;

  if (entry.context) {
    console[consoleMethod](formatted, entry.context);
  } else {
    console[consoleMethod](formatted);
  }

  // Send to external monitoring if configured
  if (entry.level === 'error' || entry.level === 'fatal') {
    sendToMonitoring(entry);
  }
}

function sendToMonitoring(entry: LogEntry): void {
  // Integration point for Sentry or other monitoring
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureMessage(entry.message, {
      level: entry.level === 'fatal' ? 'fatal' : 'error',
      extra: entry.context,
      tags: {
        correlationId: entry.correlationId,
        userId: entry.userId,
      },
    });
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    writeLog(createLogEntry('debug', message, context));
  },

  info(message: string, context?: LogContext): void {
    writeLog(createLogEntry('info', message, context));
  },

  warn(message: string, context?: LogContext): void {
    writeLog(createLogEntry('warn', message, context));
  },

  error(message: string, context?: LogContext): void {
    writeLog(createLogEntry('error', message, context));
  },

  fatal(message: string, context?: LogContext): void {
    writeLog(createLogEntry('fatal', message, context));
  },

  // Specialized loggers for common patterns
  authEvent(event: string, context?: LogContext): void {
    writeLog(createLogEntry('info', `[AUTH] ${event}`, context));
  },

  rideEvent(event: string, context?: LogContext): void {
    writeLog(createLogEntry('info', `[RIDE] ${event}`, context));
  },

  paymentEvent(event: string, context?: LogContext): void {
    writeLog(createLogEntry('info', `[PAYMENT] ${event}`, context));
  },

  apiCall(method: string, url: string, status?: number, duration?: number): void {
    writeLog(createLogEntry('info', `[API] ${method} ${url}`, {
      status,
      duration,
    }));
  },
};
