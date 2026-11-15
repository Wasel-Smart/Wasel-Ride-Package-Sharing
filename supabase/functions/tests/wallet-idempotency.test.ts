/**
 * Edge function tests — wallet send idempotency key parsing
 *
 * Run with:
 *   npm run test:edge -- wallet-idempotency
 *
 * The transfer itself is made atomic in Postgres (app_transfer_wallet_funds_idempotent);
 * these tests cover the request-side contract: what the handler accepts, tolerates and
 * rejects before it ever reaches the database.
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

const { parseWalletIdempotencyKey } = await import('../make-server-0b1f4071/_handlers/wallet.ts');

const VALID_KEY = '3f2b8c1e-9a4d-4e6f-8b1a-2c7d5e9f0a1b';

Deno.test('parseWalletIdempotencyKey — a missing key is tolerated while the rollout is optional', () => {
  for (const raw of [undefined, null, '']) {
    const result = parseWalletIdempotencyKey(raw);
    assertEquals(result.ok, true);
    if (result.ok) {assertEquals(result.key, null);}
  }
});

Deno.test('parseWalletIdempotencyKey — a missing key is refused with 400 once it is required', async () => {
  const result = parseWalletIdempotencyKey(undefined, true);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.response.status, 400);
    assertEquals((await result.response.json()).code, 'IDEMPOTENCY_KEY_REQUIRED');
  }
});

Deno.test('parseWalletIdempotencyKey — accepts a UUID and trims surrounding whitespace', () => {
  const result = parseWalletIdempotencyKey(`  ${VALID_KEY}  `);
  assertEquals(result.ok, true);
  if (result.ok) {assertEquals(result.key, VALID_KEY);}
});

Deno.test('parseWalletIdempotencyKey — rejects malformed keys even when keys are optional', async () => {
  const malformed: unknown[] = [
    'short',
    'a'.repeat(129),
    'has spaces in the middle of it!!',
    'semi;colon-injection-attempt-1234',
    Number.MAX_SAFE_INTEGER + 1,
    { key: VALID_KEY },
    ['x'.repeat(20)],
  ];
  for (const raw of malformed) {
    const result = parseWalletIdempotencyKey(raw);
    assertEquals(result.ok, false, `expected ${JSON.stringify(raw)} to be rejected`);
    if (!result.ok) {
      assertEquals(result.response.status, 400);
      assertEquals((await result.response.json()).code, 'IDEMPOTENCY_KEY_INVALID');
    }
  }
});

Deno.test('parseWalletIdempotencyKey — the length bounds are inclusive at 16 and 128', () => {
  assertEquals(parseWalletIdempotencyKey('a'.repeat(16)).ok, true);
  assertEquals(parseWalletIdempotencyKey('a'.repeat(128)).ok, true);
  assertEquals(parseWalletIdempotencyKey('a'.repeat(15)).ok, false);
});
