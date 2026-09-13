import { describe, expect, it } from 'vitest';
import { normalizeOperationError, shouldIgnoreProfileError } from '@/contexts/authContextHelpers';

describe('normalizeOperationError', () => {
  it('returns the original error when given an Error instance', () => {
    const originalError = new Error('Test error message');
    const result = normalizeOperationError(originalError, 'Fallback message');
    expect(result).toBe(originalError);
    expect(result.message).toBe('Test error message');
  });

  it('creates a new Error with the fallback when given a non-Error value', () => {
    const result = normalizeOperationError(null, 'Fallback message');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Fallback message');
  });

  it('creates a new Error with the fallback for undefined input', () => {
    const result = normalizeOperationError(undefined, 'Something went wrong');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Something went wrong');
  });

  it('creates a new Error with the fallback for string input', () => {
    const result = normalizeOperationError('error string', 'Fallback message');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Fallback message');
  });

  it('creates a new Error with the fallback for number input', () => {
    const result = normalizeOperationError(500, 'Fallback message');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Fallback message');
  });

  it('creates a new Error with the fallback for object input', () => {
    const result = normalizeOperationError({ code: 'E001' }, 'Fallback message');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Fallback message');
  });
});

describe('shouldIgnoreProfileError', () => {
  it('returns true for aborted errors', () => {
    expect(shouldIgnoreProfileError(new Error('Request aborted'))).toBe(true);
    expect(shouldIgnoreProfileError(new Error('operation aborted'))).toBe(true);
  });

  it('returns true for not found errors', () => {
    expect(shouldIgnoreProfileError(new Error('User not found'))).toBe(true);
    expect(shouldIgnoreProfileError(new Error('Profile not found'))).toBe(true);
    expect(shouldIgnoreProfileError(new Error('resource not found'))).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(shouldIgnoreProfileError(new Error('Network failure'))).toBe(false);
    expect(shouldIgnoreProfileError(new Error('Permission denied'))).toBe(false);
    expect(shouldIgnoreProfileError(new Error('Something went wrong'))).toBe(false);
  });

  it('returns false for empty message', () => {
    expect(shouldIgnoreProfileError(new Error(''))).toBe(false);
  });
});
