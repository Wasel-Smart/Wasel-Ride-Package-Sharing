import { sanitizeLogMessage } from '../utils/sanitization';

export type StructuredLogLevel = 'info' | 'warning' | 'error';

export interface StructuredLogEntry {
  level: StructuredLogLevel;
  message: string;
  timestamp: string;
  requestId: string;
  service: string;
  context?: Record<string, unknown>;
}

export function createCorrelationId(prefix: string = 'req'): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().split('-')[0]}`;
}

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) {return undefined;}
  return Object.fromEntries(
    Object.entries(context).map(([k, v]) => [k, sanitizeLogMessage(v)]),
  );
}

export interface StructuredLogEntryOptions {
  level: StructuredLogLevel;
  message: string;
  service: string;
  context?: Record<string, unknown>;
  requestId?: string;
}

export function createStructuredLogEntry(options: StructuredLogEntryOptions): StructuredLogEntry;
export function createStructuredLogEntry(
  level: StructuredLogLevel,
  message: string,
  service: string,
  context?: Record<string, unknown>,
  requestId?: string,
): StructuredLogEntry;
export function createStructuredLogEntry(
  levelOrOptions: StructuredLogLevel | StructuredLogEntryOptions,
  message?: string,
  service?: string,
  context?: Record<string, unknown>,
  requestId?: string,
): StructuredLogEntry {
  if (typeof levelOrOptions === 'object') {
    const opts = levelOrOptions;
    return {
      level: opts.level,
      message: sanitizeLogMessage(opts.message),
      service: sanitizeLogMessage(opts.service),
      requestId: opts.requestId ?? createCorrelationId(),
      timestamp: new Date().toISOString(),
      context: sanitizeContext(opts.context),
    };
  }
  return {
    level: levelOrOptions,
    message: sanitizeLogMessage(message ?? ''),
    service: sanitizeLogMessage(service ?? 'wasel'),
    requestId: requestId ?? createCorrelationId(),
    timestamp: new Date().toISOString(),
    context: sanitizeContext(context),
  };
}
