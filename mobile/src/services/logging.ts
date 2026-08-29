/**
 * Lightweight logger for mobile app.
 * In production, routes to Sentry or console depending on environment.
 */

import { sanitizeLogValue } from '../utils/sanitize';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = __DEV__ || process.env.NODE_ENV === 'development';

function sanitizeMessage(msg: string): string {
  return typeof msg === 'string' ? msg.replace(/[\r\n]+/g, ' ') : String(msg);
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  const tag = `[Wasel:${level.toUpperCase()}]`;
  return `${timestamp} ${tag} ${sanitizeMessage(message)}`;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.debug(formatMessage('debug', message), ...args.map(a => sanitizeLogValue(a)));
    }
  },
  info(message: string, ...args: unknown[]): void {
    console.info(formatMessage('info', message), ...args.map(a => sanitizeLogValue(a)));
  },
  warn(message: string, ...args: unknown[]): void {
    console.warn(formatMessage('warn', message), ...args.map(a => sanitizeLogValue(a)));
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const safeContext = context ? Object.fromEntries(
      Object.entries(context).map(([k, v]) => [k, sanitizeLogValue(v)])
    ) : undefined;
    console.error(formatMessage('error', message), sanitizeLogValue(error), safeContext);
  },
  warning(message: string, ...args: unknown[]): void {
    console.warn(formatMessage('warn', message), ...args.map(a => sanitizeLogValue(a)));
  },
};
