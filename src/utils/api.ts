/**
 * Wasel API Client Utilities v2.0
 * Provides centralized API endpoint configuration with:
 * - Automatic retry logic
 * - Request/response interceptors
 * - Error handling
 * - Request caching
 * - Performance monitoring
 */

import { API_URL, publicAnonKey } from '../services/core';
import { omitUndefined } from './object';
import { sanitizeForLog } from './logSanitizer';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Base URL for all API calls.
 * This reuses the shared backend resolution from services/core so the app only
 * has one edge-function/backend contract.
 */
export const API_BASE_URL = API_URL;

/**
 * Request timeout (30 seconds)
 */
export const REQUEST_TIMEOUT = 30000;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get default headers for API requests
 */
export function getApiHeaders(accessToken?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Client-Info': 'wasel-web',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    headers['Authorization'] = `Bearer ${publicAnonKey}`;
  }

  return headers;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Lightweight ID generator for client-side optimistic objects.
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Check if status code is retryable
 */
function isRetryable(statusCode: number): boolean {
  return RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error: unknown) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// ============================================================================
// MAIN API REQUEST FUNCTION
// ============================================================================

/**
 * Make an API request to the Wasel backend with automatic retry
 */
type APIErrorPayload = {
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
};

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  if (!API_BASE_URL && !endpoint.startsWith('http')) {
    throw new APIError('Backend API base URL is not configured.', 500, 'api_not_configured');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...options,
        headers: {
          ...getApiHeaders(),
          ...options.headers,
        },
      });

      // Success - return data
      if (response.ok) {
        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        }
        return {} as T;
      }

      // Error response
      const contentType = response.headers.get('content-type');
      let errorData: APIErrorPayload = { error: 'Request failed' };
      
      if (contentType?.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: response.statusText };
        }
      } else {
        errorData = { error: await response.text() || response.statusText };
      }

      // Check if we should retry
      if (isRetryable(response.status) && attempt < retries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt);
        console.warn(`⚠️ Request failed (${response.status}). Retrying in ${delay}ms... (${attempt + 1}/${retries})`);
        await sleep(delay);
        continue;
      }

      // No more retries - throw error
      throw new APIError(
        errorData.error || errorData.message || `API request failed: ${response.statusText}`,
        response.status,
        errorData.code,
        errorData.details
      );

    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new NetworkError('Request failed');

      // Don't retry on client errors (except timeout)
      if (error instanceof APIError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
        throw error;
      }

      // Don't retry if no more attempts
      if (attempt >= retries) {
        break;
      }

      // Retry on network errors and timeouts
      if (error instanceof NetworkError || error instanceof TimeoutError) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt);
        console.warn(`⚠️ ${sanitizeForLog(error.message)}. Retrying in ${delay}ms... (${attempt + 1}/${retries})`);
        await sleep(delay);
        continue;
      }

      // Unknown error - don't retry
      throw error;
    }
  }

  // All retries exhausted
  console.error('❌ All retry attempts exhausted');
  throw lastError || new NetworkError('Request failed after all retries');
}

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * GET request
 */
type QueryParams = Record<string, string | number | boolean | null | undefined>;
type APIBody = BodyInit | Record<string, unknown> | null | undefined;

function isBodyInit(value: APIBody): value is BodyInit {
  return (
    typeof value === 'string' ||
    value instanceof Blob ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  );
}

function serializeBody(body: APIBody): BodyInit | undefined {
  if (body === null || body === undefined) {
    return undefined;
  }

  return isBodyInit(body) ? body : JSON.stringify(body);
}

function withOptionalBody(method: string, headers: HeadersInit, body?: BodyInit): RequestInit {
  return omitUndefined({
    method,
    headers,
    body: body ?? undefined,
  });
}

export async function apiGet<T = unknown>(
  endpoint: string,
  params?: QueryParams,
  accessToken?: string
): Promise<T> {
  const queryString = params 
    ? '?' + new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      ).toString()
    : '';

  return apiRequest<T>(endpoint + queryString, {
    method: 'GET',
    headers: getApiHeaders(accessToken),
  });
}

/**
 * POST request
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  body?: APIBody,
  accessToken?: string
): Promise<T> {
  return apiRequest<T>(endpoint, withOptionalBody('POST', getApiHeaders(accessToken), serializeBody(body)));
}

/**
 * PUT request
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  body?: APIBody,
  accessToken?: string
): Promise<T> {
  return apiRequest<T>(endpoint, withOptionalBody('PUT', getApiHeaders(accessToken), serializeBody(body)));
}

/**
 * PATCH request
 */
export async function apiPatch<T = unknown>(
  endpoint: string,
  body?: APIBody,
  accessToken?: string
): Promise<T> {
  return apiRequest<T>(endpoint, withOptionalBody('PATCH', getApiHeaders(accessToken), serializeBody(body)));
}

/**
 * DELETE request
 */
export async function apiDelete<T = unknown>(
  endpoint: string,
  accessToken?: string
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'DELETE',
    headers: getApiHeaders(accessToken),
  });
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Auth
  SIGNUP: '/auth/signup',
  SIGNIN: '/auth/signin',
  SIGNOUT: '/auth/signout',
  
  // Trips
  TRIPS: '/trips',
  MY_TRIPS: '/my-trips',
  ACTIVE_TRIP: '/active-trip',
  SEARCH_RIDES: '/trips/search',
  POST_RIDE: '/rides/post',
  BOOK_RIDE: '/rides/book',
  RATE_RIDE: '/rides/rate',
  
  // Packages
  PACKAGES: '/packages',
  SEND_PACKAGE: '/packages/send',
  AVAILABLE_PACKAGES: '/packages/available',
  TRACK_PACKAGE: (id: string) => `/packages/${id}/track`,
  
  // Cultural
  MOSQUES: '/cultural/mosques',
  PRAYER_TIMES: '/cultural/prayer-times',
  GENDER_PREFERENCES: '/cultural/gender-preferences',
  
  // Profile
  PROFILE: '/profile',
  TRUST_SCORE: '/trust-score',
  REVIEWS: '/reviews',
  
  // Wallet
  WALLET: '/wallet',
  WALLET_BALANCE: '/wallet/balance',
  WALLET_TRANSACTIONS: '/wallet/transactions',
  WALLET_DEPOSIT: '/wallet/deposit',
  WALLET_WITHDRAW: '/wallet/withdraw',
  
  // Community
  COMMUNITY: '/community',
  COMMUNITY_POSTS: '/community/posts',
  
  // Admin
  ADMIN_STATS: '/admin/liquidity-stats',
  ADMIN_SEED: '/admin/seed-data',
  
  // Health
  HEALTH: '/health',
  HEALTH_DB: '/health/db',
  HEALTH_AUTH: '/health/auth',
  HEALTH_STORAGE: '/health/storage',
  HEALTH_KV: '/health/kv',
  JOBS_STATUS: '/jobs/status',
};

// ============================================================================
// EXPORTS
// ============================================================================

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
