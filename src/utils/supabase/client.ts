/**
 * Supabase Client — Production
 *
 * Credentials resolved from deploy-time environment variables only.
 *
 * Set these in your `.env` file for local development:
 *   VITE_SUPABASE_URL=https://<project-id>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<your-anon-key>
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import {
  hasSupabasePublicConfig,
  publicAnonKey,
  publicSupabaseUrl,
} from './info';
import { getSupabaseAuthStorage } from '../authStorage';

function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) {return true;}

  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes('your-project.supabase.co') ||
    normalized.includes('your-anon-key-here') ||
    normalized.includes('replace_with') ||
    normalized.includes('example.com')
  );
}

// ── Credentials ───────────────────────────────────────────────────────────────
export const supabaseUrl =
  publicSupabaseUrl;

export const supabaseAnonKey =
  publicAnonKey;

export const isSupabaseConfigured =
  hasSupabasePublicConfig &&
  !isPlaceholderValue(supabaseUrl) &&
  !isPlaceholderValue(supabaseAnonKey);

// ── Retry config ──────────────────────────────────────────────────────────────
const RETRY_CONFIG = {
  maxRetries:        3,
  initialDelay:      1000,
  maxDelay:          8000,
  backoffMultiplier: 2,
};

const HEALTH_CHECK_INTERVAL = 60_000;
const CLIENT_KEY = Symbol.for('supabase.client.instance.v4');

type QueueTask<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

type SupabaseClientInstance = ReturnType<typeof createClient<Database>>;
type GlobalWithSupabaseClient = typeof globalThis & {
  [CLIENT_KEY]?: SupabaseClientInstance;
};

function getBrowserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | undefined {
  if (typeof window === 'undefined') {return undefined;}

  try {
    return window[kind];
  } catch {
    return undefined;
  }
}

// ── Request queue (used only if a request fires while offline) ────────────────
const requestQueue: Array<QueueTask<unknown>> = [];

function getIsOnline(): boolean {
  if (typeof navigator === 'undefined') {return true;}
  return navigator.onLine;
}

async function processRequestQueue(): Promise<void> {
  while (requestQueue.length > 0 && getIsOnline()) {
    const nextRequest = requestQueue.shift();
    if (!nextRequest) {
      break;
    }

    const { fn, resolve, reject } = nextRequest;
    try {
      resolve(await fn());
    } catch (error) {
      reject(error);
    }
  }
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = RETRY_CONFIG.maxRetries,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status?: unknown }).status === 'number'
          ? (error as { status: number }).status
          : null;

      if (status !== null && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }

      const delay = Math.min(
        RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, i),
        RETRY_CONFIG.maxDelay,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function queueIfOffline<T>(fn: () => Promise<T>): Promise<T> {
  if (!getIsOnline()) {
    return new Promise((resolve, reject) => {
      requestQueue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
    });
  }
  return fn();
}

// ── Supabase singleton ────────────────────────────────────────────────────────
const getSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    console.error(
      '[Supabase] Missing valid credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
    );
    return null;
  }

  const globalStore = (typeof window !== 'undefined' ? window : globalThis) as GlobalWithSupabaseClient;
  if (globalStore[CLIENT_KEY]) {
    return globalStore[CLIENT_KEY];
  }

  try {
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey:         'wasel-auth-token',
        autoRefreshToken:   true,
        persistSession:     true,
        detectSessionInUrl: true,
        storage: getSupabaseAuthStorage(),
      },
      global: {
        headers: { 'X-Client-Info': 'wasel-web' },
      },
      db:       { schema: 'public' },
      realtime: { params: { eventsPerSecond: 10 } },
    });
    globalStore[CLIENT_KEY] = client;
    return client;
  } catch (error) {
    console.error('[Supabase] Failed to create client:', error);
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

  const onOnline = () => { processRequestQueue(); };

  window.addEventListener('online',  onOnline,  { passive: true });
  window.addEventListener('offline', () => {}, { passive: true });

  healthCheckTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {return;}
    checkSupabaseConnection(false).catch(() => {});
  }, HEALTH_CHECK_INTERVAL);

  return () => {
    window.removeEventListener('online', onOnline);
    if (healthCheckTimer) { clearInterval(healthCheckTimer); healthCheckTimer = null; }
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
    } catch { /* ignore cache errors */ }
  }

  const result = await queueIfOffline(() => retryWithBackoff(queryFn));

  if (cache && cacheKey) {
    try {
      const storage = getBrowserStorage('sessionStorage');
      storage?.setItem(`qc-${cacheKey}`, JSON.stringify({ data: result, timestamp: Date.now() }));
    } catch { /* ignore */ }
  }
  return result;
}

// ── Connection health check ───────────────────────────────────────────────────
let connectionHealthy = true;
let lastHealthCheck   = 0;

export async function checkSupabaseConnection(force = false): Promise<boolean> {
  if (!supabase) {return false;}

  const CACHE_TTL = HEALTH_CHECK_INTERVAL;
  if (!force && Date.now() - lastHealthCheck < CACHE_TTL && connectionHealthy) {
    return connectionHealthy;
  }

  try {
    const sessionPromise = supabase.auth.getSession();
    const timeout        = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000),
    );
    await Promise.race([sessionPromise, timeout]);
    connectionHealthy = true;
    lastHealthCheck   = Date.now();
    return true;
  } catch {
    connectionHealthy = false;
    return false;
  }
}

export function getConnectionMetrics() {
  return {
    isOnline:        getIsOnline(),
    connectionHealthy,
    queuedRequests:  requestQueue.length,
    lastHealthCheck: lastHealthCheck ? new Date(lastHealthCheck).toISOString() : 'never',
  };
}
