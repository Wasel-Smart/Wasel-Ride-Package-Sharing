/**
 * Retired compatibility endpoint.
 *
 * All CliQ checkout creation and provider callbacks are owned by
 * make-server-0b1f4071:
 *   - checkout orchestration: make-server-0b1f4071/wallet/top-up (provider: 'cliq')
 *   - provider callbacks:     make-server-0b1f4071/payments/webhooks/cliq
 *
 * This function previously ran a second, divergent payment stack that inserted
 * directly into `payments`. It now returns a clear 410 so old clients fail fast
 * and route to the canonical endpoints instead of creating split-brain payment
 * records. Keep it deployed temporarily for client migration, then remove it.
 */
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://wasel14.online,https://www.wasel14.online')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function responseHeaders(request: Request): Headers {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Vary', 'Origin');
  }
  return headers;
}

Deno.serve((request: Request) => {
  const headers = responseHeaders(request);
  if (request.method === 'OPTIONS') {
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info, x-cliq-signature, x-cliq-timestamp');
    return new Response(null, { status: 204, headers });
  }

  return new Response(
    JSON.stringify({
      error: 'This CliQ endpoint has been retired.',
      code: 'PAYMENT_ENDPOINT_RETIRED',
      canonicalEndpoints: {
        checkout: '/functions/v1/make-server-0b1f4071/wallet/top-up',
        webhook: '/functions/v1/make-server-0b1f4071/payments/webhooks/cliq',
      },
    }),
    { status: 410, headers },
  );
});