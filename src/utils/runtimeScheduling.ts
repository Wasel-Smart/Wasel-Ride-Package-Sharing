/**
 * Runtime task scheduling.
 *
 * Defers execution of non-critical tasks using requestIdleCallback (when available)
 * or setTimeout (fallback for Safari/iOS).
 */

import { scheduleIdleTask } from './idleScheduler';

export function scheduleDeferredTask(
  task: () => void | Promise<void>,
  timeout = 1_500,
): () => void {
  if (typeof window === 'undefined') {
    void task();
    return () => undefined;
  }

  return scheduleIdleTask(() => {
    void task();
  }, timeout);
}
