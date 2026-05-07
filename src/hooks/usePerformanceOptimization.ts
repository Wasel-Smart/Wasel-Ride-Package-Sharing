import { useEffect, useCallback, useRef } from 'react';

export function usePerformanceOptimization() {
  const rafId = useRef<number>();
  const scrollTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }
      
      body {
        overscroll-behavior-y: contain;
      }
      
      .scroll-container {
        will-change: scroll-position;
        transform: translateZ(0);
      }
      
      .animate-item {
        will-change: transform, opacity;
      }
      
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const optimizeScroll = useCallback((element: HTMLElement) => {
    if (!element) return;

    element.style.willChange = 'scroll-position';
    element.style.transform = 'translateZ(0)';
    
    const handleScroll = () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      
      scrollTimeout.current = setTimeout(() => {
        element.style.willChange = 'auto';
      }, 150);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  const debounce = useCallback(<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  const throttle = useCallback(<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }, []);

  const requestIdleCallback = useCallback((callback: () => void) => {
    if ('requestIdleCallback' in window) {
      return window.requestIdleCallback(callback);
    }
    return setTimeout(callback, 1);
  }, []);

  const cancelIdleCallback = useCallback((id: number) => {
    if ('cancelIdleCallback' in window) {
      window.cancelIdleCallback(id);
    } else {
      clearTimeout(id);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  return {
    optimizeScroll,
    debounce,
    throttle,
    requestIdleCallback,
    cancelIdleCallback,
  };
}

export function useLazyLoad(threshold = 0.1) {
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const src = target.dataset.src;
            
            if (src) {
              if (target instanceof HTMLImageElement) {
                target.src = src;
              } else {
                target.style.backgroundImage = `url(${src})`;
              }
              
              target.removeAttribute('data-src');
              observerRef.current?.unobserve(target);
            }
          }
        });
      },
      { threshold, rootMargin: '50px' }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold]);

  const observe = useCallback((element: HTMLElement | null) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  }, []);

  return { observe };
}

export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const scrollTop = useRef(0);
  const visibleStart = Math.floor(scrollTop.current / itemHeight);
  const visibleEnd = Math.ceil((scrollTop.current + containerHeight) / itemHeight);
  const buffer = 3;

  const visibleItems = items.slice(
    Math.max(0, visibleStart - buffer),
    Math.min(items.length, visibleEnd + buffer)
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = Math.max(0, visibleStart - buffer) * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    scrollTop.current = e.currentTarget.scrollTop;
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
}
