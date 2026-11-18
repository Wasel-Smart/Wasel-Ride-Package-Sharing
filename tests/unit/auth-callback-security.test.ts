import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for api/auth/callback.ts.
 *
 * These import the REAL helpers and handler from the serverless function. An
 * earlier version of this file re-implemented safeReturnTo locally, which meant
 * the tests could pass while the deployed code drifted (it did: the copy had a
 * dot-segment guard the production code lacked). Do not copy logic in here.
 */

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  createServerClient: vi.fn(),
  captured: {
    cookies: null as null | {
      getAll: () => Array<{ name: string; value: string }>;
      setAll: (
        cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
      ) => void;
    },
    options: null as null | Record<string, unknown>,
  },
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: (url: string, key: string, options: Record<string, unknown>) => {
    mocks.createServerClient(url, key, options);
    mocks.captured.options = options;
    mocks.captured.cookies = options.cookies as typeof mocks.captured.cookies;
    return { auth: { exchangeCodeForSession: mocks.exchangeCodeForSession } };
  },
}));

import handler, {
  DEFAULT_RETURN_TO,
  friendlyAuthError,
  hasUnsafeRedirectChars,
  parseCookies,
  safeReturnTo,
  serializeCookie,
} from '../../api/auth/callback';

const ORIGIN = 'https://www.wasel14.online';

// ─── safeReturnTo ─────────────────────────────────────────────────────────────

describe('safeReturnTo — open redirect guard', () => {
  it('returns default for null', () => {
    expect(safeReturnTo(null, ORIGIN)).toBe(DEFAULT_RETURN_TO);
  });

  it('returns default for empty string', () => {
    expect(safeReturnTo('', ORIGIN)).toBe(DEFAULT_RETURN_TO);
  });

  it('allows valid same-origin paths', () => {
    expect(safeReturnTo('/app/find-ride', ORIGIN)).toBe('/app/find-ride');
    expect(safeReturnTo('/app/packages', ORIGIN)).toBe('/app/packages');
    expect(safeReturnTo('/app/wallet?tab=top-up', ORIGIN)).toBe('/app/wallet?tab=top-up');
  });

  it('blocks protocol-relative URLs starting with //', () => {
    expect(safeReturnTo('//evil.com', ORIGIN)).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo('//www.wasel14.online', ORIGIN)).toBe(DEFAULT_RETURN_TO);
  });

  it('blocks backslash-based open redirects', () => {
    // Browsers normalise /\evil.example → //evil.example
    expect(safeReturnTo('/\\evil.example', ORIGIN)).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo('/\\\\evil.example', ORIGIN)).toBe(DEFAULT_RETURN_TO);
  });

  it('blocks absolute URLs to other origins', () => {
    expect(safeReturnTo('https://evil.com/steal', ORIGIN)).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo('http://evil.com', ORIGIN)).toBe(DEFAULT_RETURN_TO);
  });

  it('blocks javascript: URIs', () => {
    expect(safeReturnTo('javascript:alert(1)', ORIGIN)).toBe(DEFAULT_RETURN_TO);
  });

  it('blocks control characters in path', () => {
    expect(safeReturnTo('/app\x00/evil', ORIGIN)).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo('/app\x0d\x0aLocation: evil.com', ORIGIN)).toBe(DEFAULT_RETURN_TO);
  });

  it('rejects dot-segment traversal instead of silently re-pathing it', () => {
    expect(safeReturnTo('/app/../../../evil.com', ORIGIN)).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo('/app/../admin', ORIGIN)).toBe(DEFAULT_RETURN_TO);
    expect(safeReturnTo('/..', ORIGIN)).toBe(DEFAULT_RETURN_TO);
  });

  it('does not treat a dotted file name as traversal', () => {
    expect(safeReturnTo('/app/file..name', ORIGIN)).toBe('/app/file..name');
  });

  it('preserves query string and hash for valid paths', () => {
    expect(safeReturnTo('/app/rides?from=amman&to=salt#map', ORIGIN)).toBe(
      '/app/rides?from=amman&to=salt#map',
    );
  });
});

