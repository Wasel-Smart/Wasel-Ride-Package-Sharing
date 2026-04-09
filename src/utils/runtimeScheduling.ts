type ScheduledHandle = number;

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
    options?: { timeout: number },
  ) => ScheduledHandle;
  cancelIdleCallback?: (handle: ScheduledHandle) => void;
};

export function scheduleDeferredTask(
  task: () => void | Promise<void>,
  timeout = 1_500,
): () => void {
  if (typeof window === 'undefined') {
    void task();
    return () => undefined;
  }

  const runtimeWindow = window as WindowWithIdleCallback;
  if (typeof runtimeWindow.requestIdleCallback === 'function') {
    const handle = runtimeWindow.requestIdleCallback(() => {
      void task();
    }, { timeout });

    return () => {
      runtimeWindow.cancelIdleCallback?.(handle);
    };
  }

  const handle = window.setTimeout(() => {
    void task();
  }, Math.min(timeout, 2_000));

  return () => {
    window.clearTimeout(handle);
  };
}
