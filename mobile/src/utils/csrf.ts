/**
 * The edge function (supabase/functions/make-server-0b1f4071/_handlers/shared.ts,
 * enforceRequestSecurity) rejects every mutating, non-webhook request that lacks an
 * `x-csrf-token` header. The API is bearer-token authenticated, so this header is a
 * same-origin tripwire for browsers, not a secret: the server only checks that it is
 * present. Native clients have no browser origin, but they still must send it or every
 * POST/PUT/PATCH/DELETE answers 403.
 *
 * One token per app launch is enough. Do not treat it as a security control.
 */
export const CSRF_HEADER = 'x-csrf-token';

let sessionToken: string | null = null;

/**
 * Returns a cryptographically random session token.
 *
 * Uses `crypto.getRandomValues` (available in React Native's Hermes runtime via
 * the global `crypto` polyfill) instead of `Math.random()`, which is not
 * cryptographically secure. The token is a hex string derived from 16 random bytes
 * (128 bits of entropy), prefixed with `m_` to distinguish mobile-origin tokens.
 */
function generateSecureToken(): string {
  try {
    const bytes = new Uint8Array(16);
    // `globalThis.crypto` is available in Hermes (RN 0.71+) and in Node 19+.
    // Fall back to a timestamp+counter if for any reason the API is absent.
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return `m_${hex}`;
    }
  } catch {
    // Intentional fallthrough to degraded path below.
  }
  // Degraded fallback (should never happen on a modern RN runtime):
  // Combine timestamp with a large random mantissa for minimal uniqueness.
  const t = Date.now().toString(36);
  const r1 = Math.random().toString(36).slice(2, 12);
  const r2 = Math.random().toString(36).slice(2, 12);
  return `m_fb_${t}_${r1}${r2}`;
}

export function getCsrfToken(): string {
  if (!sessionToken) {
    sessionToken = generateSecureToken();
  }
  return sessionToken;
}

/** Test helper: forces a new token on the next call. */
export function resetCsrfTokenForTests(): void {
  sessionToken = null;
}
