import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  checkSupabaseConnection,
  supabase as supabaseClient,
  supabaseUrl,
} from '../utils/supabase/client';
import { validateApiUrl } from '../utils/sanitization';
import { addCSRFHeader } from '../utils/csrf';
import { circuitBreakers, CircuitState } from '../utils/circuitBreaker';

export { projectId, publicAnonKey };

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const configuredFunctionsBaseUrl = (
  import.meta.env.VITE_EDGE_FUNCTIONS_BASE_URL as string | undefined
)?.trim();
const configuredFunctionName = (
  import.meta.env.VITE_EDGE_FUNCTION_NAME as string | undefined
)?.trim();
const defaultFunctionsBaseUrl = supabaseUrl ? `${supabaseUrl}/functions/v1` : '';
const resolvedFunctionsBaseUrl = configuredFunctionsBaseUrl || defaultFunctionsBaseUrl;
const resolvedFunctionName = configuredFunctionName || 'make-server-0b1f4071';

export const API_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/$/, '')
  : resolvedFunctionsBaseUrl
    ? `${resolvedFunctionsBaseUrl.replace(/\/$/, '')}/${resolvedFunctionName}`
    : '';

function isJwtLikeToken(token: string | null | undefined): token is string {
  return Boolean(token && token.split('.').length === 3);
}

export type BackendStatus = 'unknown' | 'healthy' | 'degraded' | 'offline';

export interface AvailabilitySnapshot {
  networkOnline: boolean;
  edgeFunctionAvailable: boolean;
  backendStatus: BackendStatus;
  usingFallbackMode: boolean;
  lastCheckedAt: number | null;
}

export function createEdgeHeaders(headers?: HeadersInit, userToken?: string, includeCSRF = true): Headers {
  let headersInit = headers ?? {};

  // Add CSRF token for state-changing operations
  if (includeCSRF) {
    headersInit = addCSRFHeader(headersInit);
  }

  const finalHeaders = new Headers(headersInit);

  if (publicAnonKey && !finalHeaders.has('apikey')) {
    finalHeaders.set('apikey', publicAnonKey);
  }

  if (userToken) {
    finalHeaders.set('Authorization', `Bearer ${userToken}`);
  } else if (isJwtLikeToken(publicAnonKey) && !finalHeaders.has('Authorization')) {
    finalHeaders.set('Authorization', `Bearer ${publicAnonKey}`);
  }

  return finalHeaders;
}

type AvailabilityListener = (snapshot: AvailabilitySnapshot) => void;

let edgeFunctionAvailable = Boolean(supabaseClient || API_URL);
let backendStatus: BackendStatus = supabaseClient ? 'unknown' : 'degraded';
let lastCheckedAt: number | null = null;
let loggedLocalHealthBypass = false;
const availabilityListeners = new Set<AvailabilityListener>();

function shouldPreferDirectSupabaseHealth(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const { hostname, protocol } = new URL(window.location.origin);
    const isLocalOrigin =
      protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');

    if (isLocalOrigin && import.meta.env.DEV && !loggedLocalHealthBypass) {
      loggedLocalHealthBypass = true;
      console.info('[Wasel] Local dev origin detected, bypassing remote edge health probe.');
    }

    return isLocalOrigin;
  } catch {
    return false;
  }
}

async function markSupabaseHealth(): Promise<boolean> {
  if (!supabaseClient) {
    setEdgeFunctionAvailability(false);
    setBackendStatus(getNetworkOnline() ? 'degraded' : 'offline');
    return false;
  }

  const healthy = await checkSupabaseConnection(true).catch(() => false);
  setEdgeFunctionAvailability(healthy);
  setBackendStatus(healthy ? 'healthy' : getNetworkOnline() ? 'degraded' : 'offline');
  return healthy;
}

function getNetworkOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

