import { describe, expect, it } from 'vitest';
import {
  ApiError,
  AuthenticationError,
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
} from '../../../src/utils/errors';

describe('error edge cases', () => {
  it('preserves subclass identity and exact metadata', () => {
    const err = new AuthenticationError('bad creds', { userId: 'u-1' });

    expect(err).toBeInstanceOf(WaselError);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.meta).toEqual({ userId: 'u-1' });
    expect(err.context).toEqual({ userId: 'u-1' });
    expect(err.code).toBe('AUTH_ERROR');
    expect(err.severity).toBe('error');
  });

  it('normalizes api objects with nested causes and keeps the more specific cause when possible', () => {
    const err = normalizeError({
      status: 500,
      message: 'Top level error',
      cause: new Error('request timed out'),
      meta: { retryable: true },
    });

    expect(err).toBeInstanceOf(TimeoutError);
    expect(err.code).toBe('TIMEOUT_ERROR');
    expect(err.meta).toEqual({});
  });

  it('normalizes explicit api failures when no more specific cause exists', () => {
    const err = normalizeError({
      status: 500,
      error: 'Internal service failure',
      meta: { traceId: 'trace-1' },
    });

    expect(err).toBeInstanceOf(ApiError);
    expect(getErrorShape(err)).toEqual({
      code: 'API_ERROR',
      message: 'Internal service failure',
      meta: {
        status: 500,
        traceId: 'trace-1',
      },
      severity: 'error',
      isIgnorable: false,
    });
  });

  it('maps deterministic display messages for edge categories', () => {
    expect(formatErrorMessage(new IgnorableSystemError('figma noise'))).toBe('');
    expect(formatErrorMessage(new ConfigError('env missing'))).toBe(
      'Configuration error. Please contact support.',
    );
    expect(formatErrorMessage(new NetworkError('offline'))).toBe(
      'Network connection error. Please check your connection.',
    );
    expect(formatErrorMessage(new ValidationError('email missing'))).toBe(
      'Invalid data provided. Please check your input.',
    );
    expect(formatErrorMessage(new PaymentError('declined'))).toBe(
      'Payment processing failed. Please try again.',
    );
    expect(formatErrorMessage(new TimeoutError('timeout'))).toBe(
      'Request timed out. Please try again.',
    );
  });

  it('returns strict formatted details for unknown errors', () => {
    expect(
      formatErrorDetails(new WaselError({ code: 'UNKNOWN_ERROR', message: 'mystery' })),
    ).toEqual({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      meta: {},
      severity: 'error',
    });
  });
});
