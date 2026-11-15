/**
 * Edge function tests — Trust Center phone verification
 *
 * Run with:
 *   deno test --allow-env --allow-net supabase/functions/tests/phone-otp.test.ts
 *
 * Regression cover for the Trust Center "Internal server error" reported when a
 * user tried to update their phone number.
 *
 * Root cause: `sendTwilioOtpSms` and `callTwilioVerify` issued a bare
 * `await fetch(...)` with no timeout and no try/catch. Both phone handlers left
 * the provider call unguarded, so any transport-level failure (DNS, TLS, reset,
 * timeout) threw out of the handler. `Deno.serve` in index.ts catches every
 * escaped exception and rewrites it through `sanitizedUnhandledErrorResponse()`
 * into `500 {"error":"Internal server error"}`. The frontend has direct-database
 * fallback disabled in production, so `runBackendWorkflow` rethrows that payload
 * verbatim and the toast showed the generic string with no diagnostic detail.
 *
 * These tests pin the contract that made the failure invisible: provider I/O
 * must degrade into a typed, retryable result — never into a thrown exception.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
Deno.env.set('TWILIO_ACCOUNT_SID', `AC${'0'.repeat(32)}`);
Deno.env.set('TWILIO_API_KEY_SID', `SK${'0'.repeat(32)}`);
Deno.env.set('TWILIO_API_KEY_SECRET', 'test-api-key-secret');
Deno.env.set('TWILIO_AUTH_TOKEN', 'test-account-auth-token');
Deno.env.set('TWILIO_MESSAGING_SERVICE_SID', `MG${'0'.repeat(32)}`);
Deno.env.set('TWILIO_VERIFY_SERVICE_SID', `VA${'0'.repeat(32)}`);

const {
  callTwilioVerify,
  checkTwilioPhoneVerification,
  getTwilioAuthPairs,
  sendTwilioOtpSms,
  startTwilioPhoneVerification,
} = await import('../make-server-0b1f4071/_handlers/shared.ts');

const realFetch = globalThis.fetch;

function withStubbedFetch(stub: typeof globalThis.fetch, run: () => Promise<void>) {
  return async () => {
    globalThis.fetch = stub;
    try {
      await run();
    } finally {
      globalThis.fetch = realFetch;
    }
  };
}

const throwingFetch = () => {
  throw new TypeError('error sending request for url (https://api.twilio.com/...)');
};

Deno.test('Twilio credential pairs stay correctly paired and API-key auth is preferred', () => {
  assertEquals(getTwilioAuthPairs(), [
    { user: `SK${'0'.repeat(32)}`, password: 'test-api-key-secret' },
    { user: `AC${'0'.repeat(32)}`, password: 'test-account-auth-token' },
  ]);
});

Deno.test(
  'Verify retries account credentials only after API-key authentication fails',
  () => {
    const authHeaders: string[] = [];
    return withStubbedFetch(async (_input, init) => {
      authHeaders.push(new Headers(init?.headers).get('Authorization') ?? '');
      const isFirstCall = authHeaders.length === 1;
      return new Response(
        JSON.stringify(isFirstCall ? { message: 'Unauthorized' } : { status: 'pending' }),
        { status: isFirstCall ? 401 : 200, headers: { 'Content-Type': 'application/json' } },
      );
    }, async () => {
      const result = await callTwilioVerify(
        '/Verifications',
        new URLSearchParams({ To: '+962791234567' }),
      );

      assertEquals(result.ok, true);
      assertEquals(authHeaders, [
        `Basic ${btoa(`SK${'0'.repeat(32)}:test-api-key-secret`)}`,
        `Basic ${btoa(`AC${'0'.repeat(32)}:test-account-auth-token`)}`,
      ]);
    })();
  },
);

Deno.test(
  'invalid Twilio credentials are not reported as an incorrect user code',
  () => {
    let calls = 0;
    return withStubbedFetch(async () => {
      calls += 1;
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }, async () => {
      const result = await callTwilioVerify(
        '/VerificationCheck',
        new URLSearchParams({ To: '+962791234567', Code: '123456' }),
      );

      assertEquals(calls, 2);
      assertEquals(result.ok, false);
      assertEquals(result.retryable, false);
    })();
  },
);

Deno.test(
  'Verify does not retry a provider error that could create a duplicate code',
  () => {
    let calls = 0;
    return withStubbedFetch(async () => {
      calls += 1;
      return new Response(JSON.stringify({ message: 'Provider unavailable' }), { status: 503 });
    }, async () => {
      const result = await callTwilioVerify(
        '/Verifications',
        new URLSearchParams({ To: '+962791234567' }),
      );

      assertEquals(result.ok, false);
      assertEquals(calls, 1);
    })();
  },
);

Deno.test(
  'sendTwilioOtpSms returns a typed failure instead of throwing when the provider is unreachable',
  withStubbedFetch(throwingFetch, async () => {
    const result = await sendTwilioOtpSms('+962791234567', '123456');

    assertEquals(result.ok, false);
    assertEquals(result.retryable, true);
    assert(
      typeof result.error === 'string' && result.error.length > 0,
      'a human-readable error must be returned so the caller can surface it',
    );
  }),
);

Deno.test(
  'callTwilioVerify returns a typed failure instead of throwing when the provider is unreachable',
  withStubbedFetch(throwingFetch, async () => {
    const result = await callTwilioVerify(
      '/Verifications',
      new URLSearchParams({ To: '+962791234567' }),
    );

    assertEquals(result.ok, false);
    assert(
      typeof result.error === 'string' && result.error.length > 0,
      'a human-readable error must be returned so the caller can surface it',
    );
  }),
);

Deno.test(
  'neither phone verification helper throws on a transport failure',
  withStubbedFetch(throwingFetch, async () => {
    const start = await startTwilioPhoneVerification('+962791234567');
    assertEquals(start.ok, false);

    const check = await checkTwilioPhoneVerification('+962791234567', '123456');
    assertEquals(check.ok, false);
    // A transport failure must stay a 502 on the confirm route, and must never be
    // reported to the user as a 400 "incorrect code".
    assertEquals(check.retryable, false);
  }),
);

Deno.test(
  'an unresponsive provider is aborted by the request timeout instead of hanging',
  withStubbedFetch(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')));
      }),
    async () => {
      const startedAt = Date.now();
      const result = await callTwilioVerify(
        '/Verifications',
        new URLSearchParams({ To: '+962791234567' }),
      );
      const elapsed = Date.now() - startedAt;

      assertEquals(result.ok, false);
      assert(elapsed < 15_000, `expected the request to be aborted, took ${elapsed}ms`);
    },
  ),
);

Deno.test(
  'a provider HTTP error is still surfaced verbatim to the caller',
  withStubbedFetch(
    async () =>
      new Response(
        JSON.stringify({ message: 'The To number is not a valid mobile number' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    async () => {
      const result = await callTwilioVerify(
        '/Verifications',
        new URLSearchParams({ To: '+962791234567' }),
      );

      assertEquals(result.ok, false);
      assertEquals(result.retryable, true);
      assertEquals(result.error, 'The To number is not a valid mobile number');
    },
  ),
);
