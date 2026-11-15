/**
 * Supabase Client — Production
 *
 * Credentials resolved in priority order:
 *   1. VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY  (from .env)
 *   2. info.tsx fallback (checked-in public project config)
 *
 * Set these in your .env file for full portability:
 *   VITE_SUPABASE_URL=https://<project-id>.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key-or-anon-key>
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import {
  hasSupabasePublicConfig,
  isLegacyJwtPublicKey,
  publicAnonKey,
  publicSupabaseUrl,
} from './info';

// Cookie name shared with api/auth/callback.ts — the server-side callback
// reads the PKCE code_verifier and writes the session under this same name.
// If this ever drifts from the value in api/auth/callback.ts, server-side
// OAuth/email-link completion will silently fail to find the verifier.
const AUTH_COOKIE_NAME = 'wasel-auth-token';

// ── Credentials ───────────────────────────────────────────────────────────────
// Placeholder detection is owned by info.tsx (pickConfiguredUrl / pickConfiguredKey).
// hasSupabasePublicConfig is only true when both URL and key passed those checks.
export const supabaseUrl = publicSupabaseUrl;

export const supabaseAnonKey = publicAnonKey;

export const isSupabaseConfigured = hasSupabasePublicConfig;

/**
 * Supabase disabled legacy anon/service_role JWT keys in September 2026. A
 * build still shipping one gets 401 "Legacy API keys are disabled" from every
 * auth call. Surfaced as a named flag so the auth layer can report a
 * configuration fault instead of the generic "wrong credentials" message.
 */
export const isUsingLegacySupabaseKey =
  isSupabaseConfigured && isLegacyJwtPublicKey(supabaseAnonKey);

// ── Retry config ──────────────────────────────────────────────────────────────
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 8000,
  backoffMultiplier: 2,
};

const HEALTH_CHECK_INTERVAL = 60_000;

function getBrowserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | undefined {
  if (typeof window === 'undefined') {return undefined;}

  try {
    return window[kind];
  } catch {
    return undefined;
  }
}

function getIsOnline(): boolean {
  if (typeof navigator === 'undefined') {return true;}
  return navigator.onLine;
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = RETRY_CONFIG.maxRetries,
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status: number }).status === 'number' &&
        (error as { status: number }).status >= 400 &&
        (error as { status: number }).status < 500 &&
        (error as { status: number }).status !== 429
      )
        {throw error;}
      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, i),
        RETRY_CONFIG.maxDelay,
      );
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw lastError;
}

// ── Supabase singleton ────────────────────────────────────────────────────────
const getSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    if (import.meta.env.DEV) {
      console.error(
        '[Supabase] Missing valid credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.',
      );
    }
    return null;
  }

  if (isUsingLegacySupabaseKey) {
    // Never silently proceed: every request would 401 with
    // "Legacy API keys are disabled", which looks like a credential problem
    // and made production sign-in impossible to diagnose.
    console.error(
      '[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY is a legacy anon JWT. Supabase disabled legacy API keys. Replace it with the sb_publishable_... key from Dashboard -> Project Settings -> API Keys.',
    );
    return null;
  }

  const CLIENT_KEY = Symbol.for('supabase.client.instance.v4');
  const globalAny = typeof window !== 'undefined' ? window : globalThis;
  type GlobalWithClient = typeof globalAny &
    Record<symbol, ReturnType<typeof createBrowserClient<Database>> | undefined>;
  const globalStore = globalAny as GlobalWithClient;
  if (globalStore[CLIENT_KEY]) {return globalStore[CLIENT_KEY];}

  try {
    const client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookieOptions: {
        name: AUTH_COOKIE_NAME,
        path: '/',
        // Lax (not Strict): the OAuth/email-link redirect back from the provider is a
        // cross-site top-level navigation and must still carry the PKCE verifier cookie.
        sameSite: 'lax',
        // Secure on https (production). Plain-http origins reject Secure cookies in some
        // browsers, so only local http dev falls back to non-Secure.
        secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      },
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: { 'X-Client-Info': 'wasel-web' },
      },
      db: { schema: 'public' },
      realtime: { params: { eventsPerSecond: 10 } },
    });
    globalStore[CLIENT_KEY] = client;
    return client;
  } catch {
    if (import.meta.env.DEV) {
      console.error('[Supabase] Failed to create client.');
    }
    return null;
  }
};

export const supabase = isSupabaseConfigured ? getSupabaseClient() : null;
export { getSupabaseClient };

// ── Lazy listener initialisation ──────────────────────────────────────────────
// Call once from inside a React useEffect (after mount).
let listenersInitialised = false;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

export function initSupabaseListeners(): () => void {
  if (listenersInitialised || typeof window === 'undefined') {return () => {};}
  listenersInitialised = true;

  healthCheckTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {return;}
    checkSupabaseConnection(false).catch(() => {});
  }, HEALTH_CHECK_INTERVAL);

  return () => {
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }
    listenersInitialised = false;
  };
}

// ── Optimised query wrapper ───────────────────────────────────────────────────
export async function optimizedQuery<T>(
  queryFn: () => Promise<T>,
  options?: { cache?: boolean; cacheKey?: string; cacheDuration?: number },
): Promise<T> {
  const { cache = true, cacheKey = '', cacheDuration = 60_000 } = options ?? {};

  if (cache && cacheKey) {
    try {
      const storage = getBrowserStorage('sessionStorage');
      const cached = storage?.getItem(`qc-${cacheKey}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheDuration) {return data;}
      }
    } catch {
      /* ignore cache errors */
    }
  }

  // Do not defer arbitrary Supabase operations until connectivity returns. The
  // closure may contain a booking/payment mutation and can run much later with
  // stale auth, changed form data, or after the user has navigated away. Callers
  // that support offline writes must persist an explicit, idempotent command.
  if (!getIsOnline()) {
    throw new Error('You are offline. Reconnect and try again.');
  }
  const result = await retryWithBackoff(queryFn);

  if (cache && cacheKey) {
    try {
      const storage = getBrowserStorage('sessionStorage');
      storage?.setItem(`qc-${cacheKey}`, JSON.stringify({ data: result, timestamp: Date.now() }));
    } catch {
      /* ignore */
    }
  }
  return result;
}

// ── Connection health check ───────────────────────────────────────────────────
let connectionHealthy = true;
let lastHealthCheck = 0;

export async function checkSupabaseConnection(force = false): Promise<boolean> {
  if (!supabase) {return false;}

  const CACHE_TTL = HEALTH_CHECK_INTERVAL;
  if (!force && Date.now() - lastHealthCheck < CACHE_TTL && connectionHealthy) {
    return connectionHealthy;
  }

  try {
    const sessionPromise = supabase.auth.getSession();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), 5000);
      });
      await Promise.race([sessionPromise, timeout]);
    } finally {
      if (timeoutId) {clearTimeout(timeoutId);}
    }
    connectionHealthy = true;
    lastHealthCheck = Date.now();
    return true;
  } catch {
    connectionHealthy = false;
    return false;
  }
}

export function getConnectionMetrics() {
  return {
    isOnline: getIsOnline(),
    connectionHealthy,
    queuedRequests: 0,
    lastHealthCheck: lastHealthCheck ? new Date(lastHealthCheck).toISOString() : 'never',
  };
}
