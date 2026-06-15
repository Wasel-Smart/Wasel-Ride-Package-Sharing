/**
 * ApiGateway
 *
 * Single typed facade over outbound HTTP traffic.
 */

import { API_URL, fetchWithRetry, getAuthDetails, publicAnonKey } from './core';
import {
  CircuitBreaker,
  createRequestContext,
  createSignedHeaders,
  recordMetric,
  startTelemetrySpan,
  toRequestHeaders,
  validateJwtClaims,
  withTimeout,
} from '@/platform';
import { logger } from '../utils/logging';

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

const apiGatewayCircuit = new CircuitBreaker({
  cooldownMs: 10_000,
  failureThreshold: 3,
  successThreshold: 2,
});

function isConfigured(): boolean {
  return Boolean(API_URL && publicAnonKey);
}

function getRequestLocale(): string {
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en';
}

function isStrictJwtValidationEnabled(): boolean {
  return import.meta.env.MODE !== 'test';
}

async function buildHeaders(
  requireAuth: boolean,
  body?: unknown,
): Promise<Record<string, string>> {
  const requestContext = createRequestContext(getRequestLocale());
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    ...toRequestHeaders(requestContext),
  };

  if (!requireAuth) {
    return base;
  }

  const { token } = await getAuthDetails();
  const validation = validateJwtClaims(token, {
    issuerIncludes: 'supabase',
    requiredClaims: ['sub', 'exp'],
  });

  if (!validation.isValid) {
    if (!isStrictJwtValidationEnabled()) {
      return {
        ...base,
        ...(body === undefined ? {} : await createSignedHeaders(body, token)),
        Authorization: `Bearer ${token}`,
      };
    }

    throw new GatewayError(
      validation.reason ?? 'JWT validation failed before request dispatch.',
      401,
      'local.jwt.validation',
    );
  }

  return {
    ...base,
    ...(body === undefined ? {} : await createSignedHeaders(body, token)),
    Authorization: `Bearer ${token}`,
  };
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
      'API gateway is not configured. Set VITE_API_URL and Supabase keys.',
      0,
      path,
    );
  }

  if (!apiGatewayCircuit.canExecute()) {
    throw new GatewayError(
      'Circuit breaker is open for the API gateway. Refusing a risky outbound request.',
      503,
      path,
      { circuit: apiGatewayCircuit.getSnapshot() },
    );
  }

  const url = `${API_URL}${path}`;
  const headers = await buildHeaders(requireAuth, body);
  const span = startTelemetrySpan(`api.${method.toLowerCase()} ${path}`, {
    method,
    path,
    requireAuth,
  });
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  let response: Response;

  try {
    response = await withTimeout(
      () => fetchWithRetry(url, {
        headers,
        method,
        timeout,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
      timeout + 1_000,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    apiGatewayCircuit.recordFailure();
    span.fail(error, { path, stage: 'network' });
    recordMetric({
      name: 'api.request.failure',
      value: 1,
      unit: 'count',
      tags: { method, path, reason: 'network' },
    });
    logger.warning(`[ApiGateway] Network error on ${method} ${path}`, { error: message });
    throw new GatewayError(`Network error: ${message}`, 0, path, { method });
  }

  if (!response.ok) {
    let errorMessage = `${method} ${path} failed with status ${response.status}`;
    try {
      const payload = await response.json() as { error?: string; message?: string };
      errorMessage = payload.error ?? payload.message ?? errorMessage;
    } catch {
      // Keep the default error message when the body is not JSON.
    }

    apiGatewayCircuit.recordFailure();
    span.fail(new Error(errorMessage), { path, status: response.status });
    recordMetric({
      name: 'api.request.failure',
      value: 1,
      unit: 'count',
      tags: { method, path, reason: 'response', status: response.status },
    });
    logger.warning(`[ApiGateway] ${errorMessage}`, { method, path, status: response.status });
    throw new GatewayError(errorMessage, response.status, path, { method });
  }

  try {
    const duration = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt,
    );
    apiGatewayCircuit.recordSuccess();
    span.end({ durationMs: duration, status: response.status });
    recordMetric({
      name: 'api.request.success',
      value: duration,
      unit: 'ms',
      tags: { method, path, status: response.status },
    });
    return (await response.json()) as T;
  } catch (error) {
    apiGatewayCircuit.recordFailure();
    span.fail(error, { path, stage: 'parse' });
    throw new GatewayError(`Failed to parse JSON from ${method} ${path}`, response.status, path);
  }
}

export const apiGateway = {
  async get<T>(path: string, opts?: { timeout?: number }): Promise<T> {
    return executeRequest<T>('GET', path, undefined, opts);
  },

  async post<T>(path: string, body: unknown, opts?: { timeout?: number }): Promise<T> {
    return executeRequest<T>('POST', path, body, opts);
  },

  async put<T>(path: string, body: unknown, opts?: { timeout?: number }): Promise<T> {
    return executeRequest<T>('PUT', path, body, opts);
  },

  async patch<T>(path: string, body: unknown, opts?: { timeout?: number }): Promise<T> {
    return executeRequest<T>('PATCH', path, body, opts);
  },

  async delete<T>(path: string, opts?: { timeout?: number }): Promise<T> {
    return executeRequest<T>('DELETE', path, undefined, opts);
  },

  async health(timeout = 5_000): Promise<boolean> {
    if (!isConfigured()) {
      return false;
    }

    try {
      const headers = await buildHeaders(false).catch(() => ({
        Authorization: `Bearer ${publicAnonKey}`,
      }));

      const response = await withTimeout(
        () => fetchWithRetry(`${API_URL}/health`, {
          headers,
          method: 'GET',
          timeout,
        }),
        timeout + 500,
      );

      return response.ok;
    } catch {
      return false;
    }
  },

  isConfigured(): boolean {
    return isConfigured();
  },
};

export type ApiGateway = typeof apiGateway;
