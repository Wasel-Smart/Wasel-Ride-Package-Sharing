/**
 * Performance Optimization Configuration
 * Implements smooth scrolling, lazy loading, and navigation optimization
 */

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
  // Passive event listeners
  const passiveSupported = (() => {
    let supported = false;
    try {
      const options = {
        get passive() {
          supported = true;
          return false;
        },
      };
      window.addEventListener('test', null as any, options);
      window.removeEventListener('test', null as any, options);
    } catch (err) {
      supported = false;
    }
    return supported;
  })();

  if (passiveSupported) {
    ['touchstart', 'touchmove', 'wheel', 'mousewheel'].forEach((event) => {
      document.addEventListener(event, () => {}, { passive: true } as AddEventListenerOptions);
    });
  }

  // Prevent layout thrashing
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-overflow-scrolling: touch;
      -webkit-tap-highlight-color: transparent;
    }
    
    body {
      overscroll-behavior-y: contain;
      scroll-behavior: smooth;
    }
    
    .scroll-container {
      will-change: scroll-position;
      transform: translateZ(0);
      -webkit-transform: translateZ(0);
    }
    
    .animate-item {
      will-change: transform, opacity;
    }
    
    img {
      content-visibility: auto;
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
    import.meta.env.VITE_SUPABASE_URL,
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
