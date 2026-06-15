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
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
    message,
    service,
    requestId,
    timestamp: new Date().toISOString(),
    context,
  };
}
