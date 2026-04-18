/**
 * Performance Monitor - Runtime performance tracking and optimization
 */

import { PERFORMANCE_THRESHOLDS } from './config';
import { sanitizeForLog } from '../logSanitizer';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.initializeObserver();
  }

  private initializeObserver() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: entry.name,
            value: entry.startTime,
            timestamp: Date.now(),
            url: window.location.pathname,
          });
        }
      });

      this.observer.observe({ 
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input'] 
      });
    } catch (error) {
      console.warn('[Performance Monitor] Failed to initialize observer:', error);
    }
  }

  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    this.checkThresholds(metric);
  }

  private checkThresholds(metric: PerformanceMetric) {
    const thresholds = {
      'first-contentful-paint': PERFORMANCE_THRESHOLDS.FCP,
      'largest-contentful-paint': PERFORMANCE_THRESHOLDS.LCP,
      'first-input-delay': PERFORMANCE_THRESHOLDS.FID,
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(`[Performance] ${sanitizeForLog(metric.name)} exceeded threshold: ${metric.value}ms > ${threshold}ms`);
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public clearMetrics() {
    this.metrics = [];
  }

  public measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.recordMetric({
      name: `function:${name}`,
      value: end - start,
      timestamp: Date.now(),
      url: window.location.pathname,
    });

    return result;
  }

  public async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    this.recordMetric({
      name: `async:${name}`,
      value: end - start,
      timestamp: Date.now(),
      url: window.location.pathname,
    });

    return result;
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    measureFunction: performanceMonitor.measureFunction.bind(performanceMonitor),
    measureAsyncFunction: performanceMonitor.measureAsyncFunction.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    clearMetrics: performanceMonitor.clearMetrics.bind(performanceMonitor),
  };
}