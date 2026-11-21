/**
 * Ops-readiness test: every mutating, non-public route must reject requests
 * that arrive without authentication (Bearer token) and CSRF token.
 *
 * The single public exemptions are:
 *  - /health (GET, handled before resolveRoute)
 *  - /mobility-os/public-snapshot (GET, public read)
 *  - /trips/calculate-price (POST, deterministic read exposed as POST)
 *  - webhook routes (verified by signature, not bearer token)
 *
 * enforceRequestSecurity is the first gate after CORS preflight.  If it
 * returns a Response, the request never reaches a handler.  This test
 * verifies that gate fires for every mutating route and stays silent for
 * the known exemptions.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { enforceRequestSecurity } from '../make-server-0b1f4071/_handlers/shared.ts';

const MUTATING_METHODS = [ 'POST', 'PUT', 'PATCH', 'DELETE' ];

/** Build a minimal Request with no auth headers. */
function anonRequest ( method: string, path: string ): Request {
  const url = `https://wasel14.online/functions/v1/make-server-0b1f4071${ path }`;
  return new Request( url, { method } );
}

/** Build a Request with Bearer + CSRF headers. */
function authedRequest ( method: string, path: string ): Request {
  const url = `https://wasel14.online/functions/v1/make-server-0b1f4071${ path }`;
  return new Request( url, {
    method,
    headers: {
      'Authorization': 'Bearer fake-token',
      'x-csrf-token': 'fake-csrf',
    },
  } );
}

// ── Mutating routes that MUST reject anonymous requests ───────────────────

const PROTECTED_MUTATING_ROUTES: Array<{ method: string; path: string; id: string }> = [
  { method: 'POST', path: '/profile', id: 'profile-create' },
  { method: 'PATCH', path: '/profile/abc123', id: 'profile-update' },
  { method: 'POST', path: '/bookings', id: 'bookings-create' },
  { method: 'POST', path: '/packages', id: 'packages-create' },
  { method: 'POST', path: '/ratings', id: 'ratings-submit' },
  { method: 'POST', path: '/reports', id: 'reports-submit' },
  { method: 'POST', path: '/cancellations/bookings', id: 'cancel-booking' },
  { method: 'POST', path: '/cancellations/trips', id: 'cancel-trip' },
  { method: 'POST', path: '/chat/trips/abc/messages', id: 'chat-send' },
  { method: 'POST', path: '/chat/messages/read', id: 'chat-read' },
  { method: 'POST', path: '/active-trip', id: 'active-trip-set' },
  { method: 'PATCH', path: '/active-trip', id: 'active-trip-patch' },
  { method: 'DELETE', path: '/active-trip', id: 'active-trip-clear' },
  { method: 'POST', path: '/notifications/send-push', id: 'notifications-send-push' },
  { method: 'POST', path: '/notifications/push-pref', id: 'notifications-push-pref' },
  { method: 'PATCH', path: '/notifications/abc123/read', id: 'notifications-mark-read' },
  { method: 'POST', path: '/notifications/mark-all-read', id: 'notifications-mark-all-read' },
  { method: 'POST', path: '/notifications/push-token', id: 'notifications-push-token' },
  { method: 'POST', path: '/reviews', id: 'reviews-submit' },
  { method: 'POST', path: '/gdpr/consents', id: 'gdpr-consents-post' },
  { method: 'POST', path: '/gdpr/data-exports', id: 'gdpr-data-exports' },
  { method: 'POST', path: '/gdpr/deletions', id: 'gdpr-deletions' },
  { method: 'POST', path: '/gdpr/deletions/cancel', id: 'gdpr-deletions-cancel' },
  { method: 'POST', path: '/mobility-os/booking/create', id: 'mobility-os-booking' },
  { method: 'POST', path: '/wallet/topup', id: 'wallet-topup' },
  { method: 'POST', path: '/wallet/withdraw', id: 'wallet-withdraw' },
  { method: 'POST', path: '/trust/phone/start', id: 'trust-phone-start' },
];

for ( const route of PROTECTED_MUTATING_ROUTES ) {
  Deno.test( `anonymous ${ route.method } ${ route.path } is rejected with 403`, () => {
    const res = enforceRequestSecurity( anonRequest( route.method, route.path ), route.path );
    assert( res !== null, `${ route.id }: expected 403 but got null (request would pass through)` );
    assertEquals( res!.status, 403, `${ route.id }: expected status 403` );
  } );

  Deno.test( `authenticated ${ route.method } ${ route.path } passes the security gate`, () => {
    const res = enforceRequestSecurity( authedRequest( route.method, route.path ), route.path );
    assertEquals( res, null, `${ route.id }: expected null (auth headers present) but got a rejection` );
  } );
}

// ── Public exemptions: security gate must stay silent ─────────────────────

Deno.test( 'POST /trips/calculate-price is exempt (public deterministic read)', () => {
  const res = enforceRequestSecurity( anonRequest( 'POST', '/trips/calculate-price' ), '/trips/calculate-price' );
  assertEquals( res, null, 'price calculation must work without auth' );
} );

Deno.test( 'GET requests are not gated by enforceRequestSecurity (read safety)', () => {
  // GET routes are not mutating, so the CSRF gate does not fire here.
  // Auth for GET routes is enforced inside each handler via authenticateRequest.
  const res = enforceRequestSecurity( anonRequest( 'GET', '/bookings' ), '/bookings' );
  assertEquals( res, null, 'GET requests should not be rejected by the CSRF gate' );
} );

// ── Webhook routes are exempt (signature verification instead) ──────────────

const WEBHOOK_ROUTES = [
  '/webhooks/stripe',
  '/webhooks/cliq',
  '/webhooks/supabase',
];

for ( const wh of WEBHOOK_ROUTES ) {
  Deno.test( `POST ${ wh } (webhook) bypasses CSRF gate`, () => {
    const res = enforceRequestSecurity( anonRequest( 'POST', wh ), wh );
    assertEquals( res, null, `webhook ${ wh } must not be rejected by CSRF gate (uses signature verification)` );
  } );
}
