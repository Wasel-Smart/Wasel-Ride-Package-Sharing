/**
 * Minimal, dependency-free Prometheus metrics registry.
 *
 * Produces the Prometheus text exposition format consumed by the Grafana
 * "Wasel - Production Overview" dashboard
 * (.github/workflows/grafana-dashboard-wasel-overview.json), which queries:
 *   - api_requests_total{status=~"5.."}
 *   - api_latency_seconds_bucket   (p95 via histogram_quantile)
 *   - event_broker_queue_depth
 *
 * The registry aggregates within a single warm runtime instance. On
 * long-running deployments (Docker/nginx, container workers) this yields
 * process-lifetime aggregates; on stateless serverless a Prometheus scrape /
 * remote-write should target the long-running instances or a push gateway.
 */

export type Labels = Record<string, string>;

interface NamedLabels {
  readonly name: string;
  readonly labels: Labels;
}

interface CounterMetric extends NamedLabels {
  value: number;
}

interface GaugeMetric extends NamedLabels {
  value: number;
}

interface HistogramMetric extends NamedLabels {
  readonly buckets: readonly number[];
  readonly counts: number[];
  sum: number;
  count: number;
}

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function labelKey(labels: Labels): string {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key] ?? ''}`)
    .join(',');
}

function serializeLabels(labels: Labels): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) {
    return '';
  }
  const parts = keys.map((key) => `${key}="${escapeLabelValue(labels[key] ?? '')}"`);
  return `{${parts.join(',')}}`;
}

function formatNumber(value: number): string {
  if (Number.isNaN(value)) {
    return '0';
  }
  if (!Number.isFinite(value)) {
    return value > 0 ? '+Inf' : '-Inf';
  }
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

class MetricsRegistry {
  readonly #counters = new Map<string, CounterMetric>();
  readonly #gauges = new Map<string, GaugeMetric>();
  readonly #histograms = new Map<string, HistogramMetric>();

  #key(name: string, labels: Labels): string {
    return `${name}|${labelKey(labels)}`;
  }

  incCounter(name: string, labels: Labels = {}, value = 1): void {
    const key = this.#key(name, labels);
    const existing = this.#counters.get(key);
    if (existing) {
      existing.value += value;
      return;
    }
    this.#counters.set(key, { name, labels: { ...labels }, value });
  }

  setGauge(name: string, value: number, labels: Labels = {}): void {
    const key = this.#key(name, labels);
    const existing = this.#gauges.get(key);
    if (existing) {
      existing.value = value;
      return;
    }
    this.#gauges.set(key, { name, labels: { ...labels }, value });
  }

  observeHistogram(name: string, value: number, labels: Labels = {}, buckets: readonly number[] = DEFAULT_BUCKETS): void {
    const key = this.#key(name, labels);
    const existing = this.#histograms.get(key);
    if (existing) {
      this.#observeInto(existing, value);
      return;
    }
    const fresh: HistogramMetric = {
      name,
      labels: { ...labels },
      buckets: [...buckets],
      counts: buckets.map(() => 0),
      sum: 0,
      count: 0,
    };
    this.#observeInto(fresh, value);
    this.#histograms.set(key, fresh);
  }

  #observeInto(metric: HistogramMetric, value: number): void {
    metric.count += 1;
    metric.sum += value;
    for (let index = 0; index < metric.buckets.length; index += 1) {
      const upperBound = metric.buckets[index] ?? Number.POSITIVE_INFINITY;
      if (value <= upperBound) {
        const bucket = metric.counts[index];
        if (bucket !== undefined) {
          metric.counts[index] = bucket + 1;
        }
      }
    }
  }

  render(): string {
    const lines: string[] = [];

    if (this.#counters.size > 0) {
      const names = [...new Set([...this.#counters.values()].map((metric) => metric.name))];
      for (const name of names) {
        lines.push(`# TYPE ${name} counter`);
        lines.push(`# HELP ${name} Total count of ${name}, partitioned by labels.`);
      }
      for (const metric of this.#counters.values()) {
        lines.push(`${metric.name}${serializeLabels(metric.labels)} ${formatNumber(metric.value)}`);
      }
    }

    if (this.#gauges.size > 0) {
      const names = [...new Set([...this.#gauges.values()].map((metric) => metric.name))];
      for (const name of names) {
        lines.push(`# TYPE ${name} gauge`);
      }
      for (const metric of this.#gauges.values()) {
        lines.push(`${metric.name}${serializeLabels(metric.labels)} ${formatNumber(metric.value)}`);
      }
    }

    if (this.#histograms.size > 0) {
      const names = [...new Set([...this.#histograms.values()].map((metric) => metric.name))];
      for (const name of names) {
        lines.push(`# TYPE ${name} histogram`);
      }
      for (const metric of this.#histograms.values()) {
        let cumulative = 0;
        for (let index = 0; index < metric.buckets.length; index += 1) {
          cumulative += metric.counts[index] ?? 0;
          const upperBound = metric.buckets[index] ?? 0;
          lines.push(
            `${metric.name}_bucket${serializeLabels({ ...metric.labels, le: formatNumber(upperBound) })} ${formatNumber(cumulative)}`,
          );
        }
        lines.push(`${metric.name}_bucket${serializeLabels({ ...metric.labels, le: '+Inf' })} ${formatNumber(metric.count)}`);
        lines.push(`${metric.name}_sum${serializeLabels(metric.labels)} ${formatNumber(metric.sum)}`);
        lines.push(`${metric.name}_count${serializeLabels(metric.labels)} ${formatNumber(metric.count)}`);
      }
    }

    return lines.length > 0 ? `${lines.join('\n')}\n` : '';
  }
}

const registry = new MetricsRegistry();

/**
 * Record a completed HTTP request into the registry.
 * `durationMs` is converted to seconds to match Prometheus base units.
 */
export function recordHttpRequest(input: {
  method: string;
  route: string;
  status: number;
  durationMs: number;
}): void {
  const method = input.method.toUpperCase();
  registry.incCounter('api_requests_total', { method, route: input.route, status: String(input.status) });
  registry.incCounter('api_requests_total', { method, route: input.route, status: `${Math.floor(input.status / 100)}xx` });
  registry.observeHistogram('api_latency_seconds', Math.max(0, input.durationMs) / 1000, { method, route: input.route });
}

/** Set the worker/broker queue-depth gauge consumed by the Grafana stat panel. */
export function setQueueDepth(depth: number): void {
  registry.setGauge('event_broker_queue_depth', depth);
}

/** Set an arbitrary gauge (e.g. outbox/dead-letter counts). */
export function setGauge(name: string, value: number, labels: Labels = {}): void {
  registry.setGauge(name, value, labels);
}

/** Render the registry in Prometheus text exposition format. */
export function renderMetrics(): string {
  return registry.render();
}