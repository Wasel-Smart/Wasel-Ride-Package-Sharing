const originalFetch = globalThis.fetch;

const mockFetch = () => Promise.reject(new Error('fetch is not configured for this test'));

Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch,
  writable: true,
  configurable: true,
});

if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'fetch', {
    value: mockFetch,
    writable: true,
    configurable: true,
  });
}

globalThis.__originalFetch = originalFetch;
