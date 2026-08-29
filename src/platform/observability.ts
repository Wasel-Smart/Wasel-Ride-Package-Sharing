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
  if (!context) return undefined;
  return Object.fromEntries(
    Object.entries(context).map(([k, v]) => [k, sanitizeLogMessage(v)]),
  );
}

export function createStructuredLogEntry(
  level: StructuredLogLevel,
  message: string,
  service: string,
  context?: Record<string, unknown>,
  requestId: string = createCorrelationId(),
): StructuredLogEntry {
  return {
    level,
    message: sanitizeLogMessage(message),
    service: sanitizeLogMessage(service),
    requestId,
    timestamp: new Date().toISOString(),
    context: sanitizeContext(context),
  };
}
