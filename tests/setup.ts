/**
 * tests/setup.ts — Vitest global test setup for Wasel | واصل
 *
 * Runs before every test file. Keep this lean — only add truly global
 * concerns here (mocks that every test needs).
 */

import { vi, beforeEach, afterEach } from 'vitest';

// ── localStorage mock ─────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// ── navigator.language default ────────────────────────────────────────────────
// Only override `language`; replacing the whole navigator object strips jsdom's
// userAgent (and other properties) that react-dom relies on internally, which
// crashes any test that renders a component before it even runs.
Object.defineProperty(globalThis.navigator, 'language', {
  value: 'en-US',
  writable: true,
  configurable: true,
});

// ── Clean state between tests ─────────────────────────────────────────────────
beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
