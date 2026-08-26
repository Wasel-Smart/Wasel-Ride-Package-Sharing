/**
 * Performance Monitoring & Web Vitals
 * Version: 1.0.0
 *
 * Tracks Core Web Vitals and performance metrics
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, type MetricType } from 'web-vitals';
import { logger } from './monitoring';
import { sanitizeLogMessage } from './sanitization';

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
  cls: number; // Cumulative Layout Shift
  fid: number; // Legacy First Input Delay alias mapped from INP
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  ttfb: number; // Time to First Byte
  inp: number; // Interaction to Next Paint
}

const metrics: Partial<PerformanceMetrics> = {};

// Performance budgets (in milliseconds)
const PERFORMANCE_BUDGETS = {
  fcp: 1800, // First Contentful Paint
  lcp: 2500, // Largest Contentful Paint
  fid: 200, // Legacy First Input Delay alias mapped from INP
  cls: 0.1, // Cumulative Layout Shift
  ttfb: 600, // Time to First Byte
  inp: 200, // Interaction to Next Paint
};

// Initialize Web Vitals tracking

// ─── Utilities (memoize / debounce / throttle / virtualization) ───────────────
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  options: {
    keyGenerator?: (...args: TArgs) => string;
    maxSize?: number;
    ttl?: number;
  } = {},
): (...args: TArgs) => TResult {
  const { keyGenerator, maxSize = 100, ttl } = options;
  const cache = new Map<string, { value: TResult; timestamp: number }>();
  const defaultKeyGenerator = (...args: TArgs): string => JSON.stringify(args);

  return (...args: TArgs): TResult => {
    const key = (keyGenerator ?? defaultKeyGenerator)(...args);
    const cached = cache.get(key);

    if (cached) {
      if (!ttl || Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }
      cache.delete(key);
    }

    const result = fn(...args);

    // Evict oldest entries if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  };
}

/**
 * Creates a singleton memoizer — caches only the last result.
 * Useful for functions called repeatedly with the same arguments.
 */
export function memoizeLast<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  let lastArgs: TArgs | null = null;
  let lastResult: TResult;
  let hasResult = false;

  return (...args: TArgs): TResult => {
    if (hasResult && lastArgs && shallowEqual(args, lastArgs)) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn(...args);
    hasResult = true;
    return lastResult;
  };
}

// ─── Debounce & Throttle ──────────────────────────────────────────────────────

/**
 * Creates a debounced function that delays execution until after
 * the specified wait time has elapsed since the last invocation.
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {},
): (...args: TArgs) => void {
  const { leading = false, trailing = true, maxWait } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number | null = null;
  let lastArgs: TArgs | null = null;

  const invoke = (args: TArgs) => {
    fn(...args);
    lastCallTime = Date.now();
    maxTimeoutId = null;
  };

  return (...args: TArgs): void => {
    lastArgs = args;
    const now = Date.now();
    const isInvoking = leading && !timeoutId;

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (trailing && lastArgs) {
        invoke(lastArgs);
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
        maxTimeoutId = null;
      }
    }, wait);

    if (maxWait && !maxTimeoutId && lastCallTime) {
      maxTimeoutId = setTimeout(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (lastArgs) {
          invoke(lastArgs);
        }
      }, maxWait - (now - lastCallTime));
    }

    if (isInvoking) {
      invoke(args);
    }
  };
}

/**
 * Creates a throttled function that only invokes at most once
 * per specified wait period.
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): (...args: TArgs) => void {
  const { leading = true, trailing = true } = options;
  let lastInvokeTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const invoke = (args: TArgs) => {
    fn(...args);
    lastInvokeTime = Date.now();
  };

  return (...args: TArgs): void => {
    const now = Date.now();
    const remaining = wait - (now - lastInvokeTime);
    lastArgs = args;

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (leading) {
        invoke(args);
      }
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (lastArgs && trailing) {
          invoke(lastArgs);
        }
      }, remaining);
    }
  };
}

// ─── Virtualization ───────────────────────────────────────────────────────────

export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
}

/**
 * Calculates the visible window for virtual scrolling.
 * Only renders items that are visible in the viewport.
 */
export function calculateVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  itemCount: number,
  itemHeight: number,
  overscan = 5,
): VirtualWindow {
  const totalHeight = itemCount * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(itemCount, startIndex + visibleCount);
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY, totalHeight };
}

/**
 * Calculates the visible window for variable-height virtual scrolling.
 */