function buildAvailabilitySnapshot(): AvailabilitySnapshot {
  const networkOnline = getNetworkOnline();

  if (!networkOnline) {
    return {
      networkOnline,
      edgeFunctionAvailable,
      backendStatus: 'offline',
      usingFallbackMode: !edgeFunctionAvailable,
      lastCheckedAt,
    };
  }

  return {
    networkOnline,
    edgeFunctionAvailable,
    backendStatus,
    usingFallbackMode: !edgeFunctionAvailable,
    lastCheckedAt,
  };
}

function notifyAvailabilityListeners(): void {
  const snapshot = buildAvailabilitySnapshot();
  availabilityListeners.forEach(listener => listener(snapshot));
}

function setEdgeFunctionAvailability(nextValue: boolean): void {
  if (edgeFunctionAvailable === nextValue) {
    return;
  }

  edgeFunctionAvailable = nextValue;
  notifyAvailabilityListeners();
}

function setBackendStatus(nextStatus: BackendStatus): void {
  backendStatus = nextStatus;
  lastCheckedAt = Date.now();
  notifyAvailabilityListeners();
}

export function getAvailabilitySnapshot(): AvailabilitySnapshot {
  return buildAvailabilitySnapshot();
}

export function subscribeAvailability(listener: AvailabilityListener): () => void {
  availabilityListeners.add(listener);
  listener(buildAvailabilitySnapshot());

  return () => {
    availabilityListeners.delete(listener);
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyAvailabilityListeners();
    // Reset circuit breaker when network comes back online
    const breaker = circuitBreakers.get('api-calls');
    if (breaker.getState() === CircuitState.OPEN) {
      breaker.reset();
      console.info('[Wasel] API circuit breaker reset due to network recovery');
    }
  });

  window.addEventListener('offline', () => {
    notifyAvailabilityListeners();
  });
}

export function isEdgeFunctionAvailable(): boolean {
  return edgeFunctionAvailable;
}

export function markEdgeFunctionUnavailable(): void {
  if (edgeFunctionAvailable) {
    const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
    if (isDev) {
      console.info('[Wasel] Edge Function unavailable, using direct Supabase queries.');
    }
  }

  setEdgeFunctionAvailability(false);
  setBackendStatus(getNetworkOnline() ? 'degraded' : 'offline');
}

export async function probeBackendHealth(timeout = 8_000): Promise<AvailabilitySnapshot> {
  if (!getNetworkOnline()) {
    setBackendStatus('offline');
    return buildAvailabilitySnapshot();
  }

  if (!API_URL || !publicAnonKey || !isJwtLikeToken(publicAnonKey) || shouldPreferDirectSupabaseHealth()) {
    await markSupabaseHealth();
    return buildAvailabilitySnapshot();
  }

  try {
    const response = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(timeout),
      headers: createEdgeHeaders(),
    });

    if (response.ok) {
      setEdgeFunctionAvailability(true);
      setBackendStatus('healthy');
    } else if (!(await markSupabaseHealth())) {
      setEdgeFunctionAvailability(false);
      setBackendStatus('degraded');
    }
  } catch {
    await markSupabaseHealth();
  }

  return buildAvailabilitySnapshot();
}

let warmUpAttempts = 0;
let serverWarm = false;
const MAX_WARMUP_ATTEMPTS = 3;

export async function warmUpServer(): Promise<void> {
  if (serverWarm) {
    return;
  }

  if (!API_URL || !publicAnonKey || !isJwtLikeToken(publicAnonKey) || shouldPreferDirectSupabaseHealth()) {
    serverWarm = await markSupabaseHealth();
    return;
  }

  warmUpAttempts += 1;

  try {
    const response = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(12_000),
      headers: createEdgeHeaders(),
    });

    if (response.ok) {
      serverWarm = true;
      setEdgeFunctionAvailability(true);
      setBackendStatus('healthy');
      return;
    }
  } catch {
    // The retry path below handles the final state.
  }

  if (await markSupabaseHealth()) {
    serverWarm = true;
    return;
  }

  if (warmUpAttempts < MAX_WARMUP_ATTEMPTS) {
    setTimeout(() => {
      void warmUpServer();
    }, 2_000 * warmUpAttempts);
    return;
  }

  markEdgeFunctionUnavailable();
}

