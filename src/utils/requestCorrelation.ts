/**
 * Request Correlation
 *
 * Generates cryptographically secure IDs for distributed tracing.
 * All IDs use crypto.randomUUID() — never Math.random().
 *
 * Usage:
 *   const { traceId, correlationId } = createRequestContext();
 *   fetch(url, { headers: { 'X-Trace-Id': traceId, 'X-Correlation-Id': correlationId } });
 */

export interface RequestContext {
  /** W3C-compatible trace ID for distributed tracing (Sentry, OpenTelemetry) */
  traceId: string;
  /** Correlation ID linking related requests in a single user flow */
  correlationId: string;
  /** Audit ID for financial/security event logging */
  auditId: string;
  /** Wall-clock timestamp when the context was created */
  createdAt: string;
}

/** Generate a compact hex trace ID compatible with W3C traceparent format */
function generateTraceId(): string {
  // W3C traceparent requires 16-byte (32 hex char) trace-id
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return uuid; // 32 hex chars
}

/** Generate a standard UUID v4 correlation ID */
function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/** Generate an audit ID with a human-readable prefix for log filtering */
function generateAuditId(prefix = 'aud'): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createRequestContext(auditPrefix?: string): RequestContext {
  return {
    traceId: generateTraceId(),
    correlationId: generateCorrelationId(),
    auditId: generateAuditId(auditPrefix),
    createdAt: new Date().toISOString(),
  };
}

export function createPaymentContext(): RequestContext {
  return createRequestContext('pay');
}

export function createSecurityContext(): RequestContext {
  return createRequestContext('sec');
}

/**
 * Build standard tracing headers for outbound fetch calls.
 * Attach these to every API request so backend logs can correlate
 * frontend actions with server-side processing.
 */
export function buildTracingHeaders(ctx: RequestContext): Record<string, string> {
  return {
    'X-Trace-Id': ctx.traceId,
    'X-Correlation-Id': ctx.correlationId,
    'X-Audit-Id': ctx.auditId,
    'X-Request-Time': ctx.createdAt,
  };
}

/**
 * Idempotency key for payment operations.
 * Combines a user-scoped prefix with a UUID so the backend can deduplicate
 * retried requests within a 24-hour window.
 */
export function createIdempotencyKey(userId: string, operation: string): string {
  return `${userId}:${operation}:${crypto.randomUUID()}`;
}
