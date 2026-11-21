import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as CoreModule from '../core';
import type * as BackendWorkflowModule from '../backendWorkflow';

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockSignOut = vi.fn();
  const mockGetSession = vi.fn();
  const mockRefreshSession = vi.fn();
  const mockSupabase = {
    auth: { signInWithPassword: mockSignIn, signUp: mockSignUp, signOut: mockSignOut, getSession: mockGetSession, refreshSession: mockRefreshSession },
  };
  return { mockSignIn, mockSignUp, mockSignOut, mockGetSession, mockRefreshSession, mockSupabase };
});

vi.mock('@/utils/supabase/client', () => ({
  supabase: mocks.mockSupabase,
  isUsingLegacySupabaseKey: false,
}));

vi.mock('../core', async (importOriginal) => {
  const actual = await importOriginal<typeof CoreModule>();
  return { ...actual, getAuthDetails: vi.fn().mockResolvedValue({ token: 'tok', userId: 'user-1' }) };
});

vi.mock('../backendWorkflow', async (importOriginal) => {
  const actual = await importOriginal<typeof BackendWorkflowModule>();
  return {
    ...actual,
    requestEdgeJson: vi.fn(),
    hasConfiguredEdgeTransport: vi.fn(() => false),
    runBackendWorkflow: vi.fn(async ({ fallback }: { fallback?: (ctx: object) => Promise<unknown> }) => {
      if (fallback) {return fallback({});}
      throw new Error('no fallback');
    }),
  };
});

vi.mock('../directSupabase', () => ({
  getDirectProfile: vi.fn().mockResolvedValue({ id: 'user-1', full_name: 'Test User' }),
  getDirectVerificationRecord: vi.fn().mockResolvedValue(null),
  updateDirectProfile: vi.fn().mockResolvedValue({ id: 'user-1' }),
}));

vi.mock('../../utils/env', () => ({
  getAuthCallbackUrl: vi.fn(() => 'https://wasel14.online/app/auth/callback'),
  resolveAuthRedirectOrigin: vi.fn(() => 'https://wasel14.online'),
}));

import { authAPI, redactAuthErrorText } from '../auth';
import { getAuthDetails } from '../core';
import { runBackendWorkflow } from '../backendWorkflow';

// ── redactAuthErrorText ──────────────────────────────────────────────────────

describe('redactAuthErrorText', () => {
  it('returns empty string for undefined', () => {
    expect(redactAuthErrorText(undefined)).toBe('');
  });

  it('redacts sb_publishable keys', () => {
    const out = redactAuthErrorText('key=sb_publishable_abc123XYZ-def');
    expect(out).not.toContain('sb_publishable_abc123XYZ-def');
    expect(out).toContain('[redacted-key]');
  });

  it('redacts JWT tokens', () => {
    const jwt = [
      'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0',
      'eyJzdWIiOiJmYWtlIn0',
      'test-signature-value',
    ].join('.');
    const out = redactAuthErrorText(`token: ${jwt}`);
    expect(out).not.toContain(jwt);
  });

  it('strips control characters', () => {
    const out = redactAuthErrorText('bad\x00char\x1fhere');
    expect([...out].some(character => {
      const code = character.charCodeAt(0);
      return code < 0x20 || code === 0x7f;
    })).toBe(false);
  });

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(300);
    expect(redactAuthErrorText(long).length).toBeLessThanOrEqual(200);
  });

  it('passes through safe plain text unchanged', () => {
    expect(redactAuthErrorText('Invalid login credentials')).toBe('Invalid login credentials');
  });
});

// ── authAPI.signIn ────────────────────────────────────────────────────────────

describe('authAPI.signIn', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns data on successful sign-in', async () => {
    const mockData = { user: { id: 'u1' }, session: { access_token: 'tok' } };
    mocks.mockSignIn.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await authAPI.signIn('user@wasel.jo', 'pass123');
    expect(result).toEqual(mockData);
  });

  it('throws normalized error for invalid credentials', async () => {
    mocks.mockSignIn.mockResolvedValueOnce({ data: null, error: { message: 'Invalid login credentials', code: undefined } });
    await expect(authAPI.signIn('x@x.com', 'wrong')).rejects.toThrow('Incorrect email or password.');
  });

  it('throws normalized error for email not confirmed', async () => {
    mocks.mockSignIn.mockResolvedValueOnce({ data: null, error: { message: 'Email not confirmed', code: 'email_not_confirmed' } });
    await expect(authAPI.signIn('x@x.com', 'pass')).rejects.toThrow('Please confirm your email');
  });

  it('throws normalized error for rate limit', async () => {
    mocks.mockSignIn.mockResolvedValueOnce({ data: null, error: { message: 'Too many requests', code: 'over_request_rate_limit' } });
    await expect(authAPI.signIn('x@x.com', 'pass')).rejects.toThrow('Too many attempts');
  });

  it('throws normalized error for legacy API key', async () => {
    mocks.mockSignIn.mockResolvedValueOnce({ data: null, error: { message: 'Legacy API keys are disabled', code: undefined } });
    await expect(authAPI.signIn('x@x.com', 'pass')).rejects.toThrow('legacy API key rejected');
  });

  it('throws normalized error for network failure', async () => {
    mocks.mockSignIn.mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch', code: undefined } });
    await expect(authAPI.signIn('x@x.com', 'pass')).rejects.toThrow('Cannot reach the sign-in service');
  });

  it('throws normalized error for banned user', async () => {
    mocks.mockSignIn.mockResolvedValueOnce({ data: null, error: { message: 'User banned', code: 'user_banned' } });
    await expect(authAPI.signIn('x@x.com', 'pass')).rejects.toThrow('suspended');
  });
});

