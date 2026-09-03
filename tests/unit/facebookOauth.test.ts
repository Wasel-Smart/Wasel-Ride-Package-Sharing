import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/utils/env', () => ({
  resolveAuthRedirectOrigin: () => 'https://www.wasel14.online',
  getAuthCallbackUrl: (
    origin: string,
    params?: Record<string, string | null | undefined>,
  ) => {
    const url = new URL(`${origin.replace(/\/$/, '')}/app/auth/callback`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string' && value.length > 0) {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  },
  getConfig: () => ({
    appUrl: 'https://www.wasel14.online',
    authCallbackPath: '/app/auth/callback',
  }),
}));

import { signInWithOAuthProvider } from '../../src/contexts/authContextHelpers';

type FakeClient = {
  auth: {
    signInWithOAuth: ReturnType<typeof vi.fn>;
  };
};

function makeClient(): FakeClient {
  return {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  };
}

describe('signInWithOAuthProvider - Facebook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the email + public_profile scopes Facebook requires', async () => {
    const client = makeClient();
    (client.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await signInWithOAuthProvider(
      client as unknown as Parameters<typeof signInWithOAuthProvider>[0],
      'facebook',
    );

    expect(result.error).toBeNull();
    const call = (client.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call.provider).toBe('facebook');
    expect(call.options.scopes).toBe('email,public_profile');
    expect(call.options.redirectTo).toBe(
      'https://www.wasel14.online/app/auth/callback',
    );
  });

  it('preserves returnTo through the Supabase redirectTo callback', async () => {
    const client = makeClient();
    (client.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });

    await signInWithOAuthProvider(
      client as unknown as Parameters<typeof signInWithOAuthProvider>[0],
      'facebook',
      '/app/find-ride',
    );

    const call = (client.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call.options.redirectTo).toBe(
      'https://www.wasel14.online/app/auth/callback?returnTo=%2Fapp%2Ffind-ride',
    );
  });

  it('returns the Supabase error without throwing', async () => {
    const client = makeClient();
    const supabaseError = { name: 'AuthError', message: 'redirect_uri_mismatch' } as any;
    (client.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: supabaseError,
    });

    const result = await signInWithOAuthProvider(
      client as unknown as Parameters<typeof signInWithOAuthProvider>[0],
      'facebook',
    );

    expect(result.error).toBe(supabaseError);
  });

  it('returns a friendly error if the client is missing', async () => {
    const result = await signInWithOAuthProvider(null, 'facebook');
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(/not configured/i);
  });

  it('survives exceptions thrown by the Supabase client', async () => {
    const client = makeClient();
    (client.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network down'),
    );

    const result = await signInWithOAuthProvider(
      client as unknown as Parameters<typeof signInWithOAuthProvider>[0],
      'facebook',
    );

    // The original Error is preserved (it is an instance of Error) so the
    // caller gets the real network-down message rather than a generic one.
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Network down');
  });

  it('falls back to a provider-named message for non-Error throws', async () => {
    const client = makeClient();
    (client.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockRejectedValue(
      'boom-string-not-error',
    );

    const result = await signInWithOAuthProvider(
      client as unknown as Parameters<typeof signInWithOAuthProvider>[0],
      'facebook',
    );

    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Facebook login failed');
  });
});