export function calculateVariableVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  itemHeights: number[],
  overscan = 5,
): VirtualWindow {
  const totalHeight = itemHeights.reduce((sum, h) => sum + h, 0);
  let accumulatedHeight = 0;
  let startIndex = 0;

  // Find start index
  for (let i = 0; i < itemHeights.length; i++) {
    const height = itemHeights[i] ?? 0;
    if (accumulatedHeight + height > scrollTop) {
      startIndex = Math.max(0, i - overscan);
      break;
    }
    accumulatedHeight += height;
  }

  // Find end index
  let endIndex = startIndex;
  let visibleHeight = 0;
  const startOffset = itemHeights.slice(0, startIndex).reduce((sum, h) => sum + (h ?? 0), 0);

  for (let i = startIndex; i < itemHeights.length; i++) {
    const height = itemHeights[i] ?? 0;
    visibleHeight += height;
    endIndex = i + 1;
    if (visibleHeight > viewportHeight + overscan * height) break;
  }

  return {
    startIndex,
    endIndex: Math.min(itemHeights.length, endIndex + overscan),
    offsetY: startOffset,
    totalHeight,
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Shallow equality check for arrays.
 */
function shallowEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * RequestIdleCallback polyfill with fallback to setTimeout.
 */
export function scheduleIdleTask(
  callback: () => void,
  options?: { timeout?: number },
): () => void {
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(callback, options);
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, options?.timeout ?? 1);
  return () => clearTimeout(id);
}

/**
 * Batches multiple state updates into a single microtask.
 */
export function batchTasks(tasks: Array<() => void>): void {
  if (typeof queueMicrotask !== 'undefined') {
    queueMicrotask(() => tasks.forEach(t => t()));
  } else {
    Promise.resolve().then(() => tasks.forEach(t => t()));
  }
}

/**
 * Creates a function that will only execute after being called
 * a specified number of times (coalesce pattern).
 */
export function coalesce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  count: number,
): (...args: TArgs) => void {
  let callCount = 0;

  return (...args: TArgs): void => {
    callCount++;
    if (callCount >= count) {
      fn(...args);
      callCount = 0;
    }
  };
}

// ─── Performance Monitoring ───────────────────────────────────────────────────

/**
 * Initializes performance monitoring observers.
 * Sets up LCP, FID, CLS, and FCP observers for Core Web Vitals tracking.
 */

// ─── Web Vitals Monitoring ───────────────────────────────────────────────────
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined' || performanceMonitoringInitialized) return;

  performanceMonitoringInitialized = true;

  // Track Cumulative Layout Shift
  onCLS(metric => {
    metrics.cls = metric.value;
    reportWebVital(metric);
  });

  // Track First Contentful Paint
  onFCP(metric => {
    metrics.fcp = metric.value;
    reportWebVital(metric);
  });

  // Track Largest Contentful Paint
  onLCP(metric => {
    metrics.lcp = metric.value;
    reportWebVital(metric);
  });

  // Track Time to First Byte
  onTTFB(metric => {
    metrics.ttfb = metric.value;
    reportWebVital(metric);
  });

  // Track Interaction to Next Paint
  onINP(metric => {
    metrics.inp = metric.value;
    reportWebVital(metric);
    metrics.fid = metric.value;
  });

  if (import.meta.env.DEV) {
    console.log('Performance monitoring initialized');
  }
}

function reportWebVital(metric: MetricType) {
  const vital: WebVital = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    const emoji =
      vital.rating === 'good' ? 'OK' : vital.rating === 'needs-improvement' ? 'WARN' : 'POOR';
    console.log(`[perf] ${emoji} ${sanitizeLogMessage(vital.name)}: ${sanitizeLogMessage(vital.value.toFixed(2))}ms (${sanitizeLogMessage(vital.rating)})`);
  }

  // Check against performance budget
  const budget = PERFORMANCE_BUDGETS[vital.name.toLowerCase() as keyof typeof PERFORMANCE_BUDGETS];
  if (budget && vital.value > budget) {
    logger.warning(`Performance budget exceeded: ${sanitizeLogMessage(vital.name)}`, {
      value: Number(vital.value.toFixed(2)),
      budget,
      exceeded: vital.value - budget,
      rating: vital.rating,
    });
  }

  // Send to analytics
  sendToAnalytics(vital);

  // Send to Sentry for poor metrics
  if (vital.rating === 'poor') {
    logger.error(
      `Poor performance: ${sanitizeLogMessage(vital.name)}`,
      new Error('Performance threshold exceeded'),
      {
        metric: vital,
      },
    );
  }
}

