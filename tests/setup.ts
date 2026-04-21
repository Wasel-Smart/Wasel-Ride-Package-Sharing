import '@testing-library/jest-dom';

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
