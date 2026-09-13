import { describe, expect, it } from 'vitest';
import { parseOAuthError, OAUTH_ERROR_CODES } from '@/utils/oauthErrors';

describe('parseOAuthError', () => {
  it('returns null for non-error input', () => {
    expect(parseOAuthError(null)).toBeNull();
    expect(parseOAuthError(undefined)).toBeNull();
    expect(parseOAuthError(42)).toBeNull();
    expect(parseOAuthError({})).toBeNull();
  });

  it('parses error objects', () => {
    const result = parseOAuthError(new Error('Something went wrong'), 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('unknown_error');
    expect(result!.message).toBe('Something went wrong');
    expect(result!.userMessage).toContain('Google');
    expect(result!.provider).toBe('google');
  });

  it('parses string errors', () => {
    const result = parseOAuthError('access_denied', 'google');
    expect(result).not.toBeNull();
    expect(result!.code).toBe('access_denied');
    expect(result!.userMessage).toContain('cancelled');
  });

  it('classifies access_denied errors correctly', () => {
    const result = parseOAuthError('access_denied', 'google');
    expect(result!.userMessage).toContain('cancelled');
    expect(result!.recoveryAction).toBe('Click the button again to sign in');
  });

  it('classifies user_cancelled errors correctly', () => {
    const result = parseOAuthError('user_cancelled', 'facebook');
    expect(result!.userMessage).toContain('cancelled');
    expect(result!.userMessage).toContain('Facebook');
  });

  it('classifies invalid_client errors correctly', () => {
    const result = parseOAuthError('invalid_client', 'google');
    expect(result!.userMessage).toContain('not properly configured');
    expect(result!.userMessage).toContain('support');
  });

  it('classifies redirect_uri_mismatch errors correctly', () => {
    const result = parseOAuthError('redirect_uri_mismatch', 'google');
    expect(result!.userMessage).toContain('not configured correctly');
    expect(result!.recoveryAction).toBeDefined();
  });

  it('classifies server errors correctly', () => {
    const result = parseOAuthError('server_error', 'facebook');
    expect(result!.userMessage).toContain('technical difficulties');
  });

  it('classifies network errors correctly', () => {
    const result = parseOAuthError('network_error', 'google');
    expect(result!.userMessage).toContain('Network connection failed');
    expect(result!.recoveryAction).toBe('Check your connection and try again');
  });

  it('classifies popup_blocked errors correctly', () => {
    const result = parseOAuthError('popup_blocked');
    expect(result!.userMessage).toContain('popup was blocked');
    expect(result!.recoveryAction).toBe('Enable popups in your browser settings');
  });

  it('classifies popup_closed errors correctly', () => {
    const result = parseOAuthError('popup_closed');
    expect(result!.userMessage).toContain('closed before completing');
  });

  it('fallback uses provider name for unknown errors', () => {
    const result = parseOAuthError('some_random_error', 'microsoft');
    expect(result!.userMessage).toContain('Microsoft');
    expect(result!.userMessage).toContain('some_random_error');
  });

  it('fallback works without provider', () => {
    const result = parseOAuthError('some_error');
    expect(result!.userMessage).toContain('OAuth');
  });

  it('OAUTH_ERROR_CODES contains all known error codes', () => {
    expect(OAUTH_ERROR_CODES.access_denied).toBeDefined();
    expect(OAUTH_ERROR_CODES.user_cancelled).toBeDefined();
    expect(OAUTH_ERROR_CODES.invalid_client).toBeDefined();
    expect(OAUTH_ERROR_CODES.redirect_uri_mismatch).toBeDefined();
    expect(OAUTH_ERROR_CODES.invalid_scope).toBeDefined();
    expect(OAUTH_ERROR_CODES.server_error).toBeDefined();
    expect(OAUTH_ERROR_CODES.network_error).toBeDefined();
    expect(OAUTH_ERROR_CODES.invalid_grant).toBeDefined();
    expect(OAUTH_ERROR_CODES.popup_blocked).toBeDefined();
    expect(OAUTH_ERROR_CODES.popup_closed).toBeDefined();
  });
});
