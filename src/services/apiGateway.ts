/**
 * ApiGateway
 *
 * A single, typed façade over all outbound network calls.
 *
 * WHY THIS EXISTS
 * ───────────────
 * Without a gateway, business services (rideLifecycle, walletApi, etc.)
 * each call `fetchWithRetry` / `supabase.*` directly. That means:
 *
 *   - Auth header injection is repeated in every caller
 *   - Request/response logging has no central home
 *   - Mocking the network in tests requires patching many modules
 *   - Changing the backend URL or auth scheme requires touching every file
 *
 * The gateway fixes all four problems by acting as the *only* module
 * allowed to build raw HTTP or Supabase calls.
 *
 * USAGE
 * ─────
 * import { apiGateway } from '@/services/apiGateway';
 *
 * // Authenticated JSON POST
 * const data = await apiGateway.post<MyResponseType>('/wallet/withdraw', { amount: 50 });
 *
 * // Authenticated JSON GET
 * const wallet = await apiGateway.get<WalletData>('/wallet');
 *
 * // Health probe (no auth required)
 * const healthy = await apiGateway.health();
 *
 * DESIGN RULES
 * ────────────
 *  1. This module never imports from feature modules. Dependency
 *     direction is strictly: features → gateway → core/supabase.
 *  2. All public methods are async and return typed values (never raw Response).
 *  3. Network errors surface as typed GatewayError instances, never plain strings.
 *  4. Auth tokens are obtained once per request; no caller manages Bearer headers.
 */

import { API_URL, fetchWithRetry, getAuthDetails, publicAnonKey } from './core';
import { logger } from '../utils/logging';

// ─── Gateway error ────────────────────────────────────────────────────────────

export class GatewayError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return Boolean(API_URL && publicAnonKey);
}

async function buildHeaders(requireAuth: boolean): Promise<Record<string, string>> {
  const base: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!requireAuth) return base;

  const { token } = await getAuthDetails();
  return { ...base, Authorization: `Bearer ${token}` };
}

async function executeRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  opts: { requireAuth?: boolean; timeout?: number } = {},
): Promise<T> {
  const { requireAuth = true, timeout = 8_000 } = opts;

  if (!isConfigured()) {
    throw new GatewayError(
      `API gateway is not configured. Set VITE_API_URL and Supabase keys.`,
      0,
      path,
    );
  }

  const url = `${API_URL}${path}`;
  const headers = await buildHeaders(requireAuth);

  let response: Response;

  try {
    response = await fetchWithRetry(url, {
      headers,
      method,
      timeout,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warning(`[ApiGateway] Network error on ${method} ${path}`, { error: message });
    throw new GatewayError(`Network error: ${message}`, 0, path, { method });
  }

  if (!response.ok) {
    let errorMessage = `${method} ${path} failed with status ${response.status}`;
    try {
      const payload = await response.json() as { error?: string; message?: string };
      errorMessage = payload.error ?? payload.message ?? errorMessage;
    } catch {
      // Non-JSON error body — keep the default message.
    }

    logger.warning(`[ApiGateway] ${errorMessage}`, { method, path, status: response.status });
    throw new GatewayError(errorMessage, response.status, path, { method });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new GatewayError(`Failed to parse JSON from ${method} ${path}`, response.status, path);
  }
}

// ─── Public gateway object ────────────────────────────────────────────────────

export const apiGateway = {
  /**
   * Perform an authenticated GET request and return the parsed JSON body.
   *
   * @example
   * const wallet = await apiGateway.get<WalletData>('/wallet');
   */
  async get<T>(path: string, opts?: { timeout?: number }): Promise<T> {
    return executeRequest<T>('GET', path, undefined, opts);
  },

  /**
   * Perform an authenticated POST request and return the parsed JSON body.
   *
   * @example
   * const intent = await apiGateway.post<PaymentIntent>('/payments/create-intent', { amount: 50 });
   */
  async post<T>(path: string, body: unknown, opts?: { timeout?: number }): Promise<T> {
    return executeRequest<T>('POST', path, body, opts);
  },

  /**
   * Perform an authenticated PUT request.
   */
  async put<T>(path: string, body: unknown, opts?: { timeout?: number }): Promise<T> {
    return executeRequest<T>('PUT', path, body, opts);
  },

  /**
   * Perform an authenticated PATCH request.
   */
  async patch<T>(path: string, body: unknown, opts?: { timeout?: number }): Promise<T> {
    return executeRequest<T>('PATCH', path, body, opts);
  },

  /**
   * Perform an authenticated DELETE request.
   */
  async delete<T>(path: string, opts?: { timeout?: number }): Promise<T> {
    return executeRequest<T>('DELETE', path, undefined, opts);
  },

  /**
   * Probe the backend health endpoint.
   * Returns true when the backend is reachable and healthy.
   * Never throws — returns false on any error.
   *
   * @example
   * const healthy = await apiGateway.health();
   */
  async health(timeout = 5_000): Promise<boolean> {
    if (!isConfigured()) return false;

    try {
      const headers = await buildHeaders(false).catch(() => ({
        Authorization: `Bearer ${publicAnonKey}`,
      }));

      const response = await fetchWithRetry(`${API_URL}/health`, {
        headers,
        method: 'GET',
        timeout,
      });

      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * True when the gateway has a configured API_URL and anon key.
   * Use this to decide whether to attempt network calls at all.
   */
  isConfigured(): boolean {
    return isConfigured();
  },
};

export type ApiGateway = typeof apiGateway;
