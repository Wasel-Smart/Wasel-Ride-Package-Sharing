/**
 * Edge function tests — payment amount authority
 *
 * Run with:
 *   npm run test:edge -- payments
 *
 * `computeBookingAmountMinor` decides how much a passenger is charged for a booking.
 * The client never supplies the price: it is derived here from the stored booking,
 * and only the booking's owner may pay it. These tests pin that contract using a
 * stub admin client, so they need no network and no real credentials.
 *
 * `_handlers/shared.ts` reads its environment at module scope, so the variables it
 * needs are set before the first import (same pattern as webhooks.test.ts).
 */

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

const { computeBookingAmountMinor, verifyPaymentIntentOwnership } = await import(
  '../make-server-0b1f4071/_handlers/payments.ts'
);

type Admin = Parameters<typeof computeBookingAmountMinor>[0];

// Mimics the only chain the function uses: from().select().eq().maybeSingle().
function fakeAdmin(
  row: Record<string, unknown> | null,
  error: { message: string } | null = null,
  options: { missingPassengerId?: boolean } = {},
): Admin {
  let selectedColumns = '';
  const chain = {
    select: (columns: string) => {
      selectedColumns = columns;
      return chain;
    },
    eq: () => chain,
    maybeSingle: () => Promise.resolve(
      options.missingPassengerId && selectedColumns.includes('passenger_id')
        ? { data: null, error: { code: '42703', message: 'column bookings.passenger_id does not exist' } }
        : { data: row, error },
    ),
  };
  return { from: () => chain } as unknown as Admin;
}

const OWNER = { id: 'user-owner' };

function booking(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'b-1',
    passenger_id: OWNER.id,
    price_per_seat: 4,
    seats_requested: 2,
    currency: 'jod',
    payment_status: 'pending',
    stripe_payment_intent_id: null,
    status: 'confirmed',
    ...overrides,
  };
}

Deno.test('computeBookingAmountMinor — null for an empty booking id', async () => {
  assertEquals(await computeBookingAmountMinor(fakeAdmin(booking()), '   ', OWNER), null);
});

Deno.test('computeBookingAmountMinor — derives the amount from the stored seat price, in fils for JOD', async () => {
  const result = await computeBookingAmountMinor(fakeAdmin(booking()), 'b-1', OWNER);
  assertEquals(result?.amountMinor, 8000); // 4 JOD x 2 seats = 8 JOD = 8000 fils
  assertEquals(result?.currency, 'jod');
});

Deno.test('computeBookingAmountMinor — a different user cannot pay for the booking', async () => {
  const result = await computeBookingAmountMinor(fakeAdmin(booking()), 'b-1', { id: 'someone-else' });
  assertEquals(result, null);
});

Deno.test('computeBookingAmountMinor — older schemas that store the owner in user_id still match', async () => {
  const legacy = booking({ passenger_id: null, user_id: OWNER.id });
  const result = await computeBookingAmountMinor(fakeAdmin(legacy, null, { missingPassengerId: true }), 'b-1', OWNER);
  assertEquals(result?.amountMinor, 8000);
});

Deno.test('verifyPaymentIntentOwnership — recognizes intents in legacy user_id bookings', async () => {
  const legacy = booking({ passenger_id: null, user_id: OWNER.id, stripe_payment_intent_id: 'pi_legacy' });
  const result = await verifyPaymentIntentOwnership(
    fakeAdmin(legacy, null, { missingPassengerId: true }),
    'pi_legacy',
  );
  assertEquals(result.owned, true);
  assertEquals(result.amountMinor, 8000);
});

Deno.test('computeBookingAmountMinor — an already paid or refunded booking is not payable again', async () => {
  for (const status of ['succeeded', 'completed', 'paid', 'refunded', 'partially_refunded']) {
    const result = await computeBookingAmountMinor(
      fakeAdmin(booking({ payment_status: status })),
      'b-1',
      OWNER,
    );
    assertEquals(result, null, `payment_status=${status} must not be payable`);
  }
});

Deno.test('computeBookingAmountMinor — unsupported currency fails closed', async () => {
  const result = await computeBookingAmountMinor(fakeAdmin(booking({ currency: 'xyz' })), 'b-1', OWNER);
  assertEquals(result, null);
});

Deno.test('computeBookingAmountMinor — a zero or missing fare is not payable', async () => {
  const free = await computeBookingAmountMinor(
    fakeAdmin(booking({ price_per_seat: 0, seats_requested: 0 })),
    'b-1',
    OWNER,
  );
  assertEquals(free, null);
});

Deno.test('computeBookingAmountMinor — unknown booking and lookup errors both yield null', async () => {
  assertEquals(await computeBookingAmountMinor(fakeAdmin(null), 'missing', OWNER), null);
  assertEquals(
    await computeBookingAmountMinor(fakeAdmin(null, { message: 'db down' }), 'b-1', OWNER),
    null,
  );
});