let healthPollTimer: ReturnType<typeof setInterval> | null = null;

export function startAvailabilityPolling(intervalMs = 60_000): () => void {
  if (healthPollTimer) {
    return () => stopAvailabilityPolling();
  }

  healthPollTimer = setInterval(() => {
    void probeBackendHealth();
  }, intervalMs);

  return () => stopAvailabilityPolling();
}

export function stopAvailabilityPolling(): void {
  if (!healthPollTimer) {
    return;
  }

  clearInterval(healthPollTimer);
  healthPollTimer = null;
}

warmUpServer().catch(() => {
  markEdgeFunctionUnavailable();
});

interface FetchWithRetryOptions extends RequestInit {
  timeout?: number;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
  retries = 1,
  backoff = 500,
): Promise<Response> {
  if (!url) {
    throw new Error(
      'Backend API is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  // Validate URL to prevent SSRF attacks
  const allowedDomains = [
    'supabase.co',
    'supabase.net',
    'wasel14.online',
    'localhost',
    '127.0.0.1',
  ];

  if (!validateApiUrl(url, allowedDomains)) {
    throw new Error('Invalid or unauthorized URL');
  }

  // Use circuit breaker for API calls
  const breaker = circuitBreakers.get('api-calls', {
    failureThreshold: 5,
    timeout: 10000,
  });

  return breaker.execute(async () => {
    const { timeout = 5_000, signal: callerSignal, ...fetchOptions } = options;

    // Add CSRF token for state-changing operations
    if (fetchOptions.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(fetchOptions.method)) {
      fetchOptions.headers = addCSRFHeader(fetchOptions.headers);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    if (callerSignal?.aborted) {
      clearTimeout(timer);
      throw new DOMException('Request aborted', 'AbortError');
    }

    const onCallerAbort = () => controller.abort();
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      if (response.ok) {
        setBackendStatus('healthy');
        if (edgeFunctionAvailable || url.includes('/health')) {
          setEdgeFunctionAvailability(true);
        }
        // Reset circuit breaker on successful response
        breaker.reset();
      }

      if (retries > 0 && [502, 503, 504].includes(response.status)) {
        await delay(backoff);
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }

      if (!response.ok && response.status >= 500) {
        setBackendStatus(getNetworkOnline() ? 'degraded' : 'offline');
      }

      return response;
    } catch (error: unknown) {
      if (callerSignal?.aborted) {
        throw error;
      }

      const isRetryable =
        error instanceof TypeError || (error instanceof DOMException && error.name === 'AbortError');

      if (retries > 0 && isRetryable) {
        await delay(backoff);
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }

      setBackendStatus(getNetworkOnline() ? 'degraded' : 'offline');

      if (url.startsWith(API_URL)) {
        setEdgeFunctionAvailability(false);
      }

      throw error;
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const supabase = supabaseClient;

/**
 * Reset the API circuit breaker to recover from OPEN state
 */
export function resetApiCircuitBreaker(): void {
  const breaker = circuitBreakers.get('api-calls');
  breaker.reset();
  console.info('[Wasel] API circuit breaker manually reset');
}

/**
 * Get the current state of the API circuit breaker
 */
export function getApiCircuitBreakerState() {
  const breaker = circuitBreakers.get('api-calls');
  return breaker.getStats();
}

export interface AuthDetails {
  token: string;
  userId: string;
}

export async function getAuthDetails(): Promise<AuthDetails> {
  if (!supabase) {
    throw new Error('Supabase client is not initialised');
  }

  const sessionResult = await supabase.auth.getSession();
  let session = sessionResult.data.session;

  if (sessionResult.error) {
    throw sessionResult.error;
  }

  if (!session?.access_token) {
    const refreshResult = await supabase.auth.refreshSession();
    session = refreshResult.data.session;

    if (refreshResult.error) {
      throw refreshResult.error;
    }
  }

  if (!session?.access_token || !session.user?.id) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  return {
    token: session.access_token,
    userId: session.user.id,
  };
}
