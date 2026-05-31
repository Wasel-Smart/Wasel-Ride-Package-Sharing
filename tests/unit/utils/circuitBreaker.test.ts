/**
 * Circuit Breaker Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitState } from '@/utils/circuitBreaker';

describe('Circuit Breaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-breaker', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
    });
  });

  it('should start in CLOSED state', () => {
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute successful operations', async () => {
    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
  });

  it('should open after threshold failures', async () => {
    const failingFn = async () => {
      throw new Error('Failed');
    };

    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(failingFn);
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should reject calls when OPEN', async () => {
    // Force open state
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Failed');
        });
      } catch {
        // Expected
      }
    }

    await expect(
      breaker.execute(async () => 'success')
    ).rejects.toThrow('Circuit breaker test-breaker is OPEN');
  });

  it('should transition to HALF_OPEN after timeout', async () => {
    // Open the breaker
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Failed');
        });
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Next call should transition to HALF_OPEN
    try {
      await breaker.execute(async () => 'success');
    } catch {
      // May fail but should transition
    }

    const state = breaker.getState();
    expect([CircuitState.HALF_OPEN, CircuitState.CLOSED]).toContain(state);
  });

  it('should close after successful recovery', async () => {
    // Open the breaker
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Failed');
        });
      } catch {
        // Expected
      }
    }

    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Successful calls to close
    await breaker.execute(async () => 'success');
    await breaker.execute(async () => 'success');

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should track statistics', async () => {
    await breaker.execute(async () => 'success');
    
    const stats = breaker.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failures).toBe(0);
  });

  it('should reset manually', async () => {
    // Open the breaker
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Failed');
        });
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);

    breaker.reset();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });
});
