/**
 * Safe scheduler for deferred/idle tasks.
 * Detects requestIdleCallback availability at runtime (not module load).
 * Falls back to setTimeout on Safari/iOS and older browsers.
 *
 * ROOT CAUSE FIX for: ReferenceError: Can't find variable: requestIdleCallback
 * This was being called unsafely in runtimeScheduling.ts and instantFeedback.ts.
 */

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (
  callback: (deadline: IdleDeadline) => void,
  options?: { timeout?: number }
) => number;

/**
 * Schedule a deferred task using requestIdleCallback if available.
 * Falls back to setTimeout on browsers that don't support it (Safari/iOS).
 *
 * @param callback - Function to execute when idle or after timeout
 * @param timeout - Maximum time to wait before forcing execution (ms)
 * @returns Cleanup function to cancel the scheduled task
 */
export function scheduleIdleTask(
  callback: () => void,
  timeout = 1500
): () => void {
  const idleFn =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as typeof globalThis & { requestIdleCallback?: IdleCallback }).requestIdleCallback === 'function'
      ? (globalThis as typeof globalThis & { requestIdleCallback: IdleCallback }).requestIdleCallback
      : ((cb: (deadline: IdleDeadline) => void, options?: { timeout?: number }) => {
          const handle = setTimeout(() => {
            cb({
              didTimeout: false,
              timeRemaining: () => 0,
            });
          }, Math.min(options?.timeout ?? timeout, 2000));

          return handle as unknown as number;
        });

  const handle = idleFn(() => {
    callback();
  }, { timeout });

  return () => {
    const cancelFn =
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as typeof globalThis & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback === 'function'
        ? (globalThis as typeof globalThis & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback
        : clearTimeout;

    cancelFn(handle as number);
  };
}

/**
 * Check if the current browser supports requestIdleCallback.
 * Useful for feature detection.
 */
export function hasRequestIdleCallback(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as typeof globalThis & { requestIdleCallback?: unknown }).requestIdleCallback === 'function'
  );
}