describe('hasUnsafeRedirectChars', () => {
  it('flags backslash, control characters and DEL', () => {
    expect(hasUnsafeRedirectChars('/a\\b')).toBe(true);
    expect(hasUnsafeRedirectChars('/a\nb')).toBe(true);
    expect(hasUnsafeRedirectChars('/a\x7fb')).toBe(true);
  });

  it('accepts ordinary paths', () => {
    expect(hasUnsafeRedirectChars('/app/find-ride?x=1')).toBe(false);
  });
});

// ─── friendlyAuthError ────────────────────────────────────────────────────────

describe('friendlyAuthError — no error text reflection', () => {
  it('maps access_denied to fixed message', () => {
    expect(friendlyAuthError('access_denied')).toBe('Sign-in was cancelled.');
  });

  it('maps server_error and temporarily_unavailable to the provider-unavailable message', () => {
    const expected = 'The sign-in provider is temporarily unavailable. Please try again.';
    expect(friendlyAuthError('server_error')).toBe(expected);
    expect(friendlyAuthError('temporarily_unavailable')).toBe(expected);
  });

  it('maps unknown codes to generic message (no reflection)', () => {
    const phishingText = 'Your account has been suspended. Call +1-800-SCAM now.';
    expect(friendlyAuthError(phishingText)).toBe('Sign-in failed. Please try again.');
  });

  it('maps null to generic message', () => {
    expect(friendlyAuthError(null)).toBe('Sign-in failed. Please try again.');
  });

  it('is case-insensitive', () => {
    expect(friendlyAuthError('ACCESS_DENIED')).toBe('Sign-in was cancelled.');
  });
});

// ─── cookie helpers ───────────────────────────────────────────────────────────

describe('parseCookies', () => {
  it('returns an empty object for a missing header', () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('')).toEqual({});
  });

  it('parses multiple cookies and decodes values', () => {
    expect(parseCookies('a=1; b=hello%20world; c=x=y')).toEqual({ a: '1', b: 'hello world', c: 'x=y' });
  });

  it('keeps the raw value when decoding fails and skips nameless pairs', () => {
    expect(parseCookies('bad=%E0%A4%A; =orphan; ok=1')).toEqual({ bad: '%E0%A4%A', ok: '1' });
  });
});

describe('serializeCookie', () => {
  it('is Secure, Lax and HttpOnly by default', () => {
    const cookie = serializeCookie('n', 'v');
    expect(cookie).toContain('n=v');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
  });

  it('omits HttpOnly only when explicitly disabled (the browser client must read the session cookie)', () => {
    expect(serializeCookie('n', 'v', { httpOnly: false })).not.toContain('HttpOnly');
  });

  it('encodes values and honours maxAge, domain and sameSite', () => {
    const cookie = serializeCookie('n', 'a b', { maxAge: 99.9, domain: 'wasel14.online', sameSite: 'strict' });
    expect(cookie).toContain('n=a%20b');
    expect(cookie).toContain('Max-Age=99');
    expect(cookie).toContain('Domain=wasel14.online');
    expect(cookie).toContain('SameSite=strict');
  });

  it('clamps a negative maxAge to zero so cookie deletion works', () => {
    expect(serializeCookie('n', '', { maxAge: -5 })).toContain('Max-Age=0');
  });
});

// ─── handler ──────────────────────────────────────────────────────────────────

type HandlerRequest = Parameters<typeof handler>[0];
type HandlerResponse = Parameters<typeof handler>[1];

function makeRequest(query: string, cookie?: string): HandlerRequest {
  return {
    method: 'GET',
    url: `/api/auth/callback${query}`,
    headers: {
      host: 'www.wasel14.online',
      'x-forwarded-proto': 'https',
      ...(cookie ? { cookie } : {}),
    },
  };
}

function makeResponse() {
  const writeHead = vi.fn();
  const end = vi.fn();
  return { response: { writeHead, end } as unknown as HandlerResponse, writeHead, end };
}

function lastHeaders(writeHead: ReturnType<typeof vi.fn>): Record<string, string | string[]> {
  const call = writeHead.mock.calls.at(-1) as [number, Record<string, string | string[]>];
  return call[1];
}

