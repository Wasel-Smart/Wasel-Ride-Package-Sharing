/**
 * Vitest Setup File
 * Configures test environment and mocks
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock import.meta.env for all tests
const mockEnv = {
  MODE: 'test',
  DEV: false,
  PROD: false,
  SSR: false,
  VITE_SUPABASE_URL: 'https://djccmatubyyudeosrngm.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  VITE_APP_URL: 'http://localhost:3000',
  VITE_ENABLE_TWO_FACTOR_AUTH: 'false',
  VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'true',
};

// Mock import.meta
vi.stubGlobal('import', {
  meta: {
    env: mockEnv,
  },
});

// Better mock for localStorage and sessionStorage
const createMockStorage = () => {
  const storage = new Map<string, string>();
  return {
    getItem: (key: string | null) => {
      if (key === null) return null;
      return storage.get(key) || null;
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    get length() {
      return storage.size;
    },
    key: (index: number) => {
      const keys = Array.from(storage.keys());
      return keys[index] || null;
    },
  };
};

// Mock localStorage
const mockLocalStorage = createMockStorage();
if (typeof window !== 'undefined') {
  window.localStorage = mockLocalStorage as Storage;
  window.sessionStorage = createMockStorage() as Storage;
} else {
  global.localStorage = mockLocalStorage as Storage;
  global.sessionStorage = createMockStorage() as Storage;
}

// Mock window.requestIdleCallback for tests
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  window.requestIdleCallback = (callback: IdleRequestCallback) => {
    const start = Date.now();
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1) as unknown as number;
  };

  window.cancelIdleCallback = (id: number) => {
    clearTimeout(id);
  };
}

// Initialize test session ID
try {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('wasel_session_id', 'test-session-id-12345678901234567890123456789012');
  }
} catch (e) {
  // sessionStorage not available, skip initialization
}
