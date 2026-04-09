import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  checkSupabaseConnection,
  supabase as supabaseClient,
  supabaseUrl,
} from '../utils/supabase/client';

export { projectId, publicAnonKey };

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const configuredFunctionsBaseUrl = (import.meta.env.VITE_EDGE_FUNCTIONS_BASE_URL as string | undefined)?.trim();
const configuredFunctionName = (import.meta.env.VITE_EDGE_FUNCTION_NAME as string | undefined)?.trim();
const defaultFunctionsBaseUrl = supabaseUrl ? `${supabaseUrl}/functions/v1` : '';
const resolvedFunctionsBaseUrl = configuredFunctionsBaseUrl || defaultFunctionsBaseUrl;
const resolvedFunctionName = configuredFunctionName || 'make-server-0b1f4071';

export const API_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/$/, '')
  : resolvedFunctionsBaseUrl
    ? `${resolvedFunctionsBaseUrl.replace(/\/$/, '')}/${resolvedFunctionName}`
    : '';

export type BackendStatus = 'unknown' | 'healthy' | 'degraded' | 'offline';

export interface AvailabilitySnapshot {
  networkOnline: boolean;
  edgeFunctionAvailable: boolean;
  backendStatus: BackendStatus;
  usingFallbackMode: boolean;
  lastCheckedAt: number | null;
}

type AvailabilityListener = (snapshot: AvailabilitySnapshot) => void;

let edgeFunctionAvailable = Boolean(supabaseClient || API_URL);
let backendStatus: BackendStatus = supabaseClient ? 'unknown' : 'degraded';
let lastCheckedAt: number | null = null;
const availabilityListeners = new Set<AvailabilityListener>();

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
  availabilityListeners.forEach((listener) => listener(snapshot));
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
    // Preserve the state change without extra console noise in shared runtime code.
  }

  setEdgeFunctionAvailability(false);
  setBackendStatus(getNetworkOnline() ? 'degraded' : 'offline');
}

export async function probeBackendHealth(timeout = 8_000): Promise<AvailabilitySnapshot> {
  if (!getNetworkOnline()) {
    setBackendStatus('offline');
    return buildAvailabilitySnapshot();
  }

  if (!API_URL || !publicAnonKey) {
    await markSupabaseHealth();
    return buildAvailabilitySnapshot();
  }

  try {
    const response = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(timeout),
      headers: { Authorization: `Bearer ${publicAnonKey}` },
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

  if (!API_URL || !publicAnonKey) {
    serverWarm = await markSupabaseHealth();
    return;
  }

  warmUpAttempts += 1;

  try {
    const response = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(12_000),
      headers: { Authorization: `Bearer ${publicAnonKey}` },
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
  queuePriority?: 'critical' | 'high' | 'normal' | 'low';
  deduplicationKey?: string;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
  retries = 1,
  backoff = 500,
): Promise<Response> {
  if (!url) {
    throw new Error('Backend API is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const {
    timeout = 5_000,
    signal: callerSignal,
    queuePriority = 'normal',
    deduplicationKey,
    ...fetchOptions
  } = options;

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
    }

    if (retries > 0 && [502, 503, 504].includes(response.status)) {
      await delay(backoff);
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }

    if (!response.ok && response.status >= 500) {
      setBackendStatus(getNetworkOnline() ? 'degraded' : 'offline');
      // Queue for retry on 5xx errors
      try {
        const { getOfflineQueueManager } = await import('./offlineQueue');
        const queue = getOfflineQueueManager();
        queue.addRequest(
          (options.method?.toUpperCase() || 'GET') as any,
          url,
          {
            body: options.body,
            headers: options.headers as Record<string, string>,
            priority: queuePriority,
            deduplicationKey,
            maxRetries: retries + 3,
          }
        );
      } catch {
        // Offline queue not available
      }
    }

    return response;
  } catch (error: unknown) {
    if (callerSignal?.aborted) {
      throw error;
    }

    const isRetryable =
      error instanceof TypeError ||
      (error instanceof DOMException && error.name === 'AbortError');

    if (retries > 0 && isRetryable) {
      await delay(backoff);
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }

    setBackendStatus(getNetworkOnline() ? 'degraded' : 'offline');

    if (url.startsWith(API_URL)) {
      setEdgeFunctionAvailability(false);
    }

    // Network error - queue for later
    if (!getNetworkOnline()) {
      try {
        const { getOfflineQueueManager } = await import('./offlineQueue');
        const queue = getOfflineQueueManager();
        queue.addRequest(
          (options.method?.toUpperCase() || 'GET') as any,
          url,
          {
            body: options.body,
            headers: options.headers as Record<string, string>,
            priority:
              queuePriority === 'critical'
                ? 'critical'
                : queuePriority === 'high'
                  ? 'high'
                  : 'normal',
            deduplicationKey,
            maxRetries: 5,
          }
        );
      } catch {
        // Offline queue not available
      }
    }

    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const supabase = supabaseClient;

export interface AuthDetails {
  token: string;
  userId: string;
}

export async function getAuthDetails(): Promise<AuthDetails> {
  if (!supabase) {
    throw new Error('Supabase client is not initialised');
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  if (!session) {
    throw new Error('Not authenticated');
  }

  return {
    token: session.access_token,
    userId: session.user.id,
  };
}
