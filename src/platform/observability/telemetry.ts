import * as Sentry from '@sentry/react';
import type { DomainEvent } from '@/platform/events/domainEvent';
import { initializeOpenTelemetry, startOpenTelemetrySpan } from './openTelemetry';

export interface TelemetryMetric {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string | number | boolean>;
}

export interface TelemetrySpan {
  end: (attributes?: Record<string, unknown>) => void;
  fail: (error: unknown, attributes?: Record<string, unknown>) => void;
}

interface TelemetryConfig {
  environment: string;
  exporterUrl?: string;
  serviceName: string;
  serviceVersion: string;
}

class NoopSpan implements TelemetrySpan {
  end(): void {}
  fail(): void {}
}

let telemetryConfigured = false;
const emittedMetrics: TelemetryMetric[] = [];

function toSpanAttributeValue(value: unknown): string | number | boolean {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return JSON.stringify(value);
}

export function initializePlatformTelemetry(config: TelemetryConfig): void {
  if (telemetryConfigured) {
    return;
  }

  initializeOpenTelemetry(config);
  telemetryConfigured = true;
}

export function startTelemetrySpan(
  name: string,
  attributes: Record<string, unknown> = {},
): TelemetrySpan {
  const otelSpan = startOpenTelemetrySpan(name);
  const sentrySpan = Sentry.startInactiveSpan({ name, op: 'platform.operation' });

  if (!otelSpan && !sentrySpan) {
    return new NoopSpan();
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (otelSpan) {
      otelSpan.setAttribute(key, toSpanAttributeValue(value));
    }
    if (sentrySpan) {
      sentrySpan.setAttribute(key, toSpanAttributeValue(value));
    }
  });

  return {
    end(extraAttributes) {
      if (extraAttributes) {
        Object.entries(extraAttributes).forEach(([key, value]) => {
          otelSpan?.setAttribute(key, toSpanAttributeValue(value));
          sentrySpan?.setAttribute(key, toSpanAttributeValue(value));
        });
      }
      otelSpan?.end();
      sentrySpan?.end();
    },
    fail(error, extraAttributes) {
      if (extraAttributes) {
        Object.entries(extraAttributes).forEach(([key, value]) => {
          otelSpan?.setAttribute(key, toSpanAttributeValue(value));
          sentrySpan?.setAttribute(key, toSpanAttributeValue(value));
        });
      }
      const message = error instanceof Error ? error.message : String(error);
      otelSpan?.setAttribute('error', true);
      otelSpan?.setAttribute('error.message', toSpanAttributeValue(message));
      Sentry.captureException(error instanceof Error ? error : new Error(message));
      otelSpan?.end();
      sentrySpan?.setStatus({ code: 2, message });
      sentrySpan?.end();
    },
  };
}

export function recordMetric(metric: TelemetryMetric): void {
  emittedMetrics.push(metric);
  if (emittedMetrics.length > 500) {
    emittedMetrics.splice(0, emittedMetrics.length - 500);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wasel:metric', { detail: metric }));
  }
}

export function getRecordedMetrics(): TelemetryMetric[] {
  return [...emittedMetrics];
}

export function captureTelemetryException(error: unknown, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }

    Sentry.captureException(new Error(String(error)));
  });
}

export function trackDomainEvent(event: DomainEvent): void {
  recordMetric({
    name: `domain_event.${event.domain}.${event.name}`,
    value: 1,
    unit: 'count',
    tags: {
      domain: event.domain,
      name: event.name,
      version: event.version,
    },
  });

  Sentry.addBreadcrumb({
    category: 'domain-event',
    level: 'info',
    message: `${event.domain}:${event.name}`,
    data: {
      eventId: event.id,
      correlationId: event.metadata.correlationId,
    },
  });
}
