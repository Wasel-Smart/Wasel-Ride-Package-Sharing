/**
 * Vitest Setup File
 * Configures test environment and mocks
 */

import { vi } from 'vitest';

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

// Mock sessionStorage for tests
try {
  if (typeof sessionStorage === 'undefined') {
    const storage: Record<string, string> = {};
    global.sessionStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach(key => delete storage[key]);
      },
      length: 0,
      key: () => null,
    };
  }
} catch (e) {
  // sessionStorage check failed, skip mock
}

// Mock localStorage for tests
try {
  if (typeof localStorage === 'undefined') {
    const storage: Record<string, string> = {};
    global.localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach(key => delete storage[key]);
      },
      length: 0,
      key: () => null,
    };
  }
} catch (e) {
  // localStorage check failed, skip mock
}

// Initialize session ID for tests
try {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('wasel_session_id', 'test-session-id-12345678901234567890123456789012');
  }
} catch (e) {
  // sessionStorage not available, skip initialization
}