describe('api/auth/callback handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.captured.cookies = null;
    mocks.captured.options = null;
    mocks.exchangeCodeForSession.mockReset();
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  });

  it('sends a direct visit with no code or error to sign-in', async () => {
    const { response, writeHead, end } = makeResponse();
    await handler(makeRequest(''), response);
    expect(writeHead).toHaveBeenCalledWith(302, { Location: '/app/auth' });
    expect(end).toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('never reflects provider error text and keeps a safe returnTo', async () => {
    const { response, writeHead } = makeResponse();
    await handler(
      makeRequest('?error=access_denied&error_description=Call%20+1-800-SCAM&returnTo=%2Fapp%2Fwallet'),
      response,
    );
    const location = String(lastHeaders(writeHead).Location);
    const parsed = new URL(location, ORIGIN);
    expect(parsed.pathname).toBe('/app/auth');
    expect(parsed.searchParams.get('error')).toBe('Sign-in was cancelled.');
    expect(location).not.toContain('SCAM');
    expect(parsed.searchParams.get('returnTo')).toBe('/app/wallet');
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('fails closed when Supabase is not configured', async () => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const { response, writeHead } = makeResponse();
    await handler(makeRequest('?code=abc'), response);
    expect(String(lastHeaders(writeHead).Location)).toContain('/app/auth?error=');
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('exchanges the code, forwards session cookies and redirects to returnTo', async () => {
    mocks.exchangeCodeForSession.mockImplementation(async () => {
      mocks.captured.cookies?.setAll([
        { name: 'wasel-auth-token', value: 'session-value', options: { maxAge: 3600, httpOnly: false } },
      ]);
      return { error: null };
    });
    const { response, writeHead, end } = makeResponse();
    await handler(makeRequest('?code=abc&returnTo=%2Fapp%2Fwallet'), response);

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(writeHead.mock.calls.at(-1)?.[0]).toBe(302);
    const headers = lastHeaders(writeHead);
    expect(headers.Location).toBe('/app/wallet');
    const setCookie = headers['Set-Cookie'] as string[];
    expect(setCookie).toHaveLength(1);
    expect(setCookie[0]).toContain('wasel-auth-token=session-value');
    expect(setCookie[0]).toContain('Secure');
    expect(setCookie[0]).not.toContain('HttpOnly');
    expect(end).toHaveBeenCalled();
  });

  it('uses the shared cookie name so server and browser clients agree', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    const { response } = makeResponse();
    await handler(makeRequest('?code=abc'), response);
    const cookieOptions = mocks.captured.options?.cookieOptions as { name: string; secure: boolean };
    expect(cookieOptions.name).toBe('wasel-auth-token');
    expect(cookieOptions.secure).toBe(true);
  });

  it('feeds the incoming PKCE verifier cookie to the Supabase client', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    const { response } = makeResponse();
    await handler(makeRequest('?code=abc', 'wasel-auth-token-code-verifier=verifier-123; other=1'), response);
    expect(mocks.captured.cookies?.getAll()).toEqual(
      expect.arrayContaining([{ name: 'wasel-auth-token-code-verifier', value: 'verifier-123' }]),
    );
  });

  it('redirects to sign-in with a fixed message when the exchange fails', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: new Error('provider said: <script>') });
    const { response, writeHead } = makeResponse();
    await handler(makeRequest('?code=bad'), response);
    const headers = lastHeaders(writeHead);
    expect(String(headers.Location)).toContain('/app/auth?error=');
    expect(String(headers.Location)).not.toContain('script');
    expect(headers['Set-Cookie']).toBeUndefined();
  });

  it('falls back to the default destination for a malicious returnTo', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    const { response, writeHead } = makeResponse();
    await handler(makeRequest('?code=abc&returnTo=%2F%2Fevil.example'), response);
    expect(lastHeaders(writeHead).Location).toBe(DEFAULT_RETURN_TO);
  });

  it('hands password-recovery sessions to the client callback to set a new password', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    const { response, writeHead } = makeResponse();
    await handler(makeRequest('?code=abc&type=recovery&returnTo=%2Fapp%2Fwallet'), response);
    expect(lastHeaders(writeHead).Location).toBe(
      '/app/auth/callback?type=recovery&returnTo=%2Fapp%2Fwallet',
    );
  });
});
