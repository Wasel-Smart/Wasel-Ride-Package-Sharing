/**
 * Vitest environment bootstrap - runs before any test module is imported.
 *
 * Root cause fix: Vitest's jsdom environment does not inject import.meta.env
 * the same way Vite does at build time. Modules that read import.meta.env at
 * the top level (e.g. Supabase client, security.ts, env.ts) crash with
 * "Cannot read properties of undefined (reading 'config')" because
 * import.meta.env is undefined in the test runner.
 *
 * This file patches import.meta.env onto globalThis so every module that
 * accesses it at load time gets a valid object.
 */

const TEST_ENV = {
  MODE: 'test',
  DEV: false,
  PROD: false,
  SSR: false,
  BASE_URL: '/',
  VITE_APP_ENV: 'test',
  VITE_APP_NAME: 'Wasel',
  VITE_APP_URL: 'http://localhost:3000',
  VITE_SUPPORT_EMAIL: 'support@wasel.jo',
  VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'true',
  VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK: 'true',
  VITE_ENABLE_TWO_FACTOR_AUTH: 'false',
  VITE_ENABLE_EMAIL_NOTIFICATIONS: 'true',
  VITE_ENABLE_SMS_NOTIFICATIONS: 'true',
  VITE_ENABLE_WHATSAPP_NOTIFICATIONS: 'true',
  VITE_AUTH_CALLBACK_PATH: '/app/auth/callback',
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
  VITE_SENTRY_DSN: '',
  VITE_APP_VERSION: '1.0.0-test',
};

// Patch import.meta.env on globalThis so it is available before any module loads.
// Vitest transforms import.meta.env references but the underlying object may be
// undefined in the jsdom environment when modules are evaluated at import time.
if (typeof globalThis !== 'undefined') {
  // @ts-expect-error -- test bootstrap injects an importMeta shim on globalThis.
  if (!globalThis.importMeta) {
    // @ts-expect-error -- globalThis.importMeta does not exist in the standard DOM typings.
    globalThis.importMeta = { env: TEST_ENV };
  }

  // The actual fix: ensure the module-level import.meta.env object exists.
  // Vitest resolves import.meta at transform time, but some edge cases
  // (dynamic imports, re-exports) can still hit undefined.
  try {
    if (typeof import.meta !== 'undefined' && !import.meta.env) {
      Object.defineProperty(import.meta, 'env', {
        value: TEST_ENV,
        writable: true,
        configurable: true,
      });
    } else if (typeof import.meta !== 'undefined' && import.meta.env) {
      // Merge missing keys without overwriting existing ones.
      for (const [key, value] of Object.entries(TEST_ENV)) {
        if (!(key in import.meta.env)) {
          (import.meta.env as Record<string, unknown>)[key] = value;
        }
      }
    }
  } catch {
    // import.meta may not be patchable in all environments - that is fine,
    // Vitest's transform handles the common case.
  }
}
