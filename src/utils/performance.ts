/**
 * Performance Utilities
 *
 * Memoization, debouncing, throttling, and virtualization helpers
 * for optimizing React rendering and expensive computations.
 */

// ─── Memoization ──────────────────────────────────────────────────────────────

/**
 * Creates a memoized version of a function with a cache.
 * Supports custom cache key generation and TTL.
 */
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  options: {
    keyGenerator?: (...args: TArgs) => string;
    maxSize?: number;
    ttl?: number;
  } = {},
): (...args: TArgs) => TResult {
  const { keyGenerator, maxSize = 100, ttl } = options;
  const cache = new Map<string, { value: TResult; timestamp: number }>();
  const defaultKeyGenerator = (...args: TArgs): string => JSON.stringify(args);

  return (...args: TArgs): TResult => {
    const key = (keyGenerator ?? defaultKeyGenerator)(...args);
    const cached = cache.get(key);

    if (cached) {
      if (!ttl || Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }
      cache.delete(key);
    }

    const result = fn(...args);

    // Evict oldest entries if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, { value: result, timestamp: Date.now() });
    return result;
  };
}

/**
 * Creates a singleton memoizer — caches only the last result.
 * Useful for functions called repeatedly with the same arguments.
 */
export function memoizeLast<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  let lastArgs: TArgs | null = null;
  let lastResult: TResult;
  let hasResult = false;

  return (...args: TArgs): TResult => {
    if (hasResult && lastArgs && shallowEqual(args, lastArgs)) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn(...args);
    hasResult = true;
    return lastResult;
  };
}

// ─── Debounce & Throttle ──────────────────────────────────────────────────────

/**
 * Creates a debounced function that delays execution until after
 * the specified wait time has elapsed since the last invocation.
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {},
): (...args: TArgs) => void {
  const { leading = false, trailing = true, maxWait } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number | null = null;
  let lastArgs: TArgs | null = null;

  const invoke = (args: TArgs) => {
    fn(...args);
    lastCallTime = Date.now();
    maxTimeoutId = null;
  };

  return (...args: TArgs): void => {
    lastArgs = args;
    const now = Date.now();
    const isInvoking = leading && !timeoutId;

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (trailing && lastArgs) {
        invoke(lastArgs);
      }
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
        maxTimeoutId = null;
      }
    }, wait);

    if (maxWait && !maxTimeoutId && lastCallTime) {
      maxTimeoutId = setTimeout(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (lastArgs) {
          invoke(lastArgs);
        }
      }, maxWait - (now - lastCallTime));
    }

    if (isInvoking) {
      invoke(args);
    }
  };
}

/**
 * Creates a throttled function that only invokes at most once
 * per specified wait period.
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): (...args: TArgs) => void {
  const { leading = true, trailing = true } = options;
  let lastInvokeTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const invoke = (args: TArgs) => {
    fn(...args);
    lastInvokeTime = Date.now();
  };

  return (...args: TArgs): void => {
    const now = Date.now();
    const remaining = wait - (now - lastInvokeTime);
    lastArgs = args;

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (leading) {
        invoke(args);
      }
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (lastArgs && trailing) {
          invoke(lastArgs);
        }
      }, remaining);
    }
  };
}

// ─── Virtualization ───────────────────────────────────────────────────────────

export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
}

/**
 * Calculates the visible window for virtual scrolling.
 * Only renders items that are visible in the viewport.
 */
export function calculateVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  itemCount: number,
  itemHeight: number,
  overscan = 5,
): VirtualWindow {
  const totalHeight = itemCount * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(itemCount, startIndex + visibleCount);
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY, totalHeight };
}

/**
 * Calculates the visible window for variable-height virtual scrolling.
 */
export function calculateVariableVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  itemHeights: number[],
  overscan = 5,
): VirtualWindow {
  const totalHeight = itemHeights.reduce((sum, h) => sum + h, 0);
  let accumulatedHeight = 0;
  let startIndex = 0;

  // Find start index
  for (let i = 0; i < itemHeights.length; i++) {
    const height = itemHeights[i] ?? 0;
    if (accumulatedHeight + height > scrollTop) {
      startIndex = Math.max(0, i - overscan);
      break;
    }
    accumulatedHeight += height;
  }

  // Find end index
  let endIndex = startIndex;
  let visibleHeight = 0;
  const startOffset = itemHeights.slice(0, startIndex).reduce((sum, h) => sum + (h ?? 0), 0);

  for (let i = startIndex; i < itemHeights.length; i++) {
    const height = itemHeights[i] ?? 0;
    visibleHeight += height;
    endIndex = i + 1;
    if (visibleHeight > viewportHeight + overscan * height) break;
  }

  return {
    startIndex,
    endIndex: Math.min(itemHeights.length, endIndex + overscan),
    offsetY: startOffset,
    totalHeight,
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Shallow equality check for arrays.
 */
function shallowEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * RequestIdleCallback polyfill with fallback to setTimeout.
 */
export function scheduleIdleTask(
  callback: () => void,
  options?: { timeout?: number },
): () => void {
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(callback, options);
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, options?.timeout ?? 1);
  return () => clearTimeout(id);
}

/**
 * Batches multiple state updates into a single microtask.
 */
export function batchTasks(tasks: Array<() => void>): void {
  if (typeof queueMicrotask !== 'undefined') {
    queueMicrotask(() => tasks.forEach(t => t()));
  } else {
    Promise.resolve().then(() => tasks.forEach(t => t()));
  }
}

/**
 * Creates a function that will only execute after being called
 * a specified number of times (coalesce pattern).
 */
export function coalesce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  count: number,
): (...args: TArgs) => void {
  let callCount = 0;

  return (...args: TArgs): void => {
    callCount++;
    if (callCount >= count) {
      fn(...args);
      callCount = 0;
    }
  };
}

// ─── Performance Monitoring ───────────────────────────────────────────────────

/**
 * Initializes performance monitoring observers.
 * Sets up LCP, FID, CLS, and FCP observers for Core Web Vitals tracking.
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        console.debug('[perf] LCP:', lastEntry.startTime);
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay (FID) / Interaction to Next Paint (INP)
    const fidObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const delay = (entry as PerformanceEventTiming).processingStart - entry.startTime;
        if (delay > 0) {
          console.debug('[perf] FID:', delay);
        }
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as PerformanceEntry & { hadRecentInput: boolean }).hadRecentInput) {
          clsValue += (entry as PerformanceEntry & { value: number }).value;
        }
      }
      console.debug('[perf] CLS:', clsValue);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Performance observers not supported — silent fail
  }
}