function sendToAnalytics(vital: WebVital) {
  if (typeof window === 'undefined') return;

  // Check analytics consent before sending
  try {
    if (!localStorage.getItem('consent-analytics')) {
      return;
    }
  } catch {
    return;
  }

  // Send to Google Analytics
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (gtag) {
    gtag('event', vital.name, {
      event_category: 'Web Vitals',
      value: Math.round(vital.value),
      event_label: vital.id,
      non_interaction: true,
    });
  }

  // Send to custom analytics endpoint
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web_vital',
        name: vital.name,
        value: vital.value,
        rating: vital.rating,
        timestamp: Date.now(),
        url: sanitizeLogMessage(window.location.pathname),
      }),
      keepalive: true,
    }).catch(() => undefined);
  }
}

// Track custom performance marks
export function markPerformance(name: string) {
  if (typeof window === 'undefined') return;
  performance.mark(name);
}

export function measurePerformance(name: string, startMark: string, endMark?: string) {
  if (typeof window === 'undefined') return;

  try {
    const measure = performance.measure(name, startMark, endMark);

    if (import.meta.env.DEV) {
    console.log(`[perf] ${sanitizeLogMessage(name)}: ${sanitizeLogMessage(measure.duration.toFixed(2))}ms`);
  }

    // Log slow operations
    if (measure.duration > 1000) {
      logger.warning(`Slow operation: ${sanitizeLogMessage(name)}`, {
        duration: measure.duration,
        startMark: sanitizeLogMessage(startMark),
        endMark: endMark !== undefined ? sanitizeLogMessage(endMark) : undefined,
      });
    }

    return measure.duration;
  } catch {
    return null;
  }
}

// Get current metrics
export function getMetrics(): Partial<PerformanceMetrics> {
  return { ...metrics };
}

// Get performance score (0-100)
export function getPerformanceScore(): number {
  const scores: number[] = [];

  // LCP score
  if (metrics.lcp) {
    if (metrics.lcp <= 2500) scores.push(100);
    else if (metrics.lcp <= 4000) scores.push(50);
    else scores.push(0);
  }

  // FID score
  if (metrics.fid) {
    if (metrics.fid <= 100) scores.push(100);
    else if (metrics.fid <= 300) scores.push(50);
    else scores.push(0);
  }

  // CLS score
  if (metrics.cls !== undefined) {
    if (metrics.cls <= 0.1) scores.push(100);
    else if (metrics.cls <= 0.25) scores.push(50);
    else scores.push(0);
  }

  // FCP score
  if (metrics.fcp) {
    if (metrics.fcp <= 1800) scores.push(100);
    else if (metrics.fcp <= 3000) scores.push(50);
    else scores.push(0);
  }

  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

// Resource timing
export function getResourceTimings() {
  if (typeof window === 'undefined') return [];

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  return resources.map(resource => ({
    name: resource.name,
    type: resource.initiatorType,
    duration: resource.duration,
    size: resource.transferSize || 0,
  }));
}

// Long tasks detection
export function detectLongTasks() {
  if (typeof window === 'undefined' || longTaskObserverStarted) return;

  longTaskObserverStarted = true;

  const observer = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) {
        logger.warning('Long task detected', {
          name: sanitizeLogMessage(entry.name),
          duration: sanitizeLogMessage(entry.duration.toFixed(2)),
          startTime: sanitizeLogMessage(entry.startTime.toFixed(2)),
        });
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    longTaskObserverStarted = false;
  }
}

// Memory usage (Chrome only)
export function getMemoryUsage() {
  if (typeof window === 'undefined') return null;

  type ChromeMemoryInfo = {
    usedJSHeapSize: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit: number;
  };

  const memory = (performance as Performance & { memory?: ChromeMemoryInfo }).memory;
  if (!memory) return null;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize ?? memory.usedJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
  };
}

// Navigation timing
export function getNavigationTiming() {
  if (typeof window === 'undefined') return null;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!navigation) return null;

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

// Export performance report
export function exportPerformanceReport() {
  return {
    webVitals: getMetrics(),
    score: getPerformanceScore(),
    resources: getResourceTimings(),
    memory: getMemoryUsage(),
    navigation: getNavigationTiming(),
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.pathname : '',
  };
}

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  if (typeof window === 'undefined') return;

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
