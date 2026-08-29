import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Performance Utilities Tests ──────────────────────────────────────────────

describe('Performance Utilities', () => {
  describe('memoize', () => {
    it('caches function results', async () => {
      const { memoize } = await import('../../src/utils/performance');
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('uses custom key generator', async () => {
      const { memoize } = await import('../../src/utils/performance');
      const fn = vi.fn((a: number, b: number) => a + b);
      const memoized = memoize(fn, { keyGenerator: (a: number, b: number) => `${a}-${b}` });

      expect(memoized(1, 2)).toBe(3);
      expect(memoized(1, 2)).toBe(3);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('respects maxSize limit', async () => {
      const { memoize } = await import('../../src/utils/performance');
      const fn = vi.fn((x: number) => x);
      const memoized = memoize(fn, { maxSize: 2 });

      memoized(1);
      memoized(2);
      memoized(3); // Should evict 1
      memoized(1); // Should recompute

      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('respects TTL', async () => {
      const { memoize } = await import('../../src/utils/performance');
      const fn = vi.fn((x: number) => x);
      const memoized = memoize(fn, { ttl: 50 });

      memoized(1);
      memoized(1);
      expect(fn).toHaveBeenCalledTimes(1);

      await new Promise(resolve => setTimeout(resolve, 60));
      memoized(1);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('memoizeLast', () => {
    it('returns cached result for same args', async () => {
      const { memoizeLast } = await import('../../src/utils/performance');
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoizeLast(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('recomputes for different args', async () => {
      const { memoizeLast } = await import('../../src/utils/performance');
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoizeLast(fn);

      expect(memoized(5)).toBe(10);
      expect(memoized(10)).toBe(20);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('delays execution', async () => {
      const { debounce } = await import('../../src/utils/performance');
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('resets timer on subsequent calls', async () => {
      const { debounce } = await import('../../src/utils/performance');
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('supports leading edge', async () => {
      const { debounce } = await import('../../src/utils/performance');
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true });

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('limits execution rate', async () => {
      const { throttle } = await import('../../src/utils/performance');
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('calculateVirtualWindow', () => {
    it('calculates correct window for fixed height items', async () => {
      const { calculateVirtualWindow } = await import('../../src/utils/performance');

      const result = calculateVirtualWindow(100, 200, 1000, 50, 3);

      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBeGreaterThan(0);
      expect(result.totalHeight).toBe(50000);
    });

    it('handles scroll position in middle of list', async () => {
      const { calculateVirtualWindow } = await import('../../src/utils/performance');

      const result = calculateVirtualWindow(5000, 200, 1000, 50, 5);

      expect(result.startIndex).toBeGreaterThan(0);
      expect(result.endIndex).toBeGreaterThan(result.startIndex);
    });

    it('respects overscan', async () => {
      const { calculateVirtualWindow } = await import('../../src/utils/performance');

      const result = calculateVirtualWindow(0, 200, 1000, 50, 10);

      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBeLessThanOrEqual(1000);
    });
  });

  describe('coalesce', () => {
    it('executes after specified count', async () => {
      const { coalesce } = await import('../../src/utils/performance');
      const fn = vi.fn();
      const coalesced = coalesce(fn, 3);

      coalesced();
      coalesced();
      expect(fn).not.toHaveBeenCalled();

      coalesced();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('scheduleIdleTask', () => {
    it('schedules task and returns cancel function', async () => {
      const { scheduleIdleTask } = await import('../../src/utils/performance');
      const fn = vi.fn();

      const cancel = scheduleIdleTask(fn);
      expect(typeof cancel).toBe('function');

      // Wait for idle callback
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('batchTasks', () => {
    it('batches tasks in microtask', async () => {
      const { batchTasks } = await import('../../src/utils/performance');
      const tasks = [vi.fn(), vi.fn(), vi.fn()];

      batchTasks(tasks);
      // Tasks should not have been called yet
      tasks.forEach(fn => expect(fn).not.toHaveBeenCalled());

      // Wait for microtask
      await Promise.resolve();
      await Promise.resolve();
      tasks.forEach(fn => expect(fn).toHaveBeenCalled());
    });
  });
});
