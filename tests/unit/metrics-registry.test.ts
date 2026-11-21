import { describe, it, expect } from 'vitest';
import { recordHttpRequest, setGauge, renderMetrics } from '../../api/_lib/metrics';

describe('Prometheus metrics registry', () => {
  it('emits api_requests_total counter lines with labels', () => {
    recordHttpRequest({ method: 'get', route: '/v1/trips', status: 200, durationMs: 120 });
    const output = renderMetrics();
    expect(output).toContain('# TYPE api_requests_total counter');
    expect(output).toMatch(/api_requests_total\{method="GET",route="\/v1\/trips",status="200"\} 1/);
    expect(output).toMatch(/api_requests_total\{method="GET",route="\/v1\/trips",status="2xx"\} 1/);
  });

  it('records 5xx under a 5xx status class label for error-rate queries', () => {
    recordHttpRequest({ method: 'POST', route: '/v1/wallet/withdraw', status: 503, durationMs: 40 });
    const output = renderMetrics();
    expect(output).toMatch(/status="503"/);
    expect(output).toMatch(/status="5xx"/);
  });

  it('emits api_latency_seconds histogram buckets consumed by Grafana p95 panel', () => {
    recordHttpRequest({ method: 'GET', route: '/v1/rides', status: 200, durationMs: 300 });
    const output = renderMetrics();
    expect(output).toContain('# TYPE api_latency_seconds histogram');
    expect(output).toContain('api_latency_seconds_bucket');
    expect(output).toContain('api_latency_seconds_sum');
    expect(output).toContain('api_latency_seconds_count');
    // le="+Inf" bucket must equal the observed count.
    expect(output).toMatch(/api_latency_seconds_bucket\{[^}]*le="\+Inf"[^}]*\} \d+/);
  });

  it('emits event_broker_queue_depth gauge for the Grafana stat panel', () => {
    setGauge('event_broker_queue_depth', 7);
    const output = renderMetrics();
    expect(output).toContain('# TYPE event_broker_queue_depth gauge');
    expect(output).toMatch(/event_broker_queue_depth 7/);
  });

  it('converts millisecond durations to seconds in histogram sums', () => {
    recordHttpRequest({ method: 'GET', route: '/v1/convert', status: 200, durationMs: 1500 });
    const output = renderMetrics();
    expect(output).toMatch(/api_latency_seconds_sum\{[^}]*\} 1\.5/);
  });

  it('escapes quotes in label values to keep exposition valid', () => {
    recordHttpRequest({ method: 'GET', route: '/v1/we"ird', status: 200, durationMs: 10 });
    const output = renderMetrics();
    expect(output).toContain('route="/v1/we\\"ird"');
  });
});