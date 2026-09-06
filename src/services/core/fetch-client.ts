import { API_URL } from './api-resolver';
import { getConfig } from '../../utils/env';
import { validateApiUrl } from '../../utils/sanitization';
import { circuitBreakers, CircuitState } from '../../utils/circuitBreaker';
import { addCSRFHeader } from '../../utils/csrf';
import { supabase as supabaseClient } from '../../utils/supabase/client';
import {
  isEdgeFunctionAvailable,
  setEdgeFunctionAvailability,
  getNetworkOnline,
  setBackendStatus,
} from './availability';

export interface FetchWithRetryOptions extends RequestInit {
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

  const { allowedApiDomain } = getConfig();
  const allowedDomains = ['supabase.co', 'supabase.net', 'localhost', allowedApiDomain].filter(
    Boolean,
  );

  if (!validateApiUrl(url, allowedDomains)) { // nosec CWE-918
    throw new Error('Invalid or unauthorized URL');
  }

  const breaker = circuitBreakers.get('api-calls', {
    failureThreshold: 5,
    timeout: 5000,
  });

  if (breaker.getState() === CircuitState.OPEN) {
    breaker.reset();
  }

  return breaker.execute(async () => {
    const { timeout = 5_000, signal: callerSignal, ...fetchOptions } = options;

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
        if (!isEdgeFunctionAvailable() && url.includes('/health')) {
          setEdgeFunctionAvailability(true);
        }
        return response;
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

export function resetApiCircuitBreaker(): void {
  const breaker = circuitBreakers.get('api-calls');
  breaker.reset();
  if (import.meta.env.DEV) {
    console.info('[Wasel] API circuit breaker manually reset');
  }
}

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

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const needsRefresh = !session || (session.expires_at ?? 0) - nowSeconds < 60;

  if (needsRefresh) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      throw new Error('Session expired. Please sign in again.');
    }
    return {
      token: refreshed.session.access_token,
      userId: refreshed.session.user.id,
    };
  }

  return {
    token: session.access_token,
    userId: session.user.id,
  };
}
