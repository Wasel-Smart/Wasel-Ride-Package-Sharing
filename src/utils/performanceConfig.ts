/**
 * Performance Optimization Configuration
 * Implements smooth scrolling, lazy loading, and navigation optimization
 */

import { publicSupabaseUrl } from './supabase/info';

export const PERFORMANCE_CONFIG = {
  // Scroll optimization
  scroll: {
    behavior: 'smooth' as ScrollBehavior,
    debounceMs: 150,
    throttleMs: 16,
    intersectionThreshold: 0.1,
    rootMargin: '50px',
  },

  // Image lazy loading
  images: {
    loading: 'lazy' as 'lazy' | 'eager',
    decoding: 'async' as 'async' | 'sync' | 'auto',
    fetchPriority: 'low' as 'high' | 'low' | 'auto',
  },

  // Virtual scrolling
  virtualScroll: {
    itemHeight: 80,
    buffer: 3,
    overscan: 2,
  },

  // Animation
  animation: {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
  },

  // Network
  network: {
    timeout: 30000,
    retries: 3,
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
};

// Apply global performance optimizations
export function applyGlobalOptimizations() {
  // Prevent layout thrashing without altering native scroll/touch semantics.
  const style = document.createElement('style');
  style.textContent = `
    button, a, input, textarea, select, [role="button"] {
      -webkit-overflow-scrolling: touch;
      -webkit-tap-highlight-color: transparent;
    }
    
    body {
      overscroll-behavior-x: none;
      overscroll-behavior-y: auto;
    }
    
    .scroll-container {
      will-change: scroll-position;
    }
    
    .animate-item {
      will-change: transform, opacity;
    }
    
    img {
      content-visibility: auto;
      contain-intrinsic-size: 300px 200px;
    }
    
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Optimize font loading
  if ('fonts' in document) {
    document.fonts.ready.then(() => {
      document.body.classList.add('fonts-loaded');
    });
  }

  // Preconnect to critical origins
  const origins = [
    publicSupabaseUrl,
    'https://maps.googleapis.com',
    'https://js.stripe.com',
  ];

  origins.forEach((origin) => {
    if (!origin) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Request idle callback polyfill
export const requestIdleCallback =
  window.requestIdleCallback ||
  function (cb: IdleRequestCallback) {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1) as any;
  };

export const cancelIdleCallback =
  window.cancelIdleCallback ||
  function (id: number) {
    clearTimeout(id);
  };
