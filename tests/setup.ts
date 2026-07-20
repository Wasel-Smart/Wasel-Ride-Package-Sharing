import { vi } from 'vitest';

// Polyfill for structuredClone in JSDOM environment
if (!global.structuredClone) {
  global.structuredClone = val => JSON.parse(JSON.stringify(val));
}

// Polyfill requestIdleCallback (used by InstantFeedbackEngine) for jsdom.
if (typeof globalThis.requestIdleCallback === 'undefined') {
  globalThis.requestIdleCallback = ((cb: IdleRequestCallback) =>
    setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 0) as unknown) as typeof requestIdleCallback;
  globalThis.cancelIdleCallback = ((handle: number) => clearTimeout(handle)) as typeof cancelIdleCallback;
}

// In-memory localStorage/sessionStorage polyfill for jsdom. Newer jsdom gates
// Web Storage behind a `--localstorage-file` path and throws on access unless
// initialized; we force a working in-memory implementation for tests.
class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function installMemoryStorage(): void {
  const local = new MemoryStorage() as unknown as Storage;
  const session = new MemoryStorage() as unknown as Storage;
  Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: session, configurable: true, writable: true });
}

try {
  // Probe: if jsdom's Storage throws on access, replace it.
  void globalThis.localStorage.length;
} catch {
  installMemoryStorage();
}

// Mock for Supabase realtime subscriptions in tests
vi.mock('@/features/mobility-os/mobilityRealtime', () => ({
  subscribeToMobilityCorridorChanges: () => () => { },
}));