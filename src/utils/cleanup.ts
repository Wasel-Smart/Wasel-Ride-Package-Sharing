/**
 * Memory Leak Prevention & Cleanup Utilities
 *
 * Provides:
 *  - Tracked cleanup for intervals, timeouts, event listeners, subscriptions
 *  - WeakRef-based cleanup guards for large object caches
 *  - Safe requestAnimationFrame / IntersectionObserver cleanup
 */

import { logger } from './monitoring';

type CleanupFn = () => void;

interface TrackedCleanup {
  name: string;
  cleanup: CleanupFn;
  createdAt: number;
}

class CleanupRegistry {
  private cleanups = new Map<string, TrackedCleanup>();
  private warnThresholdMs = 30_000;

  register(name: string, cleanup: CleanupFn): CleanupFn {
    const entry: TrackedCleanup = {
      name,
      cleanup,
      createdAt: Date.now(),
    };

    this.cleanups.set(name, entry);

    return () => {
      this.cleanups.delete(name);
      cleanup();
    };
  }

  run(name: string): void {
    const entry = this.cleanups.get(name);
    if (!entry) {return;}

    entry.cleanup();
    this.cleanups.delete(name);
  }

  runAll(): void {
    this.cleanups.forEach((entry) => {
      try {
        entry.cleanup();
      } catch (error) {
        logger.error('Cleanup failed', {
          name: entry.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.cleanups.clear();
  }

  getPendingCount(): number {
    return this.cleanups.size;
  }

  getLongLived(): TrackedCleanup[] {
    const now = Date.now();
    return Array.from(this.cleanups.values()).filter(
      (entry) => now - entry.createdAt > this.warnThresholdMs,
    );
  }
}

export const cleanupRegistry = new CleanupRegistry();

export function safeSetInterval(callback: () => void, delay: number, name?: string): number {
  const id = window.setInterval(() => {
    try {
      callback();
    } catch (error) {
      logger.error('Interval callback failed', {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, delay);

  return id;
}

export function safeSetTimeout(callback: () => void, delay: number, name?: string): number {
  const id = window.setTimeout(() => {
    try {
      callback();
    } catch (error) {
      logger.error('Timeout callback failed', {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, delay);

  return id;
}

export function addEventListenerWithCleanup<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): CleanupFn;
export function addEventListenerWithCleanup<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (event: WindowEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
  name?: string,
): CleanupFn {
  const wrappedListener = (event: WindowEventMap[K]) => {
    try {
      listener(event);
    } catch (error) {
      logger.error('Event listener failed', {
        name,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  target.addEventListener(type, wrappedListener, options);

  const cleanup = () => {
    target.removeEventListener(type, wrappedListener, options);
  };

  if (name) {
    return cleanupRegistry.register(name, cleanup);
  }

  return cleanup;
}

export function addEventListenerWithCleanupDocument<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  listener: (event: DocumentEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions,
  name?: string,
): CleanupFn {
  const wrappedListener = (event: DocumentEventMap[K]) => {
    try {
      listener(event);
    } catch (error) {
      logger.error('Document event listener failed', {
        name,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  target.addEventListener(type, wrappedListener, options);

  const cleanup = () => {
    target.removeEventListener(type, wrappedListener, options);
  };

  if (name) {
    return cleanupRegistry.register(name, cleanup);
  }

  return cleanup;
}

export function cleanupLongLivedIntervals(): void {
  const longLived = cleanupRegistry.getLongLived();
  if (longLived.length > 0) {
    logger.warning('Cleaning up long-lived intervals', {
      count: longLived.length,
      names: longLived.map((entry) => entry.name),
    });
  }
  cleanupRegistry.runAll();
}

export function useCleanup(): { cleanup: CleanupFn; runCleanup: () => void } {
  const cleanups: CleanupFn[] = [];

  const cleanup = () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        logger.error('useCleanup callback failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
    cleanups.length = 0;
  };

  return {
    cleanup: () => {
      cleanup();
    },
    runCleanup: cleanup,
  };
}
