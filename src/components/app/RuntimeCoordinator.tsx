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

type FirstInputPerformanceEntry = PerformanceEntry & {
  processingStart: number;
};

type LayoutShiftPerformanceEntry = PerformanceEntry & {
  hadRecentInput?: boolean;
  value?: number;
};

type PerformanceWithMemory = Performance & {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
};

type WindowWithAnalytics = Window & {
  gtag?: (command: 'event', name: string, params: Record<string, unknown>) => void;
};

function supportsPerformanceObserver(entryType: string) {
  return typeof PerformanceObserver !== 'undefined'
    && Array.isArray(PerformanceObserver.supportedEntryTypes)
    && PerformanceObserver.supportedEntryTypes.includes(entryType);
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

      if (user) {
        return trackUserSession(user.id);
      }
    }

    return undefined;
  }, [user, loading]);

  const initializePerformanceMonitoring = (): (() => void) | undefined => {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return;
    }

    const observers: PerformanceObserver[] = [];
    const cleanupFns: Array<() => void> = [];

    const observeWebVitals = () => {
      if (supportsPerformanceObserver('paint')) {
        const paintObserver = new PerformanceObserver((list) => {
          const fcp = list.getEntries().find((entry) => entry.name === 'first-contentful-paint');
          if (fcp) {
            performanceMetricsRef.current.fcp = fcp.startTime;
            logger.info('Performance: First Contentful Paint', { fcp: fcp.startTime });
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        observers.push(paintObserver);
      }

      if (supportsPerformanceObserver('largest-contentful-paint')) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            performanceMetricsRef.current.lcp = lastEntry.startTime;
            logger.info('Performance: Largest Contentful Paint', { lcp: lastEntry.startTime });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        observers.push(lcpObserver);

        const stopLcpTracking = () => lcpObserver.disconnect();
        document.addEventListener('visibilitychange', stopLcpTracking, { once: true });
        cleanupFns.push(() => {
          document.removeEventListener('visibilitychange', stopLcpTracking);
        });
      }

      if (supportsPerformanceObserver('first-input')) {
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const firstInputEntry = entry as FirstInputPerformanceEntry;
            if (firstInputEntry.processingStart && firstInputEntry.startTime) {
              const fid = firstInputEntry.processingStart - firstInputEntry.startTime;
              performanceMetricsRef.current.fid = fid;
              logger.info('Performance: First Input Delay', { fid });
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        observers.push(fidObserver);
      }

      if (supportsPerformanceObserver('layout-shift')) {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const layoutShiftEntry = entry as LayoutShiftPerformanceEntry;
            if (!layoutShiftEntry.hadRecentInput && typeof layoutShiftEntry.value === 'number') {
              clsValue += layoutShiftEntry.value;
            }
          });
          performanceMetricsRef.current.cls = clsValue;
          logger.info('Performance: Cumulative Layout Shift', { cls: clsValue });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        observers.push(clsObserver);
      }

      const navigationEntry = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        performanceMetricsRef.current.ttfb = ttfb;
        logger.info('Performance: Time to First Byte', { ttfb });
      }
    };

    const cancelObserveWebVitals = scheduleDeferredTask(observeWebVitals, 100);

    const reportMetrics = () => {
      const metrics = performanceMetricsRef.current;
      if (Object.values(metrics).some((value) => value !== null)) {
        logger.info('Performance metrics report', {
          fcp: metrics.fcp,
          lcp: metrics.lcp,
          fid: metrics.fid,
          cls: metrics.cls,
          ttfb: metrics.ttfb,
        });

        const analyticsWindow = window as WindowWithAnalytics;
        if (typeof analyticsWindow.gtag === 'function') {
          analyticsWindow.gtag('event', 'web_vitals', {
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

    const cancelInitialReport = scheduleDeferredTask(reportMetrics, 10_000);
    const metricsInterval = setInterval(reportMetrics, 30_000);

    return () => {
      cancelObserveWebVitals();
      cancelInitialReport();
      cleanupFns.forEach((cleanup) => cleanup());
      observers.forEach((observer) => observer.disconnect());
      clearInterval(metricsInterval);
    };
  };

  const initializeErrorReporting = () => {
    const handleGlobalError = (event: ErrorEvent) => {
      logger.error('Global JavaScript error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

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
      connection: 'connection' in navigator
        ? {
            downlink: (navigator as Navigator & {
              connection?: { downlink?: number; effectiveType?: string; rtt?: number };
            }).connection?.downlink,
            effectiveType: (navigator as Navigator & {
              connection?: { downlink?: number; effectiveType?: string; rtt?: number };
            }).connection?.effectiveType,
            rtt: (navigator as Navigator & {
              connection?: { downlink?: number; effectiveType?: string; rtt?: number };
            }).connection?.rtt,
          }
        : null,
    });

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
    const runtimePerformance = performance as PerformanceWithMemory;
    if (typeof window === 'undefined' || !('performance' in window) || !runtimePerformance.memory) {
      return;
    }

    const monitorMemory = () => {
      const memory = runtimePerformance.memory;
      if (!memory) {
        return;
      }

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

    const memoryInterval = setInterval(monitorMemory, 60_000);
    return () => clearInterval(memoryInterval);
  }, []);

  return null;
}
