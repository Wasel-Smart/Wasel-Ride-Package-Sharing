import { describe, expect, it } from 'vitest';
import {
  APP_ERROR_CODES,
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ConfigError,
  IgnorableSystemError,
  NetworkError,
  PaymentError,
  TimeoutError,
  ValidationError,
  WaselError,
  formatErrorDetails,
  formatErrorMessage,
  getErrorShape,
  normalizeError,
  shouldIgnoreError,
} from '@/utils/errors';

describe('WaselError', () => {
  it('stores the strict error shape', () => {
    const err = new WaselError({
      code: APP_ERROR_CODES.unknown,
      message: 'Something failed',
      meta: { userId: 'u1' },
      severity: 'critical',
      isIgnorable: false,
      name: 'CustomError',
    });

    expect(err.message).toBe('Something failed');
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.meta).toEqual({ userId: 'u1' });
    expect(err.context).toEqual({ userId: 'u1' });
    expect(err.severity).toBe('critical');
    expect(err.isIgnorable).toBe(false);
    expect(err.name).toBe('CustomError');
  });

  it('defaults severity and ignorable flags from the code definition', () => {
    const err = new WaselError({
      code: APP_ERROR_CODES.api,
      message: 'Backend unavailable',
    });

    expect(err.severity).toBe('error');
    expect(err.isIgnorable).toBe(false);
    expect(err.meta).toEqual({});
  });
});

describe('error subclasses', () => {
  it('expose stable code and severity contracts', () => {
    expect(new AuthenticationError('Bad token')).toMatchObject({
      code: 'AUTH_ERROR',
      severity: 'error',
      isIgnorable: false,
      name: 'AuthenticationError',
    });
    expect(new AuthorizationError('Forbidden')).toMatchObject({
      code: 'AUTHORIZATION_ERROR',
      severity: 'error',
      isIgnorable: false,
      name: 'AuthorizationError',
    });
    expect(new NetworkError('fetch failed')).toMatchObject({
      code: 'NETWORK_ERROR',
      severity: 'warning',
      isIgnorable: true,
      name: 'NetworkError',
    });
    expect(new ValidationError('Missing field')).toMatchObject({
      code: 'VALIDATION_ERROR',
      severity: 'error',
      isIgnorable: false,
      name: 'ValidationError',
    });
    expect(new PaymentError('Card declined')).toMatchObject({
      code: 'PAYMENT_ERROR',
      severity: 'critical',
      isIgnorable: false,
      name: 'PaymentError',
    });
    expect(new TimeoutError('deadline exceeded')).toMatchObject({
      code: 'TIMEOUT_ERROR',
      severity: 'warning',
      isIgnorable: true,
      name: 'TimeoutError',
    });
    expect(new ConfigError('Missing env var')).toMatchObject({
      code: 'CONFIG_ERROR',
      severity: 'critical',
      isIgnorable: false,
      name: 'ConfigError',
    });
    expect(new IgnorableSystemError('IframeMessageAbortError')).toMatchObject({
      code: 'IGNORABLE_SYSTEM_ERROR',
      severity: 'info',
      isIgnorable: true,
      name: 'IgnorableSystemError',
    });
    expect(new ApiError('Request failed')).toMatchObject({
      code: 'API_ERROR',
      severity: 'error',
      isIgnorable: false,
      name: 'ApiError',
    });
  });

  it('subclasses remain instanceof WaselError', () => {
    expect(new AuthenticationError('x')).toBeInstanceOf(WaselError);
    expect(new NetworkError('x')).toBeInstanceOf(WaselError);
    expect(new ApiError('x')).toBeInstanceOf(WaselError);
  });
});