// ── authAPI.signUp ────────────────────────────────────────────────────────────

describe('authAPI.signUp', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns data on successful sign-up', async () => {
    const mockData = { user: { id: 'u2', identities: [{ id: 'i1' }] } };
    mocks.mockSignUp.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await authAPI.signUp({ email: 'new@wasel.jo', password: 'Str0ng!Pass', firstName: 'Ali', lastName: 'Hassan', phone: '+962791234567' });
    expect(result).toEqual(mockData);
  });

  it('throws for already-registered email (empty identities anti-enumeration)', async () => {
    mocks.mockSignUp.mockResolvedValueOnce({ data: { user: { id: 'u3', identities: [] } }, error: null });
    await expect(
      authAPI.signUp({ email: 'dup@wasel.jo', password: 'pass', firstName: 'A', lastName: 'B', phone: '' }),
    ).rejects.toThrow('already registered');
  });

  it('throws normalized error on sign-up failure', async () => {
    mocks.mockSignUp.mockResolvedValueOnce({ data: null, error: { message: 'Signups not allowed', code: 'email_address_not_authorized' } });
    await expect(
      authAPI.signUp({ email: 'x@x.com', password: 'pass', firstName: 'A', lastName: 'B', phone: '' }),
    ).rejects.toThrow('Sign-up is not allowed');
  });
});

// ── authAPI.signOut ──────────────────────────────────────────────────────────

describe('authAPI.signOut', () => {
  it('resolves without error on success', async () => {
    mocks.mockSignOut.mockResolvedValueOnce({ error: null });
    await expect(authAPI.signOut()).resolves.toBeUndefined();
  });

  it('throws when supabase returns an error', async () => {
    mocks.mockSignOut.mockResolvedValueOnce({ error: new Error('sign out failed') });
    await expect(authAPI.signOut()).rejects.toThrow('sign out failed');
  });
});

// ── authAPI.getSession ────────────────────────────────────────────────────────

describe('authAPI.getSession', () => {
  it('returns session data', async () => {
    const mockData = { session: { access_token: 'tok', user: { id: 'u1' } } };
    mocks.mockGetSession.mockResolvedValueOnce({ data: mockData, error: null });
    const result = await authAPI.getSession();
    expect(result).toEqual(mockData);
  });

  it('throws on session error', async () => {
    mocks.mockGetSession.mockResolvedValueOnce({ data: null, error: new Error('session error') });
    await expect(authAPI.getSession()).rejects.toThrow('session error');
  });
});

// ── authAPI.getProfile ────────────────────────────────────────────────────────

describe('authAPI.getProfile', () => {
  beforeEach(() => {
    vi.mocked(getAuthDetails).mockResolvedValue({ token: 'tok', userId: 'user-1' });
  });

  afterEach(() => vi.clearAllMocks());

  it('returns profile from direct Supabase when edge is not configured', async () => {
    const result = await authAPI.getProfile();
    expect(result.profile).toBeDefined();
  });

  it('returns null profile on error without throwing', async () => {
    vi.mocked(getAuthDetails).mockRejectedValueOnce(new Error('not found'));
    const result = await authAPI.getProfile();
    expect(result.profile).toBeNull();
  });
});

// ── authAPI.updateProfile ────────────────────────────────────────────────────

describe('authAPI.updateProfile', () => {
  it('returns success:true with profile on success', async () => {
    vi.mocked(runBackendWorkflow).mockResolvedValueOnce({ id: 'user-1', full_name: 'Updated' });
    const result = await authAPI.updateProfile({ full_name: 'Updated' });
    expect(result.success).toBe(true);
    expect(result.profile).toBeDefined();
  });

  it('returns success:false with error message on failure', async () => {
    vi.mocked(runBackendWorkflow).mockRejectedValueOnce(new Error('DB error'));
    const result = await authAPI.updateProfile({ full_name: 'X' });
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('DB error');
  });
});

