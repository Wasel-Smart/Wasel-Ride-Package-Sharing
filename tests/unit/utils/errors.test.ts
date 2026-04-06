/**
 * Error utilities — Unit Tests
 *
 * Covers: WaselError hierarchy, normalizeError, shouldIgnoreError,
 * formatErrorMessage — all pure functions, no mocks needed.
 */
import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  AuthorizationError,
  ConfigError,
  IgnorableSystemError,
  NetworkError,
  PaymentError,
  TimeoutError,
  ValidationError,
  WaselError,
  formatErrorMessage,
  normalizeError,
  shouldIgnoreError,
} from '@/utils/errors';

// ── WaselError base class ─────────────────────────────────────────────────────

describe('WaselError', () => {
  it('sets message, code, name, and isIgnorable', () => {
    const err = new WaselError('Something failed', 'CUSTOM_CODE', false);
    expect(err.message).toBe('Something failed');
    expect(err.code).toBe('CUSTOM_CODE');
    expect(err.name).toBe('WaselError');
    expect(err.isIgnorable).toBe(false);
  });

  it('defaults isIgnorable to false', () => {
    const err = new WaselError('msg', 'CODE');
    expect(err.isIgnorable).toBe(false);
  });

  it('stores optional context', () => {
    const err = new WaselError('msg', 'CODE', false, { userId: 'u1' });
    expect(err.context).toEqual({ userId: 'u1' });
  });

  it('is an instance of Error', () => {
    expect(new WaselError('msg', 'CODE')).toBeInstanceOf(Error);
  });
});

// ── Subclasses ────────────────────────────────────────────────────────────────

describe('Error subclasses', () => {
  it('AuthenticationError has code AUTH_ERROR and is not ignorable', () => {
    const err = new AuthenticationError('Bad token');
    expect(err.code).toBe('AUTH_ERROR');
    expect(err.isIgnorable).toBe(false);
    expect(err.name).toBe('AuthenticationError');
  });

  it('AuthorizationError has code AUTHORIZATION_ERROR', () => {
    const err = new AuthorizationError('Forbidden');
    expect(err.code).toBe('AUTHORIZATION_ERROR');
    expect(err.isIgnorable).toBe(false);
  });

  it('NetworkError is ignorable', () => {
    const err = new NetworkError('fetch failed');
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.isIgnorable).toBe(true);
  });

  it('ValidationError is not ignorable', () => {
    const err = new ValidationError('Missing field');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.isIgnorable).toBe(false);
  });

  it('PaymentError is not ignorable', () => {
    const err = new PaymentError('Card declined');
    expect(err.code).toBe('PAYMENT_ERROR');
    expect(err.isIgnorable).toBe(false);
  });

  it('TimeoutError is ignorable', () => {
    const err = new TimeoutError('deadline exceeded');
    expect(err.code).toBe('TIMEOUT_ERROR');
    expect(err.isIgnorable).toBe(true);
  });

  it('ConfigError is not ignorable', () => {
    const err = new ConfigError('Missing env var');
    expect(err.code).toBe('CONFIG_ERROR');
    expect(err.isIgnorable).toBe(false);
  });

  it('IgnorableSystemError is ignorable', () => {
    const err = new IgnorableSystemError('IframeMessageAbortError');
    expect(err.code).toBe('IGNORABLE_SYSTEM_ERROR');
    expect(err.isIgnorable).toBe(true);
  });

  it('subclass errors are instanceof WaselError', () => {
    expect(new AuthenticationError('x')).toBeInstanceOf(WaselError);
    expect(new NetworkError('x')).toBeInstanceOf(WaselError);
    expect(new PaymentError('x')).toBeInstanceOf(WaselError);
  });
});

// ── normalizeError ────────────────────────────────────────────────────────────

