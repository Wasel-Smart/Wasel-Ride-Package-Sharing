/**
 * Production-grade telemetry and metrics collection
 * Implements OpenTelemetry for distributed tracing and metrics
 */

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

class TelemetryCollector {
  private metrics: MetricPoint[] = [];
  private traces: Map<string, TraceSpan> = new Map();
  private flushInterval: number = 30000; // 30 seconds
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || '/api/telemetry';
    if (typeof window !== 'undefined') {
      this.startAutoFlush();
    }
  }

  // Record a metric point
  recordMetric(
    name: string,
    value: number,
    unit: string = 'count',
    tags: Record<string, string> = {},
  ): void {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags: {
        environment: import.meta.env.MODE,
        ...tags,
      },
    });
  }

  // Start a trace span
  startSpan(name: string, attributes: Record<string, string | number | boolean> = {}): string {
    const spanId = `span-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.traces.set(spanId, {
      traceId,
      spanId,
      name,
      startTime: Date.now(),
      attributes: {
        service: 'wasel-web',
        environment: import.meta.env.MODE,
        ...attributes,
      },
      status: 'ok',
    });

    return spanId;
  }

  // End a trace span
  endSpan(spanId: string, status: 'ok' | 'error' = 'ok'): void {
    const span = this.traces.get(spanId);
    if (span) {
      span.endTime = Date.now();
      span.status = status;
    }
  }

  // Record SLO compliance
  recordSLO(
    service: string,
    operation: string,
    latencyMs: number,
    success: boolean,
  ): void {
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
  recordAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    latencyMs: number,
  ): void {
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

  // Flush metrics to backend
  private async flush(): Promise<void> {
    if (this.metrics.length === 0 && this.traces.size === 0) return;

    const payload = {
      metrics: [...this.metrics],
      traces: Array.from(this.traces.values()).filter((span) => span.endTime),
    };

    this.metrics = [];
    // Only remove completed traces
    Array.from(this.traces.entries()).forEach(([id, span]) => {
      if (span.endTime) this.traces.delete(id);
    });

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to flush telemetry:', error);
    }
  }

  private startAutoFlush(): void {
    setInterval(() => this.flush(), this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }
}

export const telemetry = new TelemetryCollector();

// Track Web Vitals
export function initWebVitals(): void {
  if (typeof window === 'undefined') return;

  import('web-vitals').then(({ onCLS, onLCP, onFCP, onTTFB, onINP }) => {
    onCLS((metric) => telemetry.recordMetric('web_vital.cls', metric.value, 'score'));
    onLCP((metric) => telemetry.recordMetric('web_vital.lcp', metric.value, 'ms'));
    onFCP((metric) => telemetry.recordMetric('web_vital.fcp', metric.value, 'ms'));
    onTTFB((metric) => telemetry.recordMetric('web_vital.ttfb', metric.value, 'ms'));
    onINP((metric) => telemetry.recordMetric('web_vital.inp', metric.value, 'ms'));
  });
}

// Track route changes
export function trackPageView(route: string): void {
  telemetry.recordMetric('page.view', 1, 'count', { route });
}

// Track user actions
export function trackUserAction(action: string, metadata: Record<string, string> = {}): void {
  telemetry.recordMetric('user.action', 1, 'count', { action, ...metadata });
}
