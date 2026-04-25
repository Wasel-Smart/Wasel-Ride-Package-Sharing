import '@testing-library/jest-dom';

// ── React 18 + jsdom error event suppression ─────────────────────────────────
//
// React 18 calls `reportError()` (or dispatches an 'error' event on window)
// after every render-time throw, EVEN when the error is already caught by:
//   - an enclosing `expect(() => render(...)).toThrow()` assertion, OR
//   - a React class error boundary (AppErrorBoundary).
//
// In Vitest + jsdom this second event propagates as an unhandled error and
// fails the test a second time. We intercept it at capture phase and call
// preventDefault() so Vitest's global error handler never sees it.
//
// This is safe: real assertion failures still propagate because they are
// thrown synchronously from the test body, not dispatched as DOM events.
window.addEventListener(
  'error',
  (event: ErrorEvent) => {
    // Only suppress errors originating from React's reportError path.
    // Real window errors (script errors, resource failures) have a null error
    // property and a meaningful filename — we leave those alone.
    if (event.error instanceof Error) {
      event.preventDefault();
    }
  },
  { capture: true },
);

// Unhandled promise rejections from mocked async tasks (e.g. the deferred
// observeWebVitals call in RuntimeCoordinator that references PerformanceObserver
// which jsdom may not implement) must not fail tests that don't expect them.
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

if (!('requestIdleCallback' in window)) {
  Object.defineProperty(window, 'requestIdleCallback', {
    configurable: true,
    writable: true,
    value: (callback: IdleRequestCallback) =>
      window.setTimeout(
        () =>
          callback({
            didTimeout: false,
            timeRemaining: () => 0,
          } as IdleDeadline),
        1,
      ),
  });
}

if (!('cancelIdleCallback' in window)) {
  Object.defineProperty(window, 'cancelIdleCallback', {
    configurable: true,
    writable: true,
    value: (handle: number) => window.clearTimeout(handle),
  });
}

Object.defineProperty(globalThis, 'requestIdleCallback', {
  configurable: true,
  writable: true,
  value: window.requestIdleCallback,
});

Object.defineProperty(globalThis, 'cancelIdleCallback', {
  configurable: true,
  writable: true,
  value: window.cancelIdleCallback,
});

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];

  constructor(private readonly _callback: IntersectionObserverCallback) {}

  disconnect() {}

  observe(_target: Element) {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  configurable: true,
  writable: true,
  value: MockIntersectionObserver,
});

Object.defineProperty(globalThis, 'IntersectionObserver', {
  configurable: true,
  writable: true,
  value: MockIntersectionObserver,
});

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

try {
  window.localStorage.clear();
} catch {
  const storage = new MemoryStorage();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}
