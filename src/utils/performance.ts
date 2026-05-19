/**
 * Performance Monitoring & Web Vitals
 * Version: 1.0.0
 *
 * Tracks Core Web Vitals and performance metrics
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';
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

  console.log('✅ Performance monitoring initialized');
}

function reportWebVital(metric: Metric) {
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
      vital.rating === 'good' ? '✅' : vital.rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`${emoji} ${vital.name}: ${vital.value.toFixed(2)}ms (${vital.rating})`);
  }

  // Check against performance budget
  const budget = PERFORMANCE_BUDGETS[vital.name.toLowerCase() as keyof typeof PERFORMANCE_BUDGETS];
  if (budget && vital.value > budget) {
    logger.warning(`Performance budget exceeded: ${sanitizeLogMessage(vital.name)}`, {
      value: vital.value,
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
  if (!localStorage.getItem('consent-analytics')) {
    return;
  }

  // Send to Google Analytics
  if ((window as any).gtag) {
    (window as any).gtag('event', vital.name, {
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
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
      keepalive: true,
    }).catch(error => {
      console.error('Failed to send analytics:', error);
    });
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

    console.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);

    // Log slow operations
    if (measure.duration > 1000) {
      logger.warning(`Slow operation: ${sanitizeLogMessage(name)}`, {
        duration: measure.duration,
        startMark,
        endMark,
      });
    }

    return measure.duration;
  } catch (error) {
    console.error('Performance measurement failed:', error);
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
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
        });
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    longTaskObserverStarted = false;
    console.warn('Long task detection not supported');
  }
}

// Memory usage (Chrome only)
export function getMemoryUsage() {
  if (typeof window === 'undefined') return null;

  const memory = (performance as any).memory;
  if (!memory) return null;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
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
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
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
