import { useCallback, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

/**
 * Optimized navigation hook that prevents navigation lag
 * - Debounces rapid navigation attempts
 * - Uses requestAnimationFrame for smooth transitions
 * - Prevents duplicate navigations
 */
export function useOptimizedNavigate() {
  const navigate = useNavigate();
  const pendingNavRef = useRef<string | null>(null);
  const lastNavTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const optimizedNavigate = useCallback(
    (to: string, options?: { replace?: boolean; state?: unknown }) => {
      const now = Date.now();
      const timeSinceLastNav = now - lastNavTimeRef.current;

      // Prevent duplicate navigation to same path
      if (pendingNavRef.current === to && timeSinceLastNav < 300) {
        return;
      }

      // Cancel any pending navigation
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      pendingNavRef.current = to;
      lastNavTimeRef.current = now;

      // Use requestAnimationFrame for smooth navigation
      rafIdRef.current = requestAnimationFrame(() => {
        navigate(to, options);
        pendingNavRef.current = null;
        rafIdRef.current = null;
      });
    },
    [navigate]
  );

  return optimizedNavigate;
}

/**
 * Hook to detect if user is scrolling (for disabling animations during scroll)
 */
export function useScrollDetection() {
  const scrollingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollingRef.current) {
        document.body.classList.add('scrolling');
        scrollingRef.current = true;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        document.body.classList.remove('scrolling');
        scrollingRef.current = false;
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return scrollingRef.current;
}

/**
 * Hook to optimize touch interactions
 */
export function useTouchOptimization() {
  useEffect(() => {
    // Prevent double-tap zoom on iOS
    let lastTouchEnd = 0;

    const preventDoubleTapZoom = (event: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    };

    document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });

    return () => {
      document.removeEventListener('touchend', preventDoubleTapZoom);
    };
  }, []);
}

/**
 * Hook to optimize button clicks (prevent rapid clicking)
 */
export function useOptimizedClick(
  callback: () => void | Promise<void>,
  delay = 300
) {
  const lastClickRef = useRef<number>(0);
  const isProcessingRef = useRef(false);

  return useCallback(async () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickRef.current;

    // Prevent rapid clicks
    if (timeSinceLastClick < delay || isProcessingRef.current) {
      return;
    }

    lastClickRef.current = now;
    isProcessingRef.current = true;

    try {
      await callback();
    } finally {
      isProcessingRef.current = false;
    }
  }, [callback, delay]);
}

/**
 * Hook to optimize list rendering with virtual scrolling
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const scrollTopRef = useRef(0);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    scrollTopRef.current = event.currentTarget.scrollTop;
  }, []);

  const visibleRange = {
    start: Math.floor(scrollTopRef.current / itemHeight),
    end: Math.ceil((scrollTopRef.current + containerHeight) / itemHeight),
  };

  const visibleItems = items.slice(
    Math.max(0, visibleRange.start - 5), // Buffer above
    Math.min(items.length, visibleRange.end + 5) // Buffer below
  );

  return {
    visibleItems,
    handleScroll,
    totalHeight: items.length * itemHeight,
    offsetY: Math.max(0, visibleRange.start - 5) * itemHeight,
  };
}

/**
 * Hook to debounce rapid state updates
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
