import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { parseOAuthError, OAUTH_ERROR_CODES } from '@/utils/oauthErrors';

const originalSearch = window.location.search;

describe('parseOAuthError', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: originalSearch },
      writable: true,
    });
  });

  it('returns null for non-error input', () => {
    expect(parseOAuthError(null)).toBeNull();
    expect(parseOAuthError(undefined)).toBeNull();
    expect(parseOAuthError(42)).toBeNull();
    expect(parseOAuthError({})).toBeNull();
  });

  it('parses error objects as unknown_error', () => {
    const result = parseOAuthError(new Error('Something went wrong'), 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('unknown_error');
    expect(result!.message).toBe('Something went wrong');
    expect(result!.provider).toBe('google');
  });

  it('parses string errors as unknown_error', () => {
    const result = parseOAuthError('Network failure', 'facebook');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('unknown_error');
    expect(result!.message).toBe('Network failure');
    expect(result!.provider).toBe('facebook');
  });

  it('classifies access_denied from URL params', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=access_denied&error_description=User+rejected' },
      writable: true,
    });
    const result = parseOAuthError(null, 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('access_denied');
    expect(result!.userMessage).toContain('cancelled');
    expect(result!.recoveryAction).toBe('Click the button again to sign in');
  });

  it('classifies user_cancelled from URL params', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=user_cancelled' },
      writable: true,
    });
    const result = parseOAuthError(null, 'facebook');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('user_cancelled');
    expect(result!.userMessage).toContain('cancelled');
    expect(result!.userMessage).toContain('Facebook');
  });

  it('classifies invalid_client from URL params', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=invalid_client' },
      writable: true,
    });
    const result = parseOAuthError(null, 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('invalid_client');
    expect(result!.userMessage).toContain('not properly configured');
    expect(result!.userMessage).toContain('support');
    expect(result!.recoveryAction).toBe('Contact support');
  });

  it('classifies redirect_uri_mismatch from URL params', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=redirect_uri_mismatch' },
      writable: true,
    });
    const result = parseOAuthError(null, 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('redirect_uri_mismatch');
    expect(result!.userMessage).toContain('not configured correctly');
    expect(result!.recoveryAction).toBeDefined();
  });

  it('classifies server_error from URL params', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=server_error' },
      writable: true,
    });
    const result = parseOAuthError(null, 'microsoft');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('server_error');
    expect(result!.userMessage).toContain('technical difficulties');
  });

  it('classifies temporarily_unavailable from URL params', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=temporarily_unavailable' },
      writable: true,
    });
    const result = parseOAuthError(null, 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('temporarily_unavailable');
    expect(result!.userMessage).toContain('temporarily unavailable');
  });

  it('classifies invalid_grant from URL params', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=invalid_grant' },
      writable: true,
    });
    const result = parseOAuthError(null, 'apple');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('invalid_grant');
    expect(result!.userMessage).toContain('expired');
  });

  it('classifies network_error from URL params', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=network_error' },
      writable: true,
    });
    const result = parseOAuthError(null, 'google');
    expect(result).not.toBeNull();
    expect(result!.userMessage).toContain('Network connection failed');
    expect(result!.recoveryAction).toBe('Check your connection and try again');
  });

  it('classifies popup_blocked from URL params', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=popup_blocked' },
      writable: true,
    });
    const result = parseOAuthError(null);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('popup_blocked');
    expect(result!.userMessage).toContain('popup was blocked');
    expect(result!.recoveryAction).toBe('Enable popups in your browser settings');
  });

  it('classifies popup_closed from URL params', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=popup_closed' },
      writable: true,
    });
    const result = parseOAuthError(null);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('popup_closed');
    expect(result!.userMessage).toContain('closed before completing');
  });

  it('fallback uses provider name for unknown error codes', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=some_random_error' },
      writable: true,
    });
    const result = parseOAuthError(null, 'microsoft');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('some_random_error');
    expect(result!.userMessage).toContain('Microsoft');
    expect(result!.userMessage).toContain('some_random_error');
  });

  it('fallback uses generic OAuth for unknown codes without provider', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=some_error' },
      writable: true,
    });
    const result = parseOAuthError(null);
    expect(result).not.toBeNull();
    expect(result!.userMessage).toContain('OAuth');
  });

  it('URL params take priority over error objects', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?error=access_denied' },
      writable: true,
    });
    const result = parseOAuthError(new Error('different error'), 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('access_denied');
  });
});

describe('OAUTH_ERROR_CODES', () => {
  it('contains all documented error codes', () => {
    expect(OAUTH_ERROR_CODES.access_denied).toBeDefined();
    expect(OAUTH_ERROR_CODES.user_cancelled).toBeDefined();
    expect(OAUTH_ERROR_CODES.invalid_client).toBeDefined();
    expect(OAUTH_ERROR_CODES.unauthorized_client).toBeDefined();
    expect(OAUTH_ERROR_CODES.invalid_request).toBeDefined();
    expect(OAUTH_ERROR_CODES.redirect_uri_mismatch).toBeDefined();
    expect(OAUTH_ERROR_CODES.invalid_scope).toBeDefined();
    expect(OAUTH_ERROR_CODES.server_error).toBeDefined();
    expect(OAUTH_ERROR_CODES.temporarily_unavailable).toBeDefined();
    expect(OAUTH_ERROR_CODES.invalid_grant).toBeDefined();
    expect(OAUTH_ERROR_CODES.network_error).toBeDefined();
    expect(OAUTH_ERROR_CODES.timeout).toBeDefined();
  });
});
