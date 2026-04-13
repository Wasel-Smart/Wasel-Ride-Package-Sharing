import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { hasTelemetryConsent } from './consent';
import { logger } from './logging';

let performanceMonitoringInitialized = false;
let longTaskObserverStarted = false;

export interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export interface PerformanceMetrics {
  cls: number;
  fid: number;
  fcp: number;
  lcp: number;
  ttfb: number;
  inp: number;
}

type AnalyticsEvent = Record<string, unknown>;

type MemoryUsageStats = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

type NavigationTimingSummary = {
  dns: number;
  tcp: number;
  request: number;
  response: number;
  dom: number;
  load: number;
  total: number;
};

type WindowWithAnalytics = Window & {
  gtag?: (command: 'event', eventName: string, params: AnalyticsEvent) => void;
};

type PerformanceWithMemory = Performance & {
  memory?: MemoryUsageStats;
};

const metrics: Partial<PerformanceMetrics> = {};

const PERFORMANCE_BUDGETS: Record<keyof PerformanceMetrics, number> = {
  cls: 0.1,
  fid: 200,
  fcp: 1800,
  lcp: 2500,
  ttfb: 600,
  inp: 200,
};

export function initPerformanceMonitoring(): void {
  if (
    typeof window === 'undefined'
    || performanceMonitoringInitialized
    || !hasTelemetryConsent()
  ) {
    return;
  }

  performanceMonitoringInitialized = true;

  onCLS((metric) => {
    metrics.cls = metric.value;
    reportWebVital(metric);
  });

  onFCP((metric) => {
    metrics.fcp = metric.value;
    reportWebVital(metric);
  });

  onLCP((metric) => {
    metrics.lcp = metric.value;
    reportWebVital(metric);
  });

  onTTFB((metric) => {
    metrics.ttfb = metric.value;
    reportWebVital(metric);
  });

  onINP((metric) => {
    metrics.inp = metric.value;
    metrics.fid = metric.value;
    reportWebVital(metric);
  });

  logger.addBreadcrumb('Performance monitoring initialized', 'performance');
}

function reportWebVital(metric: Metric): void {
  const vital: WebVital = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  };

  const budgetKey = vital.name.toLowerCase() as keyof PerformanceMetrics;
  const budget = PERFORMANCE_BUDGETS[budgetKey];

  if (budget !== undefined && vital.value > budget) {
    logger.warning(`Performance budget exceeded: ${vital.name}`, {
      value: vital.value,
      budget,
      exceeded: vital.value - budget,
      rating: vital.rating,
    });
  }

  sendToAnalytics(vital);

  if (vital.rating === 'poor') {
    logger.error(
      `Poor performance: ${vital.name}`,
      new Error('Performance threshold exceeded'),
      { metric: vital },
    );
  }
}

function sendToAnalytics(vital: WebVital): void {
  if (typeof window === 'undefined' || !hasTelemetryConsent()) {
    return;
  }

  const analyticsWindow = window as WindowWithAnalytics;
  analyticsWindow.gtag?.('event', vital.name, {
    event_category: 'Web Vitals',
    value: Math.round(vital.value),
    event_label: vital.id,
    non_interaction: true,
  });

  const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (!analyticsEndpoint) {
    return;
  }

  void fetch(analyticsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'web_vital',
      name: vital.name,
      value: vital.value,
      rating: vital.rating,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }),
    keepalive: true,
  }).catch(() => {
    logger.warning('Failed to send performance analytics', {
      metric: vital.name,
    });
  });
}

export function markPerformance(name: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  performance.mark(name);
}

export function measurePerformance(
  name: string,
  startMark: string,
  endMark?: string,
): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const measure = performance.measure(name, startMark, endMark);

    if (measure.duration > 1000) {
      logger.warning(`Slow operation: ${name}`, {
        duration: measure.duration,
        startMark,
        endMark,
      });
    }

    return measure.duration;
  } catch (error) {
    logger.warning('Performance measurement failed', {
      name,
      startMark,
      endMark,
      error: error instanceof Error ? error.message : 'Unknown performance error',
    });
    return null;
  }
}

export function getMetrics(): Partial<PerformanceMetrics> {
  return { ...metrics };
}

export function getPerformanceScore(): number {
  const scores: number[] = [];

  if (metrics.lcp !== undefined) {
    scores.push(metrics.lcp <= 2500 ? 100 : metrics.lcp <= 4000 ? 50 : 0);
  }

  if (metrics.fid !== undefined) {
    scores.push(metrics.fid <= 100 ? 100 : metrics.fid <= 300 ? 50 : 0);
  }

  if (metrics.cls !== undefined) {
    scores.push(metrics.cls <= 0.1 ? 100 : metrics.cls <= 0.25 ? 50 : 0);
  }

  if (metrics.fcp !== undefined) {
    scores.push(metrics.fcp <= 1800 ? 100 : metrics.fcp <= 3000 ? 50 : 0);
  }

  return scores.length > 0
    ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
    : 0;
}

export function getResourceTimings(): Array<{
  name: string;
  type: string;
  duration: number;
  size: number;
}> {
  if (typeof window === 'undefined') {
    return [];
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  return resources.map((resource) => ({
    name: resource.name,
    type: resource.initiatorType,
    duration: resource.duration,
    size: resource.transferSize || 0,
  }));
}

export function detectLongTasks(): void {
  if (
    typeof window === 'undefined' ||
    longTaskObserverStarted ||
    typeof PerformanceObserver === 'undefined'
  ) {
    return;
  }

  longTaskObserverStarted = true;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          logger.warning('Long task detected', {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    longTaskObserverStarted = false;
  }
}

export function getMemoryUsage():
  | (MemoryUsageStats & { usagePercent: number })
  | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const memory = (performance as PerformanceWithMemory).memory;
  if (!memory) {
    return null;
  }

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercent: Math.round(
      (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    ),
  };
}

export function getNavigationTiming(): NavigationTimingSummary | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const navigation = performance.getEntriesByType(
    'navigation',
  )[0] as PerformanceNavigationTiming | undefined;

  if (!navigation) {
    return null;
  }

  return {
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    request: navigation.responseStart - navigation.requestStart,
    response: navigation.responseEnd - navigation.responseStart,
    dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    load: navigation.loadEventEnd - navigation.loadEventStart,
    total: navigation.loadEventEnd - navigation.fetchStart,
  };
}

export function exportPerformanceReport(): {
  webVitals: Partial<PerformanceMetrics>;
  score: number;
  resources: ReturnType<typeof getResourceTimings>;
  memory: ReturnType<typeof getMemoryUsage>;
  navigation: ReturnType<typeof getNavigationTiming>;
  timestamp: string;
  url: string;
  userAgent: string;
} {
  return {
    webVitals: getMetrics(),
    score: getPerformanceScore(),
    resources: getResourceTimings(),
    memory: getMemoryUsage(),
    navigation: getNavigationTiming(),
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
  };
}

export function usePerformanceMonitor(componentName: string): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const startMark = `${componentName}-start`;
  const endMark = `${componentName}-end`;

  markPerformance(startMark);

  return () => {
    markPerformance(endMark);
    measurePerformance(componentName, startMark, endMark);
  };
}

export const Performance = {
  initPerformanceMonitoring,
  markPerformance,
  measurePerformance,
  getMetrics,
  getPerformanceScore,
  getResourceTimings,
  detectLongTasks,
  getMemoryUsage,
  getNavigationTiming,
  exportPerformanceReport,
  usePerformanceMonitor,
};

export default Performance;
