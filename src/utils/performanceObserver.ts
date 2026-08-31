/**
 * Performance Monitoring & Core Web Vitals
 *
 * Tracks:
 *  - LCP / FID / CLS (web-vitals)
 *  - Long Tasks (>50ms)
 *  - Layout shifts (CLS contributors)
 *  - Memory pressure (when available)
 *  - Route change timing
 */

import { logger } from './monitoring';

type WebVitalMetric = {
  name: 'LCP' | 'FID' | 'CLS' | 'INP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
};

type LongTaskEntry = PerformanceEntry & {
  duration: number;
  startTime: number;
};

const LCP_THRESHOLDS = { good: 2500, poor: 4000 };
const FID_THRESHOLDS = { good: 100, poor: 300 };
const CLS_THRESHOLDS = { good: 0.1, poor: 0.25 };
const INP_THRESHOLDS = { good: 200, poor: 500 };
const LONG_TASK_THRESHOLD = 50;

const listeners = new Set<(metric: WebVitalMetric) => void>();
const longTaskListeners = new Set<(task: LongTaskEntry) => void>();

export function subscribeToWebVitals(callback: (metric: WebVitalMetric) => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function subscribeToLongTasks(callback: (task: LongTaskEntry) => void): () => void {
  longTaskListeners.add(callback);
  return () => longTaskListeners.delete(callback);
}

function ratingForThreshold(value: number, thresholds: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

function emitWebVital(metric: WebVitalMetric) {
  listeners.forEach((listener) => {
    try {
      listener(metric);
    } catch (error) {
      logger.error('Web vital listener failed', { error });
    }
  });
}

function initLongTaskObserver() {
  if (typeof PerformanceObserver === 'undefined') return;
  if (!('longtask' in PerformanceObserver.prototype)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const task = entry as LongTaskEntry;
        longTaskListeners.forEach((listener) => {
          try {
            listener(task);
          } catch (error) {
            logger.error('Long task listener failed', { error });
          }
        });

        if (task.duration > LONG_TASK_THRESHOLD) {
          logger.warning('Long task detected', {
            duration: task.duration,
            startTime: task.startTime,
            name: task.name,
          });
        }
      });
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // Long task observation not supported; fail silently.
  }
}

function initLayoutShiftObserver() {
  if (typeof PerformanceObserver === 'undefined') return;
  if (!('layout-shift' in PerformanceObserver.prototype)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if ((entry as PerformanceEntry & { value?: number }).value && (entry as PerformanceEntry & { value?: number }).value! > 0.01) {
          logger.warning('Layout shift detected', {
            value: (entry as PerformanceEntry & { value?: number }).value,
            startTime: entry.startTime,
          });
        }
      });
    });

    observer.observe({ entryTypes: ['layout-shift'] });
  } catch {
    // Layout shift observation not supported; fail silently.
  }
}

function initMemoryObserver() {
  if (typeof performance === 'undefined' || !('memory' in performance)) return;

  const memory = (performance as Performance & { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  const usedMB = memory.usedJSHeapSize / 1024 / 1024;
  const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
  const ratio = usedMB / limitMB;

  if (ratio > 0.8) {
    logger.warning('High memory usage detected', {
      usedMB: Math.round(usedMB),
      limitMB: Math.round(limitMB),
      ratio: ratio.toFixed(2),
    });
  }
}

export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  initLongTaskObserver();
  initLayoutShiftObserver();
  initMemoryObserver();

  if (typeof window !== 'undefined' && 'web-vitals' in window) {
    try {
      const vitals = (window as unknown as Record<string, unknown>).webvitals as
        | {
            onLCP?: (callback: (metric: { value: number; id: string }) => void) => void;
            onFID?: (callback: (metric: { value: number; id: string }) => void) => void;
            onCLS?: (callback: (metric: { value: number; id: string }) => void) => void;
            onINP?: (callback: (metric: { value: number; id: string }) => void) => void;
          }
        | undefined;

      if (vitals?.onLCP) {
        vitals.onLCP((metric) => {
          emitWebVital({
            name: 'LCP',
            value: metric.value,
            rating: ratingForThreshold(metric.value, LCP_THRESHOLDS),
            delta: metric.value,
            id: metric.id,
          });
        });
      }

      if (vitals?.onFID) {
        vitals.onFID((metric) => {
          emitWebVital({
            name: 'FID',
            value: metric.value,
            rating: ratingForThreshold(metric.value, FID_THRESHOLDS),
            delta: metric.value,
            id: metric.id,
          });
        });
      }

      if (vitals?.onCLS) {
        vitals.onCLS((metric) => {
          emitWebVital({
            name: 'CLS',
            value: metric.value,
            rating: ratingForThreshold(metric.value, CLS_THRESHOLDS),
            delta: metric.value,
            id: metric.id,
          });
        });
      }

      if (vitals?.onINP) {
        vitals.onINP((metric) => {
          emitWebVital({
            name: 'INP',
            value: metric.value,
            rating: ratingForThreshold(metric.value, INP_THRESHOLDS),
            delta: metric.value,
            id: metric.id,
          });
        });
      }
    } catch {
      // web-vitals initialization failed; fail silently.
    }
  }
}

export function measureRouteChange(routeName: string) {
  if (typeof performance === 'undefined' || !('mark' in performance)) return;

  const startMark = `route-${routeName}-start`;
  const endMark = `route-${routeName}-end`;

  try {
    performance.mark(startMark);
  } catch {
    return;
  }

  return () => {
    try {
      performance.mark(endMark);
      performance.measure(routeName, startMark, endMark);
      const measures = performance.getEntriesByName(routeName);
      const last = measures[measures.length - 1];
      if (last) {
        logger.info('Route change timing', {
          route: routeName,
          duration: last.duration,
        });
      }
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(routeName);
    } catch {
      // Measurement failed; fail silently.
    }
  };
}
