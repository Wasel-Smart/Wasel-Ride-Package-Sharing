/**
 * Server-side auth callback — /api/auth/callback
 *
 * Google, Facebook, and Supabase's own email links (signup confirmation,
 * password recovery, resend-confirmation) all redirect the browser here
 * with `?code=...&returnTo=...` once Supabase has finished the provider
 * handshake at https://<project>.supabase.co/auth/v1/callback.
 *
 * This exchanges that code for a session using @supabase/ssr, writes the
 * session into cookies, then 302-redirects into the app. The browser
 * client (src/utils/supabase/client.ts) reads the same cookies, so it
 * must use the same `cookieOptions.name` as COOKIE_NAME below — if the
 * two ever drift, sign-in will silently fail because the server can't
 * find the code_verifier the browser stored.
 *
 * Local dev note: `vite dev` does NOT run this function — only
 * `vercel dev` or the deployed site does. Local development therefore
 * keeps using the client-side /app/auth/callback route (see
 * VITE_AUTH_CALLBACK_PATH in .env vs .env.production).
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type VercelRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  writeHead: (statusCode: number, headers: Record<string, string | string[]>) => void;
  end: () => void;
};

export const DEFAULT_RETURN_TO = '/app/find-ride';
const SIGN_IN_PATH = '/app/auth';
// Client route that renders the new-password form (WaselAuthCallback).
const CLIENT_CALLBACK_PATH = '/app/auth/callback';
const COOKIE_NAME = 'wasel-auth-token';

function getEnv(name: string): string {
  return process.env[name] ?? '';
}

function getSupabaseUrl(): string {
  return getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
}

function getSupabaseAnonKey(): string {
  return (
    getEnv('SUPABASE_ANON_KEY') ||
    getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    getEnv('VITE_SUPABASE_ANON_KEY')
  );
}

function getHeader(request: VercelRequest, name: string): string | undefined {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getRequestOrigin(request: VercelRequest): string {
  const proto = getHeader(request, 'x-forwarded-proto') || 'https';
  const host = getHeader(request, 'host') || 'www.wasel14.online';
  return `${proto}://${host}`;
}

/**
 * Never redirect off-site — only allow same-origin paths back into our own app.
 *
 * A plain `startsWith('/')` / `!startsWith('//')` check is not enough: browsers
 * normalise a backslash to a slash, so `/\evil.example` is treated as
 * `//evil.example` (protocol-relative). We therefore reject backslashes and
 * control characters outright, then parse against our own origin and require
 * that the resolved origin is unchanged.
 */
export function hasUnsafeRedirectChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 0x5c /* backslash */ || code <= 0x1f || code === 0x7f) {return true;}
  }
  return false;
}

export function safeReturnTo(value: string | null, origin: string): string {
  if (!value) {return DEFAULT_RETURN_TO;}
  if (!value.startsWith('/') || value.startsWith('//') || hasUnsafeRedirectChars(value)) {
    return DEFAULT_RETURN_TO;
  }
  // Reject dot-segment traversal before URL parsing collapses it into a
  // different same-origin path (defence in depth: still same-origin, but the
  // resolved path would no longer be the one the caller asked for).
  if (/(^|\/)\.\.(\/|$)/.test(value)) {return DEFAULT_RETURN_TO;}
  try {
    const parsed = new URL(value, origin);
    if (parsed.origin !== origin) {return DEFAULT_RETURN_TO;}
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

/**
 * Provider/Supabase error text comes from the URL and is attacker-controllable
 * (phishing copy injected into our sign-in page). Never echo it back; map the
 * known OAuth error codes to fixed messages instead.
 */
export function friendlyAuthError(code: string | null): string {
  switch ((code ?? '').toLowerCase()) {
    case 'access_denied':
      return 'Sign-in was cancelled.';
    case 'server_error':
    case 'temporarily_unavailable':
      return 'The sign-in provider is temporarily unavailable. Please try again.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) {return out;}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) {continue;}
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!name) {continue;}
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

export function serializeCookie(name: string, value: string, options?: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options?.path ?? '/'}`);
  if (options?.domain) {parts.push(`Domain=${options.domain}`);}
  if (typeof options?.maxAge === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }
  parts.push(`SameSite=${options?.sameSite === true ? 'Strict' : (options?.sameSite || 'Lax')}`);
  // Secure cookies are allowed on http://localhost / http://127.0.0.1 by
  // browser spec (treated as a secure context), so this is safe to keep on
  // unconditionally rather than branching on protocol.
  parts.push('Secure');
  if (options?.httpOnly !== false) {parts.push('HttpOnly');}
  return parts.join('; ');
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const origin = getRequestOrigin(request);
  const url = new URL(request.url ?? '/api/auth/callback', origin);
  const code = url.searchParams.get('code');
  const oauthErrorCode = url.searchParams.get('error');
  const oauthError = oauthErrorCode || url.searchParams.get('error_description');
  const returnTo = safeReturnTo(url.searchParams.get('returnTo'), origin);
  const isRecovery = url.searchParams.get('type') === 'recovery';

  if (oauthError) {
    const errorParams = new URLSearchParams({ error: friendlyAuthError(oauthErrorCode) });
    if (returnTo !== DEFAULT_RETURN_TO) { errorParams.set('returnTo', returnTo); }
    response.writeHead(302, { Location: `${SIGN_IN_PATH}?${errorParams.toString()}` });
    response.end();
    return;
  }

  if (!code) {
    // Someone loaded this URL directly with no code and no error — just send
    // them to sign in rather than showing a raw error page.
    response.writeHead(302, { Location: SIGN_IN_PATH });
    response.end();
    return;
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    response.writeHead(302, {
      Location: `${SIGN_IN_PATH}?error=${encodeURIComponent('Sign-in service is not configured.')}`,
    });
    response.end();
    return;
  }

  const incomingCookies = parseCookies(getHeader(request, 'cookie'));
  const outgoingCookies: string[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: { name: COOKIE_NAME, path: '/', sameSite: 'lax', secure: true },
    cookies: {
      getAll() {
        return Object.entries(incomingCookies).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          outgoingCookies.push(serializeCookie(name, value, options));
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // A password-recovery link signs the user in via the code exchange above,
  // but they still have to choose a new password. Hand off to the client
  // callback page (session cookie is already set) instead of dropping them
  // straight into the app at `returnTo`.
  const successLocation = isRecovery
    ? `${CLIENT_CALLBACK_PATH}?type=recovery&returnTo=${encodeURIComponent(returnTo)}`
    : returnTo;

  let failLocation = `${SIGN_IN_PATH}?error=${encodeURIComponent(friendlyAuthError(null))}`;
  if (returnTo !== DEFAULT_RETURN_TO) { failLocation += `&returnTo=${encodeURIComponent(returnTo)}`; }
  const headers: Record<string, string | string[]> = {
    Location: error ? failLocation : successLocation,
  };
  if (outgoingCookies.length > 0) {
    headers['Set-Cookie'] = outgoingCookies;
  }

  response.writeHead(302, headers);
  response.end();
}
