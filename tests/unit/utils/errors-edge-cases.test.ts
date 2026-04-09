/**
 * Error utilities — Additional edge-case tests
 *
 * Supplements errors.test.ts with:
 *   - WaselError subclass identity checks
 *   - normalizeError for Supabase-style error objects
 *   - formatErrorMessage locale accuracy
 *   - shouldIgnoreError with nested ignorable errors
 */
import { describe, it, expect } from 'vitest';
import {
  WaselError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  PaymentError,
  TimeoutError,
  ConfigError,
  IgnorableSystemError,
  normalizeError,
  shouldIgnoreError,
  formatErrorMessage,
} from '../../../src/utils/errors';

// ── Subclass identity ──────────────────────────────────────────────────────

describe('WaselError subclasses — identity', () => {
  it('AuthenticationError is instanceof WaselError and Error', () => {
    const err = new AuthenticationError('bad creds');
    expect(err).toBeInstanceOf(WaselError);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.code).toBe('AUTH_ERROR');
    expect(err.isIgnorable).toBe(false);
  });

  it('NetworkError is ignorable', () => {
    const err = new NetworkError('fetch failed');
    expect(err.isIgnorable).toBe(true);
    expect(err.code).toBe('NETWORK_ERROR');
  });

  it('TimeoutError is ignorable', () => {
    const err = new TimeoutError('timeout');
    expect(err.isIgnorable).toBe(true);
    expect(err.code).toBe('TIMEOUT_ERROR');
  });

  it('IgnorableSystemError is ignorable', () => {
    const err = new IgnorableSystemError('figma_app-something');
    expect(err.isIgnorable).toBe(true);
  });

  it('ValidationError is NOT ignorable', () => {
    const err = new ValidationError('invalid field');
    expect(err.isIgnorable).toBe(false);
  });

  it('PaymentError carries code PAYMENT_ERROR', () => {
    const err = new PaymentError('stripe declined');
    expect(err.code).toBe('PAYMENT_ERROR');
    expect(err.name).toBe('PaymentError');
  });

  it('ConfigError carries code CONFIG_ERROR', () => {
    const err = new ConfigError('env missing');
    expect(err.code).toBe('CONFIG_ERROR');
    expect(err.name).toBe('ConfigError');
  });
});

// ── normalizeError ─────────────────────────────────────────────────────────

describe('normalizeError', () => {
  it('returns WaselError unchanged', () => {
    const err = new AuthenticationError('test');
    expect(normalizeError(err)).toBe(err);
  });

  it('classifies fetch failure as NetworkError', () => {
    const result = normalizeError(new Error('Failed to fetch'));
    expect(result).toBeInstanceOf(NetworkError);
  });

  it('classifies "unauthorized" message as AuthenticationError', () => {
    const result = normalizeError(new Error('unauthorized access'));
    expect(result).toBeInstanceOf(AuthenticationError);
  });

  it('classifies "payment" message as PaymentError', () => {
    const result = normalizeError(new Error('payment processing failed'));
    expect(result).toBeInstanceOf(PaymentError);
  });

  it('classifies "timeout" message as TimeoutError', () => {
    const result = normalizeError(new Error('request timed out'));
    expect(result).toBeInstanceOf(TimeoutError);
  });

  it('classifies IframeMessageAbortError as IgnorableSystemError', () => {
    const result = normalizeError(new Error('IframeMessageAbortError from figma_app-xyz'));
    expect(result).toBeInstanceOf(IgnorableSystemError);
    expect(result.isIgnorable).toBe(true);
  });

  it('normalizes a plain string to WaselError with UNKNOWN_ERROR code', () => {
    const result = normalizeError('something went wrong');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('something went wrong');
  });

  it('normalizes null to WaselError with UNKNOWN_ERROR', () => {
    const result = normalizeError(null);
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('attaches passed context to the error', () => {
    const ctx = { userId: 'u-123', operation: 'signIn' };
    const result = normalizeError(new Error('connection reset'), ctx);
    expect(result.context).toEqual(ctx);
  });
});

// ── shouldIgnoreError ──────────────────────────────────────────────────────

describe('shouldIgnoreError', () => {
  it('returns true for NetworkError (ignorable by design)', () => {
    expect(shouldIgnoreError(new NetworkError('offline'))).toBe(true);
  });

  it('returns false for AuthenticationError', () => {
    expect(shouldIgnoreError(new AuthenticationError('bad token'))).toBe(false);
  });

  it('returns true for raw Error whose message matches ignorable pattern', () => {
    expect(shouldIgnoreError(new Error('Failed to fetch due to network error'))).toBe(true);
  });

  it('returns false for plain string error', () => {
    expect(shouldIgnoreError('unknown issue')).toBe(false);
  });

  it('returns false for null', () => {
    expect(shouldIgnoreError(null)).toBe(false);
  });
});

// ── formatErrorMessage ─────────────────────────────────────────────────────

describe('formatErrorMessage', () => {
  it('returns empty string for IgnorableSystemError (never shown to users)', () => {
    const msg = formatErrorMessage(new IgnorableSystemError('figma noise'));
    expect(msg).toBe('');
  });

  it('returns human-readable message for AUTH_ERROR', () => {
    const msg = formatErrorMessage(new AuthenticationError('invalid_jwt'));
    expect(msg).toMatch(/authentication failed/i);
  });

  it('returns human-readable message for NETWORK_ERROR', () => {
    const msg = formatErrorMessage(new NetworkError('offline'));
    expect(msg).toMatch(/network/i);
  });

  it('returns human-readable message for PAYMENT_ERROR', () => {
    const msg = formatErrorMessage(new PaymentError('declined'));
    expect(msg).toMatch(/payment/i);
  });

  it('returns human-readable message for VALIDATION_ERROR', () => {
    const msg = formatErrorMessage(new ValidationError('email missing'));
    expect(msg).toMatch(/invalid/i);
  });

  it('returns correct message for UNKNOWN_ERROR', () => {
    const msg = formatErrorMessage(new WaselError('mystery', 'UNKNOWN_ERROR', false));
    expect(msg).toMatch(/unexpected error/i);
  });

  it('falls back to error message when code is not in the map', () => {
    const err = new WaselError('custom message here', 'CUSTOM_UNMAPPED_CODE', false);
    const msg = formatErrorMessage(err);
    expect(msg).toBe('custom message here');
  });
});
