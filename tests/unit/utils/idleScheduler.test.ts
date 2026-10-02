/**
 * Unit tests for browser-compatible idle task scheduler.
 * Tests the Safari/iOS compatibility fix for requestIdleCallback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleIdleTask, hasRequestIdleCallback } from '@/utils/idleScheduler';

describe('idleScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('scheduleIdleTask', () => {
    it('executes the callback when requestIdleCallback is available', () => {
      const callback = vi.fn();
      const cancel = scheduleIdleTask(callback, 100);

      vi.runAllTimers();

      // Should use requestIdleCallback or setTimeout fallback
      expect(callback).toHaveBeenCalledTimes(1);
      cancel();
    });

    it('falls back to setTimeout when requestIdleCallback is unavailable', () => {
      const originalRequestIdleCallback = (globalThis as any).requestIdleCallback;
      const originalCancelIdleCallback = (globalThis as any).cancelIdleCallback;

      // Remove requestIdleCallback to simulate Safari/iOS
      delete (globalThis as any).requestIdleCallback;
      delete (globalThis as any).cancelIdleCallback;

      const callback = vi.fn();
      const cancel = scheduleIdleTask(callback, 100);

      // Should use setTimeout fallback
      expect(() => {
        vi.runAllTimers();
      }).not.toThrow();

      expect(callback).toHaveBeenCalledTimes(1);
      cancel();

      // Restore
      if (originalRequestIdleCallback) {
        (globalThis as any).requestIdleCallback = originalRequestIdleCallback;
      }
      if (originalCancelIdleCallback) {
        (globalThis as any).cancelIdleCallback = originalCancelIdleCallback;
      }
    });

    it('cancels the scheduled task', () => {
      const callback = vi.fn();
      const cancel = scheduleIdleTask(callback, 100);

      cancel();
      vi.runAllTimers();

      // Callback should not be called since we cancelled it
      expect(callback).toHaveBeenCalledTimes(0);
    });

    it('respects the timeout option', () => {
      const callback = vi.fn();
      scheduleIdleTask(callback, 500);

      // Advance timer by less than timeout
      vi.advanceTimersByTime(250);
      expect(callback).not.toHaveBeenCalled();

      // Advance to timeout
      vi.advanceTimersByTime(250);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('hasRequestIdleCallback', () => {
    it('returns true when requestIdleCallback is available', () => {
      expect(hasRequestIdleCallback()).toBe(true);
    });

    it('returns false when requestIdleCallback is not available', () => {
      const original = (globalThis as any).requestIdleCallback;
      delete (globalThis as any).requestIdleCallback;

      expect(hasRequestIdleCallback()).toBe(false);

      // Restore
      if (original) {
        (globalThis as any).requestIdleCallback = original;
      }
    });
  });
});
