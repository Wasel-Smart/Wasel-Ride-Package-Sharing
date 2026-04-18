/**
 * Performance Budget Configuration
 * Defines acceptable performance thresholds for production
 */

export const PERFORMANCE_BUDGET = {
  // Bundle size limits (KB)
  bundleSize: {
    total: 2048,      // 2MB total
    javascript: 1024, // 1MB JS
    css: 256,         // 256KB CSS
    images: 512,      // 512KB images
    fonts: 256,       // 256KB fonts
  },

  // Core Web Vitals thresholds (ms)
  webVitals: {
    // First Contentful Paint
    fcp: {
      good: 1800,
      poor: 3000,
    },
    // Largest Contentful Paint
    lcp: {
      good: 2500,
      poor: 4000,
    },
    // First Input Delay
    fid: {
      good: 100,
      poor: 300,
    },
    // Cumulative Layout Shift
    cls: {
      good: 0.1,
      poor: 0.25,
    },
    // Time to First Byte
    ttfb: {
      good: 800,
      poor: 1800,
    },
  },

  // Network performance
  network: {
    // Time to Interactive (ms)
    tti: {
      good: 3800,
      poor: 7300,
    },
    // Speed Index (ms)
    speedIndex: {
      good: 3400,
      poor: 5800,
    },
  },

  // Lighthouse scores (0-100)
  lighthouse: {
    performance: 90,
    accessibility: 95,
    bestPractices: 90,
    seo: 95,
    pwa: 85,
  },

  // Resource limits
  resources: {
    maxRequests: 50,        // Maximum HTTP requests
    maxDomElements: 1500,   // Maximum DOM elements
    maxMemoryMB: 50,        // Maximum memory usage (MB)
  },
};

export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals for monitoring
  FCP: PERFORMANCE_BUDGET.webVitals.fcp.good,
  LCP: PERFORMANCE_BUDGET.webVitals.lcp.good,
  FID: PERFORMANCE_BUDGET.webVitals.fid.good,
  CLS: PERFORMANCE_BUDGET.webVitals.cls.good,
  TTFB: PERFORMANCE_BUDGET.webVitals.ttfb.good,
  
  // Additional metrics
  TTI: PERFORMANCE_BUDGET.network.tti.good,
  SPEED_INDEX: PERFORMANCE_BUDGET.network.speedIndex.good,
};

export function validatePerformanceMetrics(metrics) {
  const violations = [];
  
  // Check Core Web Vitals
  if (metrics.fcp > PERFORMANCE_BUDGET.webVitals.fcp.poor) {
    violations.push(`FCP: ${metrics.fcp}ms exceeds ${PERFORMANCE_BUDGET.webVitals.fcp.poor}ms`);
  }
  
  if (metrics.lcp > PERFORMANCE_BUDGET.webVitals.lcp.poor) {
    violations.push(`LCP: ${metrics.lcp}ms exceeds ${PERFORMANCE_BUDGET.webVitals.lcp.poor}ms`);
  }
  
  if (metrics.fid > PERFORMANCE_BUDGET.webVitals.fid.poor) {
    violations.push(`FID: ${metrics.fid}ms exceeds ${PERFORMANCE_BUDGET.webVitals.fid.poor}ms`);
  }
  
  if (metrics.cls > PERFORMANCE_BUDGET.webVitals.cls.poor) {
    violations.push(`CLS: ${metrics.cls} exceeds ${PERFORMANCE_BUDGET.webVitals.cls.poor}`);
  }
  
  if (metrics.ttfb > PERFORMANCE_BUDGET.webVitals.ttfb.poor) {
    violations.push(`TTFB: ${metrics.ttfb}ms exceeds ${PERFORMANCE_BUDGET.webVitals.ttfb.poor}ms`);
  }
  
  return violations;
}