/**
 * Circuit-breaker recovery integration tests.
 *
 * Verifies that the OPEN-circuit-breaker error is recognised as a recoverable
 * failure so the backend workflow layer can route to the direct-Supabase
 * fallback instead of surfacing the raw "Circuit breaker api-calls is OPEN"
 * message to the user (e.g. when updating profile info or loading the trust
 * center while the edge transport is degraded).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  circuitBreakers,
  CircuitState,
  isCircuitBreakerOpenError,
} from '@/utils/circuitBreaker';
import { isRecoverableError, runBackendWorkflow } from '@/services/backendWorkflow';
import { API_URL } from '@/services/core';

describe('Circuit breaker OPEN recovery', () => {
  beforeEach(() => {
    circuitBreakers.resetAll();
  });

  it('detects the circuit breaker OPEN error', () => {
    expect(isCircuitBreakerOpenError(new Error('Circuit breaker api-calls is OPEN'))).toBe(true);
    expect(isCircuitBreakerOpenError(new Error('Something else'))).toBe(false);
  });

  it('treats the OPEN circuit breaker error as recoverable', () => {
    expect(isRecoverableError(new Error('Circuit breaker api-calls is OPEN'))).toBe(true);
  });

  it('still trips the api-calls breaker after repeated failures', async () => {
    const breaker = circuitBreakers.get('api-calls');
    breaker.reset();
    for (let i = 0; i < 5; i += 1) {
      try {
        await breaker.execute(async () => {
          throw new Error('network failure');
        });
      } catch {
        // ignore, we are accumulating failures
      }
    }
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('routes to the direct fallback when the edge keeps failing (CORS) and the breaker is OPEN', async () => {
    // Simulate the edge transport permanently failing, the way local dev
    // CORS errors do in this project.
    const failingFetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const originalFetch = globalThis.fetch;
    // @ts-expect-error - replace global fetch for the duration of the test
    globalThis.fetch = failingFetch;

    vi.spyOn(await import('@/services/core'), 'getAuthDetails').mockResolvedValue({
      token: 'test-token',
      userId: 'test-user',
    });

    const fallback = vi.fn(async () => ({ ok: true }));

    try {
      const result = await runBackendWorkflow({
        operation: 'Profile update',
        authMode: 'required',
        fallbackPolicy: 'writes-if-enabled',
        edge: async () => {
          await fetch(`${API_URL}/profile/test-user`, { method: 'PATCH' });
          return { ok: false };
        },
        fallback,
      });

      expect(result).toEqual({ ok: true });
      expect(fallback).toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

