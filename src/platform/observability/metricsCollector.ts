/**
 * Metrics Collector — Performance & Business Metrics
 * 
 * Collects and reports metrics for:
 * - API performance
 * - User interactions
 * - Business KPIs
 * - System health
 */

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

export interface MetricAggregation {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private counters: Map<string, number> = new Map();
  private readonly MAX_SAMPLES = 1000;

  recordTiming(name: string, duration: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const samples = this.metrics.get(key) || [];
    samples.push(duration);
    
    if (samples.length > this.MAX_SAMPLES) {
      samples.shift();
    }
    
    this.metrics.set(key, samples);
  }

  incrementCounter(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  getAggregation(name: string, tags?: Record<string, string>): MetricAggregation | null {
    const key = this.buildKey(name, tags);
    const samples = this.metrics.get(key);
    
    if (!samples || samples.length === 0) return null;
    
    const sorted = [...samples].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    
    return {
      count: sorted.length,
      sum,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  getCounter(name: string, tags?: Record<string, string>): number {
    const key = this.buildKey(name, tags);
    return this.counters.get(key) || 0;
  }

  getAllMetrics(): Record<string, MetricAggregation> {
    const result: Record<string, MetricAggregation> = {};
    
    this.metrics.forEach((_, key) => {
      const agg = this.getAggregation(key);
      if (agg) result[key] = agg;
    });
    
    return result;
  }

  getAllCounters(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }

  reset(): void {
    this.metrics.clear();
    this.counters.clear();
  }

  private buildKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) return name;
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${name}{${tagStr}}`;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

export const metricsCollector = new MetricsCollector();

export function recordApiTiming(
  service: string,
  method: string,
  path: string,
  duration: number,
  status: number,
): void {
  metricsCollector.recordTiming('api.request.duration', duration, {
    service,
    method,
    path,
    status: String(status),
  });
  
  metricsCollector.incrementCounter('api.request.count', 1, {
    service,
    method,
    status: String(status),
  });
}

export function recordUserAction(action: string, feature: string): void {
  metricsCollector.incrementCounter('user.action', 1, { action, feature });
}

export function recordBusinessMetric(metric: string, value: number, tags?: Record<string, string>): void {
  metricsCollector.recordTiming(`business.${metric}`, value, tags);
}

export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    metricsCollector.recordTiming(name, performance.now() - start, tags);
    return result;
  } catch (error) {
    metricsCollector.recordTiming(name, performance.now() - start, { ...tags, error: 'true' });
    throw error;
  }
}
