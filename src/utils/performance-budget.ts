/**
 * Web Vitals & Performance Budget Configuration
 * Defines thresholds and enforcement rules for performance monitoring
 */

/**
 * Web Vitals thresholds (Google recommended values)
 */
export const WEB_VITALS_THRESHOLDS = {
  // Largest Contentful Paint (LCP) - should be <= 2.5s
  LCP: {
    good: 2500,
    needsImprovement: 4000,
    poor: 4000,
  } as const,

  // First Input Delay (FID) - should be <= 100ms
  FID: {
    good: 100,
    needsImprovement: 300,
    poor: 300,
  } as const,

  // Cumulative Layout Shift (CLS) - should be <= 0.1
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
    poor: 0.25,
  } as const,

  // Time to First Byte (TTFB) - should be <= 600ms
  TTFB: {
    good: 600,
    needsImprovement: 1800,
    poor: 1800,
  } as const,

  // First Contentful Paint (FCP) - should be <= 1.8s
  FCP: {
    good: 1800,
    needsImprovement: 3000,
    poor: 3000,
  } as const,

  // Interaction to Next Paint (INP) - should be <= 200ms
  INP: {
    good: 200,
    needsImprovement: 500,
    poor: 500,
  } as const,
} as const;

/**
 * Performance budget thresholds (bytes)
 */
export const BUNDLE_SIZE_BUDGET = {
  // Total JS bundle
  totalJS: {
    budget: 500 * 1024, // 500 KB
    warning: 450 * 1024,
  },

  // Critical chunks
  reactCore: {
    budget: 150 * 1024, // 150 KB
    warning: 130 * 1024,
  },

  uiPrimitives: {
    budget: 120 * 1024, // 120 KB
    warning: 100 * 1024,
  },

  dataLayer: {
    budget: 100 * 1024, // 100 KB
    warning: 85 * 1024,
  },

  // Per-route budget
  pageChunk: {
    budget: 80 * 1024, // 80 KB per page
    warning: 70 * 1024,
  },
} as const;

/**
 * Performance configuration
 */
export const PERFORMANCE_CONFIG = {
  // Enable Web Vitals tracking
  trackWebVitals: true,

  // Sampling rate for Sentry errors (0-1)
  sentryErrorSamplingRate: import.meta.env.PROD ? 0.2 : 1.0,

  // Sampling rate for performance monitoring (0-1)
  sentryPerformanceSamplingRate: import.meta.env.PROD ? 0.1 : 1.0,

  // Long task monitoring
  enableLongTaskMonitoring: true,
  longTaskThreshold: 50, // milliseconds

  // Performance observer options
  performanceObserverOptions: {
    entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'],
  },

  // Cache strategy timeouts
  httpCacheTime: 3600 * 1000, // 1 hour
  staleWhileRevalidateTime: 86400 * 1000, // 1 day
} as const;

/**
 * Check if metric meets performance budget
 */
export function isWithinBudget(metric: string, value: number, budget: number): boolean {
  return value <= budget;
}

/**
 * Check if metric triggers warning
 */
export function shouldWarn(metric: string, value: number, warning: number): boolean {
  return value > warning;
}

/**
 * Get performance assessment
 */
export function assessPerformance(metric: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP', value: number): 'good' | 'needsImprovement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[metric];

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needsImprovement';
  return 'poor';
}

/**
 * Format performance message
 */
export function formatPerformanceMessage(metric: string, value: number, threshold: number): string {
  const status = value <= threshold ? 'PASS' : 'FAIL';
  return `[${status}] ${metric}: ${value.toFixed(2)} (limit: ${threshold.toFixed(2)})`;
}

/**
 * Validate bundle size against budget
 */
export function validateBundleSize(bundleMetrics: Record<string, number>): {
  valid: boolean;
  violations: string[];
  warnings: string[];
} {
  const violations: string[] = [];
  const warnings: string[] = [];

  for (const [chunk, size] of Object.entries(bundleMetrics)) {
    const budgetConfig = BUNDLE_SIZE_BUDGET[chunk as keyof typeof BUNDLE_SIZE_BUDGET];
    if (!budgetConfig) continue;

    if (size > budgetConfig.budget) {
      violations.push(`${chunk}: ${(size / 1024).toFixed(2)}KB exceeds budget of ${(budgetConfig.budget / 1024).toFixed(2)}KB`);
    } else if (size > budgetConfig.warning) {
      warnings.push(`${chunk}: ${(size / 1024).toFixed(2)}KB approaching budget limit`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Performance monitoring configuration for CI/CD
 */
export const PERFORMANCE_CI_RULES = {
  // Fail build if performance regression exceeds threshold
  lcpRegressionThreshold: 500, // ms increase
  clsRegressionThreshold: 0.05,
  bundleSizeRegressionThreshold: 50 * 1024, // 50 KB

  // Fail build if absolute performance is poor
  failOnPoorWeb Vitals: true,

  // Track performance over time
  enablePerformanceTrending: true,
  performanceTrendingHistorySize: 30, // last 30 builds
} as const;
