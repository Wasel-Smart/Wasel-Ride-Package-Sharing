/**
 * Security Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';import { CSRF } from '@/utils/csrf';
import { sessionManager } from '@/utils/sessionManager';
import { circuitBreakers, CircuitState } from '@/utils/circuitBreaker';

describe('CSRF Protection', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should generate CSRF token', () => {
    const token = CSRF.generateToken();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(0);
  });

  it('should validate correct CSRF token', () => {
    const token = CSRF.generateToken();
    const isValid = CSRF.validateToken(token);
    expect(isValid).toBe(true);
  });

  it('should reject invalid CSRF token', () => {
    CSRF.generateToken();
    const isValid = CSRF.validateToken('invalid-token');
    expect(isValid).toBe(false);
  });

  it('should add CSRF header', () => {
    const headers = CSRF.addHeader();
    expect(headers.has('X-CSRF-Token')).toBe(true);
  });

  it('should reject expired CSRF token', async () => {
    const token = CSRF.generateToken();
    
    // Mock expired token
    const expiredData = {
      token,
      expiresAt: Date.now() - 1000,
    };
    sessionStorage.setItem('wasel_csrf_token', JSON.stringify(expiredData));
    
    const isValid = CSRF.validateToken(token);
    expect(isValid).toBe(false);
  });
});

describe('Session Management', () => {
  beforeEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start a new session', () => {
    const metadata = sessionManager.startSession('test-user-id');
    expect(metadata.sessionId).toBeDefined();
    expect(metadata.isActive).toBe(true);
  });

  it('should validate active session', () => {
    sessionManager.startSession('test-user-id');
    const isValid = sessionManager.isSessionValid();
    expect(isValid).toBe(true);
  });

  it('should end session', () => {
    sessionManager.startSession('test-user-id');
    sessionManager.endSession();
    const isValid = sessionManager.isSessionValid();
    expect(isValid).toBe(false);
  });

  it('should extend session', () => {
    const now = new Date('2026-06-06T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    sessionManager.startSession('test-user-id');

    vi.setSystemTime(new Date(now.getTime() + 1000));
    const before = sessionManager.getTimeUntilTimeout();

    sessionManager.extendSession();

    const after = sessionManager.getTimeUntilTimeout();
    expect(after).toBeGreaterThan(before);
  });

  it('should get session stats', () => {
    sessionManager.startSession('test-user-id');
    const stats = sessionManager.getSessionStats();
    
    expect(stats.isActive).toBe(true);
    expect(stats.timeRemaining).toBeGreaterThan(0);
    expect(stats.sessionDuration).toBeGreaterThanOrEqual(0);
  });
});

describe('Circuit Breaker', () => {
  it('should start in CLOSED state', () => {
    const breaker = circuitBreakers.get('test-service');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute successful function', async () => {
    const breaker = circuitBreakers.get('test-success');
    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
  });

  it('should open after threshold failures', async () => {
    const breaker = circuitBreakers.get('test-failures', {
      failureThreshold: 3,
      timeout: 1000,
    });

    // Trigger failures
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Test failure');
        });
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should fail fast when OPEN', async () => {
    const breaker = circuitBreakers.get('test-open', {
      failureThreshold: 1,
      timeout: 60000,
    });

    // Trigger failure to open circuit
    try {
      await breaker.execute(async () => {
        throw new Error('Test failure');
      });
    } catch {
      // Expected
    }

    // Should fail fast
    await expect(
      breaker.execute(async () => 'should not execute')
    ).rejects.toThrow('Circuit breaker');
  });

  it('should reset circuit breaker', () => {
    const breaker = circuitBreakers.get('test-reset');
    breaker.reset();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });
});

describe('API Integration', () => {
  it('should add CSRF token to POST requests', () => {
    CSRF.generateToken();
    const headers = CSRF.addHeader({ 'Content-Type': 'application/json' });

    expect(headers.has('X-CSRF-Token')).toBe(true);
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('should validate API URLs', async () => {
    const { validateApiUrl } = await import('@/utils/sanitization');
    
    const validUrl = 'https://example.supabase.co/api';
    const invalidUrl = 'https://evil.com/api';
    
    expect(validateApiUrl(validUrl, ['supabase.co'])).toBe(true);
    expect(validateApiUrl(invalidUrl, ['supabase.co'])).toBe(false);
  });
});