describe('normalizeError()', () => {
  it('passes WaselError instances through unchanged', () => {
    const original = new AuthenticationError('already typed');
    expect(normalizeError(original)).toBe(original);
  });

  it('classifies ignorable system errors deterministically', () => {
    const err = normalizeError(new Error('IframeMessageAbortError from iframe'));
    expect(err).toBeInstanceOf(IgnorableSystemError);
    expect(getErrorShape(err)).toEqual({
      code: 'IGNORABLE_SYSTEM_ERROR',
      message: 'IframeMessageAbortError from iframe',
      meta: {},
      severity: 'info',
      isIgnorable: true,
    });
  });

  it('classifies network, auth, authorization, timeout, payment, validation, and api errors', () => {
    expect(normalizeError(new Error('fetch failed unexpectedly'))).toBeInstanceOf(NetworkError);
    expect(normalizeError(new Error('Unauthorized: invalid_jwt'))).toBeInstanceOf(AuthenticationError);
    expect(normalizeError(new Error('permission denied for table trips'))).toBeInstanceOf(AuthorizationError);
    expect(normalizeError(new Error('request timed out after 5000ms'))).toBeInstanceOf(TimeoutError);
    expect(normalizeError(new Error('stripe payment declined'))).toBeInstanceOf(PaymentError);
    expect(normalizeError(new Error('validation failed: required field missing'))).toBeInstanceOf(ValidationError);
    expect(
      normalizeError({ status: 503, message: 'Service unavailable' }),
    ).toBeInstanceOf(ApiError);
  });

  it('normalizes plain strings, null, undefined, and objects to unknown errors', () => {
    expect(normalizeError('something went wrong')).toMatchObject({
      code: 'UNKNOWN_ERROR',
      message: 'something went wrong',
      severity: 'error',
    });
    expect(normalizeError(null)).toMatchObject({
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      severity: 'error',
    });
    expect(normalizeError(undefined)).toMatchObject({
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      severity: 'error',
    });
    expect(normalizeError({ weird: true })).toMatchObject({
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      severity: 'error',
    });
  });

  it('uses nested causes when the wrapper is generic', () => {
    const wrapped = new Error('Outer wrapper') as Error & { cause?: unknown };
    wrapped.cause = new Error('Failed to fetch');

    const err = normalizeError(wrapped, { route: '/api/trips' });
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.meta).toEqual({ route: '/api/trips' });
  });

  it('extracts API style payload metadata and status codes', () => {
    const err = normalizeError(
      {
        status: 422,
        error: 'Request body invalid',
        meta: { field: 'email' },
      },
      { operation: 'signup' },
    );

    expect(err).toBeInstanceOf(ValidationError);
    expect(err.meta).toEqual({
      status: 422,
      field: 'email',
      operation: 'signup',
    });
  });
});

describe('shouldIgnoreError()', () => {
  it('returns true only for ignorable categories', () => {
    expect(shouldIgnoreError(new NetworkError('failed'))).toBe(true);
    expect(shouldIgnoreError(new TimeoutError('timed out'))).toBe(true);
    expect(shouldIgnoreError(new IgnorableSystemError('msg'))).toBe(true);
    expect(shouldIgnoreError(new AuthenticationError('bad token'))).toBe(false);
    expect(shouldIgnoreError(new PaymentError('declined'))).toBe(false);
    expect(shouldIgnoreError(new Error('unknown'))).toBe(false);
    expect(shouldIgnoreError(new Error('NetworkError: fetch failed'))).toBe(true);
  });
});

describe('formatErrorMessage()', () => {
  it('returns exact, deterministic display strings for every code', () => {
    expect(formatErrorMessage(new AuthenticationError('bad token'))).toBe(
      'Authentication failed. Please log in again.',
    );
    expect(formatErrorMessage(new AuthorizationError('forbidden'))).toBe(
      'You do not have permission to perform this action.',
    );
    expect(formatErrorMessage(new NetworkError('fetch failed'))).toBe(
      'Network connection error. Please check your connection.',
    );
    expect(formatErrorMessage(new ValidationError('invalid field'))).toBe(
      'Invalid data provided. Please check your input.',
    );
    expect(formatErrorMessage(new PaymentError('stripe error'))).toBe(
      'Payment processing failed. Please try again.',
    );
    expect(formatErrorMessage(new TimeoutError('timed out'))).toBe(
      'Request timed out. Please try again.',
    );
    expect(formatErrorMessage(new ConfigError('bad config'))).toBe(
      'Configuration error. Please contact support.',
    );
    expect(formatErrorMessage(new IgnorableSystemError('iframe error'))).toBe('');
    expect(formatErrorMessage(new ApiError('server down'))).toBe(
      'The service is unavailable right now. Please try again.',
    );
    expect(formatErrorMessage(new Error('something unusual'))).toBe(
      'An unexpected error occurred. Please try again.',
    );
  });

  it('returns strict display details', () => {
    expect(
      formatErrorDetails(new PaymentError('Card declined', { paymentIntentId: 'pi-1' })),
    ).toEqual({
      code: 'PAYMENT_ERROR',
      message: 'Payment processing failed. Please try again.',
      meta: { paymentIntentId: 'pi-1' },
      severity: 'critical',
    });
  });
});
