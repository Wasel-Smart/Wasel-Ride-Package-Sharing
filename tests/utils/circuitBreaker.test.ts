/**
 * tests/utils/circuitBreaker.test.ts
 *
 * Unit tests for src/utils/circuitBreaker.ts
 * Covers: CLOSED → OPEN → HALF_OPEN → CLOSED state transitions, fail-fast
 * behavior while OPEN, reopening on a failed recovery probe, manual reset,
 * and the CircuitBreakerRegistry / withCircuitBreaker helpers.
 *
 * State-machine assertions below were verified against an isolated
 * simulation of the same transition logic before being committed here.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  circuitBreakers,
  withCircuitBreaker,
} from '@/utils/circuitBreaker';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Basic state transitions ───────────────────────────────────────────────────

describe('CircuitBreaker state transitions', () => {
  it('starts CLOSED', () => {
    const cb = new CircuitBreaker('starts-closed');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('opens after reaching the failure threshold', async () => {
    const cb = new CircuitBreaker('opens-on-threshold', { failureThreshold: 3 });
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    }
    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('stays CLOSED if failures do not reach the threshold', async () => {
    const cb = new CircuitBreaker('stays-closed', { failureThreshold: 3 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('resets the failure count after a success', async () => {
    const cb = new CircuitBreaker('resets-on-success', { failureThreshold: 3 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await cb.execute(() => Promise.resolve('ok'));
    // Two more failures should NOT be enough to open it, since the count reset
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('fails fast without invoking the wrapped function while OPEN', async () => {
    const cb = new CircuitBreaker('fails-fast', { failureThreshold: 1, timeout: 10_000 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    let called = false;
    await expect(
      cb.execute(() => {
        called = true;
        return Promise.resolve('should not run');
      }),
    ).rejects.toThrow(/is OPEN/);
    expect(called).toBe(false);
  });

  it('moves to HALF_OPEN and then CLOSED after the timeout elapses and a probe succeeds', async () => {
    const cb = new CircuitBreaker('recovers', { failureThreshold: 1, timeout: 30, successThreshold: 1 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    await sleep(40); // exceed the configured timeout

    const result = await cb.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });

  it('reopens immediately if the HALF_OPEN recovery probe fails', async () => {
    const cb = new CircuitBreaker('reopens-on-failed-probe', { failureThreshold: 1, timeout: 20 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    await sleep(30);

    await expect(cb.execute(() => Promise.reject(new Error('still failing')))).rejects.toThrow(
      'still failing',
    );
    expect(cb.getState()).toBe(CircuitState.OPEN);
  });

  it('requires successThreshold consecutive successes before closing from HALF_OPEN', async () => {
    const cb = new CircuitBreaker('needs-two-successes', {
      failureThreshold: 1,
      timeout: 20,
      successThreshold: 2,
    });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await sleep(30);

    await cb.execute(() => Promise.resolve('probe 1'));
    expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

    await cb.execute(() => Promise.resolve('probe 2'));
    expect(cb.getState()).toBe(CircuitState.CLOSED);
  });
});

// ── Manual reset & stats ──────────────────────────────────────────────────────

describe('CircuitBreaker.reset() and getStats()', () => {
  it('reset() forces the breaker back to CLOSED with zeroed counters', async () => {
    const cb = new CircuitBreaker('manual-reset', { failureThreshold: 1 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe(CircuitState.OPEN);

    cb.reset();

    expect(cb.getState()).toBe(CircuitState.CLOSED);
    expect(cb.getStats().failures).toBe(0);
  });

  it('getStats() reports the current failure count and state', async () => {
    const cb = new CircuitBreaker('stats', { failureThreshold: 5 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();

    const stats = cb.getStats();
    expect(stats.failures).toBe(2);
    expect(stats.state).toBe(CircuitState.CLOSED);
  });
});

// ── CircuitBreakerRegistry ─────────────────────────────────────────────────────

describe('circuitBreakers registry', () => {
  it('returns the same instance for repeated calls with the same name', () => {
    const a = circuitBreakers.get('shared-name-test');
    const b = circuitBreakers.get('shared-name-test');
    expect(a).toBe(b);
  });

  it('creates independent breakers for different names', async () => {
    const a = circuitBreakers.get('registry-a', { failureThreshold: 1 });
    const b = circuitBreakers.get('registry-b', { failureThreshold: 1 });
    await expect(a.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(a.getState()).toBe(CircuitState.OPEN);
    expect(b.getState()).toBe(CircuitState.CLOSED);
  });

  it('getAllStats() includes every registered breaker', () => {
    circuitBreakers.get('stats-registry-check');
    const all = circuitBreakers.getAllStats();
    expect(all['stats-registry-check']).toBeDefined();
  });

  it('reset(name) resets only the named breaker', async () => {
    const a = circuitBreakers.get('reset-by-name-a', { failureThreshold: 1 });
    await expect(a.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(a.getState()).toBe(CircuitState.OPEN);

    circuitBreakers.reset('reset-by-name-a');
    expect(a.getState()).toBe(CircuitState.CLOSED);
  });
});

// ── withCircuitBreaker helper ─────────────────────────────────────────────────

describe('withCircuitBreaker()', () => {
  it('wraps a function and lets successful calls through', async () => {
    const wrapped = withCircuitBreaker<string>('with-cb-helper-success');
    const result = await wrapped(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('propagates rejection from the wrapped function', async () => {
    const wrapped = withCircuitBreaker<string>('with-cb-helper-failure');
    await expect(wrapped(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  });
});
