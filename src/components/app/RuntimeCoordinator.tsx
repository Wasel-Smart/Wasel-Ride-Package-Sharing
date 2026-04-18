import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { warmUpServer, startAvailabilityPolling } from '../../services/core';
import { logger } from '../../utils/logging';
import { scheduleDeferredTask } from '../../utils/runtimeScheduling';
import { sanitizeForLog } from '../../utils/logSanitizer';

interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
}

export function AppRuntimeCoordinator() {
  const { user, loading } = useAuth();
  const initializationRef = useRef(false);
  const performanceMetricsRef = useRef<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });

  // Initialize core app services
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    const cleanupFns: Array<() => void> = [];

    try {
      logger.info('Initializing Wasel application runtime');

      cleanupFns.push(startAvailabilityPolling(30_000));

      const cancelWarmup = scheduleDeferredTask(async () => {
        try {
          await warmUpServer();
          logger.info('Server warm-up completed');
        } catch (error) {
          logger.warning('Server warm-up failed', { error });
        }
      }, 1000);
      cleanupFns.push(cancelWarmup);

      const stopPerformanceMonitoring = initializePerformanceMonitoring();
      if (stopPerformanceMonitoring) {
        cleanupFns.push(stopPerformanceMonitoring);
      }

      cleanupFns.push(initializeErrorReporting());
    } catch (error) {
      logger.error('Failed to initialize app runtime', { error });
    }

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, []);

  // Monitor authentication state changes
  useEffect(() => {
    if (!loading) {
      logger.info('Authentication state resolved', {
        authenticated: !!user,
        userId: user?.id,
      });

      // Track user session metrics
      if (user) {
        trackUserSession(user.id);
      }
    }
  }, [user, loading]);

  // Performance monitoring initialization
  const initializePerformanceMonitoring = (): (() => void) | undefined => {
    if (typeof window === 'undefined' || !('performance' in window)) return;

    // Web Vitals monitoring
    const observeWebVitals = () => {
      // First Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) {
          performanceMetricsRef.current.fcp = fcp.startTime;
          logger.info('Performance: First Contentful Paint', { fcp: fcp.startTime });
        }
      }).observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          performanceMetricsRef.current.lcp = lastEntry.startTime;
          logger.info('Performance: Largest Contentful Paint', { lcp: lastEntry.startTime });
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime;
            performanceMetricsRef.current.fid = fid;
            logger.info('Performance: First Input Delay', { fid });
          }
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        performanceMetricsRef.current.cls = clsValue;
        logger.info('Performance: Cumulative Layout Shift', { cls: clsValue });
      }).observe({ entryTypes: ['layout-shift'] });

      // Navigation timing
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        performanceMetricsRef.current.ttfb = ttfb;
        logger.info('Performance: Time to First Byte', { ttfb });
      }
    };

    // Defer performance observation to avoid blocking initial render
    scheduleDeferredTask(observeWebVitals, 100);

    // Report performance metrics periodically
    const reportMetrics = () => {
      const metrics = performanceMetricsRef.current;
      if (Object.values(metrics).some(value => value !== null)) {
        logger.info('Performance metrics report', {
          fcp: metrics.fcp,
          lcp: metrics.lcp,
          fid: metrics.fid,
          cls: metrics.cls,
          ttfb: metrics.ttfb,
        });
        
        // Send to analytics if available
        if (typeof window !== 'undefined' && 'gtag' in window) {
          (window as any).gtag('event', 'web_vitals', {
            custom_map: {
              metric_fcp: metrics.fcp,
              metric_lcp: metrics.lcp,
              metric_fid: metrics.fid,
              metric_cls: metrics.cls,
              metric_ttfb: metrics.ttfb,
            },
          });
        }
      }
    };

    // Report metrics after 10 seconds and then every 30 seconds
    scheduleDeferredTask(reportMetrics, 10_000);
    const metricsInterval = setInterval(reportMetrics, 30_000);

    return () => clearInterval(metricsInterval);
  };

  // Error reporting initialization
  const initializeErrorReporting = () => {
    // Global error handler
    const handleGlobalError = (event: ErrorEvent) => {
      logger.error('Global JavaScript error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    // Unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise,
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  };

  // Track user session metrics
  const trackUserSession = (userId: string) => {
    const sessionStart = Date.now();
    
    logger.info('User session started', {
      userId: sanitizeForLog(userId),
      sessionStart,
      userAgent: sanitizeForLog(navigator.userAgent),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
      } : null,
    });

    // Track session duration on page unload
    const handleBeforeUnload = () => {
      const sessionDuration = Date.now() - sessionStart;
      logger.info('User session ended', {
        userId,
        sessionDuration,
        performanceMetrics: {
          fcp: performanceMetricsRef.current.fcp,
          lcp: performanceMetricsRef.current.lcp,
          fid: performanceMetricsRef.current.fid,
          cls: performanceMetricsRef.current.cls,
          ttfb: performanceMetricsRef.current.ttfb,
        },
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  };

  // Monitor memory usage (if available)
  useEffect(() => {
    if (typeof window === 'undefined' || !('performance' in window) || !(performance as any).memory) {
      return;
    }

    const monitorMemory = () => {
      const memory = (performance as any).memory;
      const memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };

      // Log warning if memory usage is high
      if (memoryInfo.usagePercentage > 80) {
        logger.warning('High memory usage detected', memoryInfo);
      } else {
        logger.info('Memory usage', memoryInfo);
      }
    };

    // Monitor memory every 60 seconds
    const memoryInterval = setInterval(monitorMemory, 60_000);
    return () => clearInterval(memoryInterval);
  }, []);

  // This component doesn't render anything
  return null;
}
