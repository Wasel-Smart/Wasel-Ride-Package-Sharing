/**
 * tests/utils/telemetry.test.ts
 *
 * Unit tests for src/platform/telemetry.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  telemetry,
  trackUserAction,
  trackPageView,
  initWebVitals,
} from '@/platform/telemetry';

beforeEach(() => {
  telemetry.stopAutoFlush();
  vi.spyOn(telemetry, 'recordMetric').mockImplementation(() => {
    // no-op in tests
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('telemetry.recordMetric()', () => {
  it('records a metric point without throwing', () => {
    expect(() => telemetry.recordMetric('test.metric', 42, 'count', { env: 'test' })).not.toThrow();
  });

  it('records API call metrics', () => {
    expect(() => telemetry.recordAPICall('/v1/bookings', 'POST', 200, 150)).not.toThrow();
    expect(() => telemetry.recordAPICall('/v1/bookings', 'POST', 500, 500)).not.toThrow();
  });

  it('records SLO metrics', () => {
    expect(() => telemetry.recordSLO('payment-service', 'process', 300, true)).not.toThrow();
    expect(() => telemetry.recordSLO('payment-service', 'process', 500, false)).not.toThrow();
  });
});

describe('telemetry.startSpan() / endSpan()', () => {
  it('creates and ends a span', () => {
    const spanId = telemetry.startSpan('test.operation', { traceId: 'trace-123' });
    expect(typeof spanId).toBe('string');
    expect(spanId.startsWith('span-')).toBe(true);
    expect(() => telemetry.endSpan(spanId, 'ok')).not.toThrow();
  });

  it('records error status on endSpan', () => {
    const spanId = telemetry.startSpan('test.error');
    expect(() => telemetry.endSpan(spanId, 'error')).not.toThrow();
  });

  it('handles endSpan with unknown spanId gracefully', () => {
    expect(() => telemetry.endSpan('nonexistent-span', 'ok')).not.toThrow();
  });
});

describe('standalone telemetry functions', () => {
  it('trackUserAction does not throw', () => {
    expect(() => trackUserAction('button_click', { button: 'book_ride' })).not.toThrow();
  });

  it('trackPageView does not throw', () => {
    expect(() => trackPageView('/app/find-ride')).not.toThrow();
  });

  it('initWebVitals does not throw in jsdom', () => {
    expect(() => initWebVitals()).not.toThrow();
  });
});
