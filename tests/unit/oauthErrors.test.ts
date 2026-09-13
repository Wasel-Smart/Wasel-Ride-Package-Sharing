import { describe, expect, it, vi } from 'vitest';
import { parseOAuthError, OAUTH_ERROR_CODES } from '@/utils/oauthErrors';

describe('parseOAuthError', () => {
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
    history.pushState(null, '', '?error=access_denied&error_description=User+rejected');
    const result = parseOAuthError(null, 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('access_denied');
    expect(result!.userMessage).toContain('cancelled');
    expect(result!.recoveryAction).toBe('Click the button again to sign in');
    history.pushState(null, '', '');
  });

  it('classifies invalid_client from URL params', () => {
    history.pushState(null, '', '?error=invalid_client');
    const result = parseOAuthError(null, 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('invalid_client');
    expect(result!.userMessage).toContain('not properly configured');
    expect(result!.recoveryAction).toBe('Contact support');
    history.pushState(null, '', '');
  });

  it('classifies server_error from URL params', () => {
    history.pushState(null, '', '?error=server_error');
    const result = parseOAuthError(null, 'microsoft');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('server_error');
    expect(result!.userMessage).toContain('technical difficulties');
    history.pushState(null, '', '');
  });

  it('classifies network_error from URL params', () => {
    history.pushState(null, '', '?error=network_error');
    const result = parseOAuthError(null, 'google');
    expect(result).not.toBeNull();
    expect(result!.userMessage).toContain('Network connection failed');
    expect(result!.recoveryAction).toBe('Check your connection and try again');
    history.pushState(null, '', '');
  });

  it('classifies popup_blocked from URL params', () => {
    history.pushState(null, '', '?error=popup_blocked');
    const result = parseOAuthError(null);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('popup_blocked');
    expect(result!.userMessage).toContain('popup was blocked');
    expect(result!.recoveryAction).toBe('Enable popups in your browser settings');
    history.pushState(null, '', '');
  });

  it('classifies popup_closed from URL params', () => {
    history.pushState(null, '', '?error=popup_closed');
    const result = parseOAuthError(null);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('popup_closed');
    expect(result!.userMessage).toContain('closed before completing');
    history.pushState(null, '', '');
  });

  it('fallback uses provider name for unknown codes', () => {
    history.pushState(null, '', '?error=some_random_error');
    const result = parseOAuthError(null, 'microsoft');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('some_random_error');
    expect(result!.userMessage).toBe('Microsoft sign-in failed. Please try again.');
    history.pushState(null, '', '');
  });

  it('fallback uses generic OAuth for unknown codes without provider', () => {
    history.pushState(null, '', '?error=some_error');
    const result = parseOAuthError(null);
    expect(result).not.toBeNull();
    expect(result!.userMessage).toContain('OAuth');
    history.pushState(null, '', '');
  });

  it('URL params take priority over error objects', () => {
    history.pushState(null, '', '?error=access_denied');
    const result = parseOAuthError(new Error('different error'), 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('access_denied');
    history.pushState(null, '', '');
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
