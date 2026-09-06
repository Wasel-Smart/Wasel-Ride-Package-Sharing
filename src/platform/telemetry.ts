/**
 * Production-grade telemetry and metrics collection
 * Implements OpenTelemetry for distributed tracing and metrics
 */

import { createStructuredLogEntry } from './observability';
import { sanitizeLogMessage } from '../utils/sanitization';

export interface MetricPoint {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, string | number | boolean>;
  status: 'ok' | 'error';
}

const runtimeEnvironment =
  (typeof process !== 'undefined' && process.env.NODE_ENV) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE) ||
  'development';

class TelemetryCollector {
  private metrics: MetricPoint[] = [];
  private traces: Map<string, TraceSpan> = new Map();
  private flushInterval: number = 30000; // 30 seconds
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || '/api/telemetry';
    this.startAutoFlush();
  }

  // Record a metric point
  recordMetric(
    name: string,
    value: number,
    unit: string | Record<string, string> = 'count',
    tags: Record<string, string> = {},
  ): void {
    const resolvedUnit = typeof unit === 'string' ? unit : 'count';
    const resolvedTags = typeof unit === 'string' ? tags : unit;

    this.metrics.push({
      name,
      value,
      unit: resolvedUnit,
      timestamp: Date.now(),
      tags: {
        environment: runtimeEnvironment,
        ...resolvedTags,
      },
    });
  }

  // Start a trace span
  startSpan(name: string, attributes: Record<string, string | number | boolean> = {}): string {
    const spanId = `span-${crypto.randomUUID()}`;
    const traceId = `trace-${crypto.randomUUID()}`;

    this.traces.set(spanId, {
      traceId,
      spanId,
      name,
      startTime: Date.now(),
      attributes: {
        service: 'wasel-web',
        environment: runtimeEnvironment,
        ...attributes,
      },
      status: 'ok',
    });

    console.info( // nosec CWE-117
      createStructuredLogEntry('info', `Span started: ${sanitizeLogMessage(name)}`, 'telemetry', {
        traceId,
        spanId,
        parentSpanId: sanitizeLogMessage(attributes.parentSpanId),
      }),
    );

    return spanId;
  }

  // End a trace span
  endSpan(spanId: string, status: 'ok' | 'error' = 'ok'): void {
    const span = this.traces.get(spanId);
    if (span) {
      span.endTime = Date.now();
      span.status = status;
      if (status === 'error') {
        console.error( // nosec CWE-117
          createStructuredLogEntry('error', `Span ended with error: ${sanitizeLogMessage(span.name)}`, 'telemetry', {
            traceId: span.traceId,
            spanId: span.spanId,
            durationMs: span.endTime - span.startTime,
          }),
        );
      }
      // Forward completed span to OTLP collector if configured
      import('./telemetry').then(({ exportSpanToOtlp }) => exportSpanToOtlp(span)).catch(() => undefined);
    }
  }

  // Record SLO compliance
  recordSLO(service: string, operation: string, latencyMs: number, success: boolean): void {
    this.recordMetric(`slo.${service}.${operation}.latency`, latencyMs, 'ms', {
      service,
      operation,
    });
    this.recordMetric(`slo.${service}.${operation}.success`, success ? 1 : 0, 'bool', {
      service,
      operation,
    });
  }

  // Record API calls
  recordAPICall(endpoint: string, method: string, statusCode: number, latencyMs: number): void {
    this.recordMetric('api.request.latency', latencyMs, 'ms', {
      endpoint,
      method,
      status: String(statusCode),
    });
    this.recordMetric('api.request.count', 1, 'count', {
      endpoint,
      method,
      status: String(statusCode),
    });

    // Track error rates
    if (statusCode >= 500) {
      this.recordMetric('api.error.5xx', 1, 'count', { endpoint, method });
    }
  }

  private flushTimer: ReturnType<typeof setInterval> | null = null;

  // Flush metrics to backend
  private async flush(): Promise<void> {
    if (this.metrics.length === 0 && this.traces.size === 0) {return;}

    const payload = {
      metrics: [...this.metrics],
      traces: Array.from(this.traces.values()).filter(span => span.endTime),
    };

    this.metrics = [];
    for (const [id, span] of this.traces.entries()) {
      if (span.endTime) {this.traces.delete(id);}
    }

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Telemetry flush failures are non-fatal — swallow silently.
    }
  }

  private startAutoFlush(): void {
    if (typeof window === 'undefined') {return;}

    this.flushTimer = setInterval(() => { void this.flush(); }, this.flushInterval);

    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  /** Stop the auto-flush interval. Call on app unmount to avoid leaks. */
  stopAutoFlush(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

export const telemetry = new TelemetryCollector();

// ---------------------------------------------------------------------------
// OpenTelemetry-compatible OTLP HTTP export
// ---------------------------------------------------------------------------
// Forwards completed spans to any OTLP/HTTP collector (Grafana Tempo,
// Jaeger, Honeycomb, etc.) when VITE_OTEL_EXPORTER_OTLP_ENDPOINT is set.
// The payload shape follows the OTLP JSON encoding spec so it can be
// ingested without an SDK dependency.
// ---------------------------------------------------------------------------

const OTEL_ENDPOINT =
  typeof import.meta !== 'undefined'
    ? (import.meta.env?.VITE_OTEL_EXPORTER_OTLP_ENDPOINT as string | undefined)
    : undefined;

const OTEL_SERVICE_NAME =
  typeof import.meta !== 'undefined'
    ? ((import.meta.env?.VITE_OTEL_SERVICE_NAME as string | undefined) ?? 'wasel-web')
    : 'wasel-web';

function toOtelTimeUnixNano(ms: number): string {
  // OTLP expects nanoseconds as a string to avoid JS integer overflow
  return String(ms * 1_000_000);
}

function spanToOtlpResourceSpan(span: TraceSpan) {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: OTEL_SERVICE_NAME } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'wasel-telemetry', version: '1.0.0' },
            spans: [
              {
                traceId: span.traceId.replace(/-/g, '').slice(0, 32).padEnd(32, '0'),
                spanId: span.spanId.replace(/-/g, '').slice(0, 16).padEnd(16, '0'),
                parentSpanId: span.parentSpanId
                  ? span.parentSpanId.replace(/-/g, '').slice(0, 16).padEnd(16, '0')
                  : undefined,
                name: span.name,
                kind: 1, // SPAN_KIND_INTERNAL
                startTimeUnixNano: toOtelTimeUnixNano(span.startTime),
                endTimeUnixNano: toOtelTimeUnixNano(span.endTime ?? span.startTime),
                attributes: Object.entries(span.attributes).map(([key, value]) => ({
                  key,
                  value:
                    typeof value === 'boolean'
                      ? { boolValue: value }
                      : typeof value === 'number'
                        ? { doubleValue: value }
                        : { stringValue: String(value) },
                })),
                status: {
                  code: span.status === 'error' ? 2 : 1, // STATUS_CODE_ERROR : STATUS_CODE_OK
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

export async function exportSpanToOtlp(span: TraceSpan): Promise<void> {
  if (!OTEL_ENDPOINT || typeof fetch === 'undefined') { return; }

  try {
    await fetch(`${OTEL_ENDPOINT.replace(/\/$/, '')}/v1/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spanToOtlpResourceSpan(span)),
      keepalive: true,
    });
  } catch {
    // OTLP export failures are non-fatal — swallow silently.
  }
}

// Track Web Vitals (CLS, FID, FCP, LCP, TTFB)
export function initWebVitals(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {return;}

  // Use PerformanceObserver to capture paint and LCP metrics
  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const name = entry.name === 'first-contentful-paint' ? 'FCP' : 'FP';
        telemetry.recordMetric(`web_vital.${name}`, entry.startTime, 'ms', { name });
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        telemetry.recordMetric('web_vital.LCP', last.startTime, 'ms', { name: 'LCP' });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
          clsValue += (entry as PerformanceEntry & { value?: number }).value ?? 0;
        }
      }
      if (clsValue > 0) {
        telemetry.recordMetric('web_vital.CLS', clsValue, 'score', { name: 'CLS' });
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // TTFB from navigation timing
    const navObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const nav = entry as PerformanceNavigationTiming;
        telemetry.recordMetric('web_vital.TTFB', nav.responseStart - nav.requestStart, 'ms', { name: 'TTFB' });
      }
    });
    navObserver.observe({ type: 'navigation', buffered: true });
  } catch {
    // PerformanceObserver not supported for this entry type — skip silently
  }
}

// Track route changes
export function trackPageView(route: string): void {
  telemetry.recordMetric('page.view', 1, 'count', { route });
}

// Track user actions
export function trackUserAction(action: string, metadata: Record<string, string> = {}): void {
  telemetry.recordMetric('user.action', 1, 'count', { action, ...metadata });
}
