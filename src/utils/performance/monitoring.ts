/**
 * Performance Monitoring - Wasel | واصل
 * 
 * Comprehensive performance tracking including:
 * - Core Web Vitals (CLS, FID, FCP, LCP, TTFB)
 * - Bundle size monitoring
 * - Runtime performance metrics
 * - Memory usage tracking
 * - Network performance
 */

import { logger } from '../enhanced-logging';
import { sanitizeForLog } from '../logSanitizer';

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

interface PerformanceMetrics {
  // Core Web Vitals
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
  
  // Additional metrics
  domContentLoaded: number | null;
  loadComplete: number | null;
  memoryUsage: number | null;
  connectionType: string | null;
  
  // Bundle metrics
  bundleSize: number | null;
  chunkCount: number | null;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    domContentLoaded: null,
    loadComplete: null,
    memoryUsage: null,
    connectionType: null,
    bundleSize: null,
    chunkCount: null,
  };

  private observers: PerformanceObserver[] = [];
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {return;}
    this.isInitialized = true;

    // Initialize all performance observers
    this.observePaintMetrics();
    this.observeLargestContentfulPaint();
    this.observeFirstInputDelay();
    this.observeCumulativeLayoutShift();
    this.observeNavigationTiming();
    this.observeMemoryUsage();
    this.observeNetworkInformation();
    this.observeResourceTiming();

    // Set up periodic reporting
    this.setupPeriodicReporting();

    logger.info('Performance monitoring initialized', { important: true });
  }

  private observePaintMetrics(): void {
    if (!('PerformanceObserver' in window)) {return;}

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
        
        if (fcp) {
          this.metrics.fcp = fcp.startTime;
          this.reportMetric('FCP', fcp.startTime, this.getRating('fcp', fcp.startTime));
        }
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warning('Failed to observe paint metrics', { error });
    }
  }

  private observeLargestContentfulPaint(): void {
    if (!('PerformanceObserver' in window)) {return;}

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        if (lastEntry) {
          this.metrics.lcp = lastEntry.startTime;
          this.reportMetric('LCP', lastEntry.startTime, this.getRating('lcp', lastEntry.startTime));
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warning('Failed to observe LCP', { error });
    }
  }

  private observeFirstInputDelay(): void {
    if (!('PerformanceObserver' in window)) {return;}

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime;
            this.metrics.fid = fid;
            this.reportMetric('FID', fid, this.getRating('fid', fid));
          }
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warning('Failed to observe FID', { error });
    }
  }

  private observeCumulativeLayoutShift(): void {
    if (!('PerformanceObserver' in window)) {return;}

    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        this.metrics.cls = clsValue;
        this.reportMetric('CLS', clsValue, this.getRating('cls', clsValue));
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warning('Failed to observe CLS', { error });
    }
  }

  private observeNavigationTiming(): void {
    if (!('performance' in window) || !performance.getEntriesByType) {return;}

    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navigationEntries.length === 0) {return;}

    const entry = navigationEntries[0];
    if (!entry) {return;}
    
    // Time to First Byte
    const ttfb = entry.responseStart - entry.requestStart;
    this.metrics.ttfb = ttfb;
    this.reportMetric('TTFB', ttfb, this.getRating('ttfb', ttfb));

    // DOM Content Loaded
    const domContentLoaded = entry.domContentLoadedEventEnd - entry.startTime;
    this.metrics.domContentLoaded = domContentLoaded;

    // Load Complete
    const loadComplete = entry.loadEventEnd - entry.startTime;
    this.metrics.loadComplete = loadComplete;

    logger.info('Navigation timing captured', {
      ttfb,
      domContentLoaded,
      loadComplete,
      important: ttfb > 800 || domContentLoaded > 3000,
    });
  }

  private observeMemoryUsage(): void {
    if (!('performance' in window) || !(performance as any).memory) {return;}

    const updateMemoryUsage = () => {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
      
      this.metrics.memoryUsage = usedMB;
      
      const usagePercentage = (usedMB / limitMB) * 100;
      
      if (usagePercentage > 80) {
        logger.warning('High memory usage detected', {
          usedMB,
          totalMB,
          limitMB,
          usagePercentage: Math.round(usagePercentage),
          important: true,
        });
      }
    };

    // Update immediately and then every 30 seconds
    updateMemoryUsage();
    setInterval(updateMemoryUsage, 30_000);
  }

  private observeNetworkInformation(): void {
    if (!('navigator' in window) || !(navigator as any).connection) {return;}

    const connection = (navigator as any).connection;
    this.metrics.connectionType = connection.effectiveType || connection.type || 'unknown';

    logger.info('Network information captured', {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    });
  }

  private observeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) {return;}

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        let totalSize = 0;
        let jsChunks = 0;

        entries.forEach((entry: any) => {
          if (entry.transferSize) {
            totalSize += entry.transferSize;
          }
          
          if (entry.name.includes('.js') && entry.name.includes('assets')) {
            jsChunks++;
          }
        });

        if (totalSize > 0) {
          this.metrics.bundleSize = Math.round(totalSize / 1024); // KB
          this.metrics.chunkCount = jsChunks;
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      logger.warning('Failed to observe resource timing', { error });
    }
  }

  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) {return 'good';}

    if (value <= threshold.good) {return 'good';}
    if (value <= threshold.poor) {return 'needs-improvement';}
    return 'poor';
  }

  private reportMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    const context = {
      metric: name,
      value: Math.round(value * 100) / 100,
      rating,
      important: rating === 'poor',
    };

    if (rating === 'poor') {
      logger.warning(`Poor ${sanitizeForLog(name)} performance`, context);
    } else {
      logger.info(`${sanitizeForLog(name)} measured`, context);
    }

    // Send to analytics if available
    this.sendToAnalytics(name, value, rating);
  }

  private sendToAnalytics(name: string, value: number, rating: string): void {
    if (typeof window === 'undefined') {return;}

    // Google Analytics 4
    if ('gtag' in window) {
      (window as any).gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: name,
        value: Math.round(value),
        custom_parameter_1: rating,
      });
    }

    // Vercel Analytics
    if ('va' in window) {
      (window as any).va('track', 'Web Vitals', {
        metric: name,
        value: Math.round(value),
        rating,
      });
    }
  }

  private setupPeriodicReporting(): void {
    // Report comprehensive metrics every 30 seconds
    const reportInterval = setInterval(() => {
      this.reportComprehensiveMetrics();
    }, 30_000);

    // Report final metrics on page unload
    const handleBeforeUnload = () => {
      clearInterval(reportInterval);
      this.reportComprehensiveMetrics();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  private reportComprehensiveMetrics(): void {
    const nonNullMetrics = Object.entries(this.metrics)
      .filter(([, value]) => value !== null)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(nonNullMetrics).length > 0) {
      logger.info('Performance metrics report', {
        ...nonNullMetrics,
        important: true,
      });
    }
  }

  // Public API
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getWebVitalsScore(): number {
    const { fcp, lcp, fid, cls, ttfb } = this.metrics;
    let score = 0;
    let count = 0;

    if (fcp !== null) {
      score += this.getRating('fcp', fcp) === 'good' ? 100 : this.getRating('fcp', fcp) === 'needs-improvement' ? 50 : 0;
      count++;
    }
    if (lcp !== null) {
      score += this.getRating('lcp', lcp) === 'good' ? 100 : this.getRating('lcp', lcp) === 'needs-improvement' ? 50 : 0;
      count++;
    }
    if (fid !== null) {
      score += this.getRating('fid', fid) === 'good' ? 100 : this.getRating('fid', fid) === 'needs-improvement' ? 50 : 0;
      count++;
    }
    if (cls !== null) {
      score += this.getRating('cls', cls) === 'good' ? 100 : this.getRating('cls', cls) === 'needs-improvement' ? 50 : 0;
      count++;
    }
    if (ttfb !== null) {
      score += this.getRating('ttfb', ttfb) === 'good' ? 100 : this.getRating('ttfb', ttfb) === 'needs-improvement' ? 50 : 0;
      count++;
    }

    return count > 0 ? Math.round(score / count) : 0;
  }

  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export function measureAsync<T>(
  label: string,
  asyncFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  return asyncFn().then(
    (result) => {
      const duration = performance.now() - start;
      logger.info(`Async operation: ${label}`, {
        duration: Math.round(duration * 100) / 100,
        success: true,
      });
      return result;
    },
    (error) => {
      const duration = performance.now() - start;
      logger.warning(`Async operation failed: ${label}`, {
        duration: Math.round(duration * 100) / 100,
        success: false,
        error,
      });
      throw error;
    }
  );
}

export function measureSync<T>(label: string, syncFn: () => T): T {
  const start = performance.now();
  
  try {
    const result = syncFn();
    const duration = performance.now() - start;
    
    logger.info(`Sync operation: ${label}`, {
      duration: Math.round(duration * 100) / 100,
      success: true,
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    logger.warning(`Sync operation failed: ${label}`, {
      duration: Math.round(duration * 100) / 100,
      success: false,
      error,
    });
    
    throw error;
  }
}

// React hook for component performance monitoring
export function useComponentPerformance(componentName: string) {
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    logger.info(`Component render: ${componentName}`, {
      duration: Math.round(duration * 100) / 100,
    });
  };
}

// Export types
export type { PerformanceMetrics, WebVitalsMetric };