describe('normalizeError()', () => {
  it('passes WaselError instances through unchanged', () => {
    const original = new AuthenticationError('already typed');
    expect(normalizeError(original)).toBe(original);
  });

  it('converts ignorable system error messages', () => {
    const err = normalizeError(new Error('IframeMessageAbortError from iframe'));
    expect(err).toBeInstanceOf(IgnorableSystemError);
  });

  it('converts fetch-related messages to NetworkError', () => {
    const err = normalizeError(new Error('fetch failed unexpectedly'));
    expect(err).toBeInstanceOf(NetworkError);
  });

  it('converts ECONNREFUSED to NetworkError', () => {
    const err = normalizeError(new Error('ECONNREFUSED 127.0.0.1:5432'));
    expect(err).toBeInstanceOf(NetworkError);
  });

  it('converts Unauthorized message to AuthenticationError', () => {
    const err = normalizeError(new Error('Unauthorized: invalid_jwt'));
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it('converts Invalid credentials to AuthenticationError', () => {
    const err = normalizeError(new Error('Invalid credentials supplied'));
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it('converts permission-related messages to AuthorizationError', () => {
    const err = normalizeError(new Error('permission denied for table trips'));
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('converts Forbidden to AuthorizationError', () => {
    const err = normalizeError(new Error('Forbidden'));
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('converts payment-related messages to PaymentError', () => {
    const err = normalizeError(new Error('stripe payment declined'));
    expect(err).toBeInstanceOf(PaymentError);
  });

  it('converts timed out messages to TimeoutError', () => {
    const err = normalizeError(new Error('request timed out after 5000ms'));
    expect(err).toBeInstanceOf(TimeoutError);
  });

  it('converts validation-related messages to ValidationError', () => {
    const err = normalizeError(new Error('validation failed: required field missing'));
    expect(err).toBeInstanceOf(ValidationError);
  });

  it('handles plain string errors', () => {
    const err = normalizeError('something went wrong');
    expect(err.message).toBe('something went wrong');
  });

  it('handles null gracefully', () => {
    const err = normalizeError(null);
    expect(err.message).toBe('An unknown error occurred');
  });

  it('handles undefined gracefully', () => {
    const err = normalizeError(undefined);
    expect(err.message).toBe('An unknown error occurred');
  });

  it('handles arbitrary objects gracefully', () => {
    const err = normalizeError({ weird: true });
    expect(err.message).toBe('An unknown error occurred');
  });

  it('forwards context to the resulting error', () => {
    const err = normalizeError(new Error('fetch failed'), { route: '/api/trips' });
    expect(err.context).toEqual({ route: '/api/trips' });
  });
});

// ── shouldIgnoreError ─────────────────────────────────────────────────────────

describe('shouldIgnoreError()', () => {
  it('returns true for NetworkError (ignorable)', () => {
    expect(shouldIgnoreError(new NetworkError('failed'))).toBe(true);
  });

  it('returns true for TimeoutError (ignorable)', () => {
    expect(shouldIgnoreError(new TimeoutError('timed out'))).toBe(true);
  });

  it('returns true for IgnorableSystemError', () => {
    expect(shouldIgnoreError(new IgnorableSystemError('msg'))).toBe(true);
  });

  it('returns false for AuthenticationError (not ignorable)', () => {
    expect(shouldIgnoreError(new AuthenticationError('bad token'))).toBe(false);
  });

  it('returns false for PaymentError (not ignorable)', () => {
    expect(shouldIgnoreError(new PaymentError('declined'))).toBe(false);
  });

  it('returns false for plain Error', () => {
    expect(shouldIgnoreError(new Error('unknown'))).toBe(false);
  });

  it('normalizes and checks plain fetch-error strings', () => {
    expect(shouldIgnoreError(new Error('NetworkError: fetch failed'))).toBe(true);
  });
});

// ── formatErrorMessage ────────────────────────────────────────────────────────

describe('formatErrorMessage()', () => {
  it('returns user-friendly message for AUTH_ERROR', () => {
    expect(formatErrorMessage(new AuthenticationError('bad token'))).toBe(
      'Authentication failed. Please log in again.',
    );
  });

  it('returns user-friendly message for NETWORK_ERROR', () => {
    expect(formatErrorMessage(new NetworkError('fetch failed'))).toBe(
      'Network connection error. Please check your connection.',
    );
  });

  it('returns user-friendly message for PAYMENT_ERROR', () => {
    expect(formatErrorMessage(new PaymentError('stripe error'))).toBe(
      'Payment processing failed. Please try again.',
    );
  });

  it('returns user-friendly message for VALIDATION_ERROR', () => {
    expect(formatErrorMessage(new ValidationError('invalid field'))).toBe(
      'Invalid data provided. Please check your input.',
    );
  });

  it('returns user-friendly message for TIMEOUT_ERROR', () => {
    expect(formatErrorMessage(new TimeoutError('timed out'))).toBe(
      'Request timed out. Please try again.',
    );
  });

  it('returns empty string for IGNORABLE_SYSTEM_ERROR (not user-facing)', () => {
    expect(formatErrorMessage(new IgnorableSystemError('iframe error'))).toBe('');
  });

  it('returns generic fallback for UNKNOWN_ERROR', () => {
    const msg = formatErrorMessage(new Error('something unusual'));
    expect(msg).toBeTruthy();
  });
});
