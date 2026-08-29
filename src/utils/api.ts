import { unwrapApiEnvelope } from '../platform/api-envelope';
import { createCorrelationId } from '../platform/observability';
import { API_URL, publicAnonKey } from '../services/core';
import { logger, trackAPICall } from './monitoring';
import { sanitizeString, validateApiUrl } from './sanitization';
import { supabase } from './supabase/client';
import { getConfig } from './env';
import { addCSRFHeader } from './csrf';

export const API_BASE_URL = API_URL;
export const REQUEST_TIMEOUT = 30_000;

export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1_000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'APIError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      statusCode: this.statusCode,
    };
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function getApiHeaders(accessToken?: string, requestId?: string, method?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Client-Info': 'wasel-web',
    'X-Request-Id': requestId ?? createCorrelationId(),
    'X-Api-Version': 'v1',
    Authorization: `Bearer ${accessToken || publicAnonKey}`,
  };

  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return addCSRFHeader(headers);
  }

  return headers;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateId(prefix: string = 'id'): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new APIError('Secure random ID generation is unavailable', 503, 'secure_random_unavailable');
  }
  return `${prefix}-${crypto.randomUUID()}`;
}

function isRetryable(statusCode: number): boolean {
  return RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT,
): Promise<Response> {
  // Validate URL to prevent SSRF attacks
  const { allowedApiDomain } = getConfig();
  const allowedDomains = ['supabase.co', 'supabase.net', 'localhost', allowedApiDomain].filter(
    Boolean,
  );

  if (!validateApiUrl(url, allowedDomains)) {
    throw new APIError('Invalid or unauthorized URL', 403, 'invalid_url');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError(`Request timeout after ${timeout}ms`);
    }

    if (error instanceof TypeError) {
      throw new NetworkError(error.message);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveSessionToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? undefined;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = RETRY_CONFIG.maxRetries,
): Promise<T> {
  if (!API_BASE_URL && !endpoint.startsWith('http')) {
    throw new APIError('Backend API base URL is not configured.', 500, 'api_not_configured');
  }

  const method = options.method || 'GET';
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const requestId = createCorrelationId();
  const sessionToken = await resolveSessionToken();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = performance.now();

    try {
      const response = await fetchWithTimeout(url, {
        ...options,
        headers: {
          ...getApiHeaders(sessionToken, requestId, method),
          ...options.headers,
        },
      });

      const duration = Math.round(performance.now() - startedAt);
      trackAPICall(endpoint, method, duration, response.status);

      const contentType = response.headers.get('content-type') || '';
      const hasJson = contentType.includes('application/json');
      const payload = hasJson ? await response.json().catch(() => ({})) : await response.text();

      if (response.ok) {
        return unwrapApiEnvelope<T>(payload as T);
      }

      const normalizedError =
        typeof payload === 'object' && payload !== null
          ? {
            message:
              String(
                (payload as { error?: string; message?: string }).error ||
                (payload as { message?: string }).message ||
                response.statusText,
              ) || 'Request failed',
            code: (payload as { code?: string }).code,
            details: (payload as { details?: unknown }).details,
          }
          : {
            message: String(payload || response.statusText || 'Request failed'),
            code: undefined,
            details: undefined,
          };

      if (isRetryable(response.status) && attempt < retries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt);
        logger.warning(`Retrying API request after ${response.status}`, {
          endpoint,
          method,
          attempt: attempt + 1,
          delay,
          requestId,
        });
        await sleep(delay);
        continue;
      }

      throw new APIError(
        normalizedError.message,
        response.status,
        normalizedError.code,
        normalizedError.details,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const retryableRuntimeError =
        lastError instanceof NetworkError || lastError instanceof TimeoutError;

      if (
        lastError instanceof APIError &&
        lastError.statusCode >= 400 &&
        lastError.statusCode < 500 &&
        lastError.statusCode !== 429
      ) {
        throw lastError;
      }

      if (attempt >= retries || !retryableRuntimeError) {
        if (!(lastError instanceof APIError)) {
          logger.error('API request failed', lastError, {
            endpoint: sanitizeString(endpoint),
            method: sanitizeString(method),
            requestId,
          });
        }
        break;
      }

      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt);
      logger.warning('Retrying failed network call', {
        endpoint: sanitizeString(endpoint),
        method: sanitizeString(method),
        attempt: attempt + 1,
        delay,
        requestId,
        error: sanitizeString(lastError.message),
      });
      await sleep(delay);
    }
  }

  throw lastError || new NetworkError('Request failed after all retries');
}

export async function apiGet<T = unknown>(
  endpoint: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  accessToken?: string,
): Promise<T> {
  const queryString = params
    ? `?${new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)]),
    ).toString()}`
    : '';

  return apiRequest<T>(endpoint + queryString, {
    method: 'GET',
    headers: getApiHeaders(accessToken, undefined, 'GET'),
  });
}

export async function apiPost<T = unknown>(
  endpoint: string,
  body?: unknown,
  accessToken?: string,
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    headers: getApiHeaders(accessToken, undefined, 'POST'),
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T = unknown>(
  endpoint: string,
  body?: unknown,
  accessToken?: string,
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    headers: getApiHeaders(accessToken, undefined, 'PUT'),
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T = unknown>(
  endpoint: string,
  body?: unknown,
  accessToken?: string,
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    headers: getApiHeaders(accessToken, undefined, 'PATCH'),
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T = unknown>(endpoint: string, accessToken?: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
    headers: getApiHeaders(accessToken, undefined, 'DELETE'),
  });
}

export const API_ENDPOINTS = {
  SIGNUP: '/v1/auth/signup',
  SIGNIN: '/v1/auth/signin',
  SIGNOUT: '/v1/auth/signout',
  TRIPS: '/v1/trips',
  MY_TRIPS: '/v1/my-trips',
  ACTIVE_TRIP: '/v1/active-trip',
  SEARCH_RIDES: '/v1/trips/search',
  POST_RIDE: '/v1/rides/post',
  BOOK_RIDE: '/v1/rides/book',
  RATE_RIDE: '/v1/rides/rate',
  PACKAGES: '/v1/packages',
  SEND_PACKAGE: '/v1/packages/send',
  AVAILABLE_PACKAGES: '/v1/packages/available',
  TRACK_PACKAGE: (id: string) => `/v1/packages/${id}/track`,
  MOSQUES: '/v1/cultural/mosques',
  PRAYER_TIMES: '/v1/cultural/prayer-times',
  GENDER_PREFERENCES: '/v1/cultural/gender-preferences',
  PROFILE: '/v1/profile',
  TRUST_SCORE: '/v1/trust-score',
  REVIEWS: '/v1/reviews',
  WALLET: '/v1/wallet',
  WALLET_BALANCE: '/v1/wallet/balance',
  WALLET_TRANSACTIONS: '/v1/wallet/transactions',
  WALLET_DEPOSIT: '/v1/wallet/deposit',
  WALLET_WITHDRAW: '/v1/wallet/withdraw',
  COMMUNITY: '/v1/community',
  COMMUNITY_POSTS: '/v1/community/posts',
  ADMIN_STATS: '/v1/admin/liquidity-stats',
  ADMIN_SEED: '/v1/admin/seed-data',
  HEALTH: '/',
  HEALTH_DB: '/health/db',
  HEALTH_AUTH: '/health/auth',
  HEALTH_STORAGE: '/health/storage',
  HEALTH_KV: '/health/kv',
};

export async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export default {
  baseUrl: API_BASE_URL,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
  request: apiRequest,
  endpoints: API_ENDPOINTS,
};
