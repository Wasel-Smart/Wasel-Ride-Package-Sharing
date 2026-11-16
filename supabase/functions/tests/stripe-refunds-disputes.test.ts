/**
 * Edge function tests — Stripe refunds and disputes
 *
 * Run with:
 *   npm run test:edge -- stripe-refunds-disputes
 *
 * `applyStripeRefundToBooking` and `recordStripeDispute` turn `charge.refunded` and
 * `charge.dispute.*` webhook events into database state. These tests pin the rules
 * that keep money records honest: status only moves forward, a partial refund is never
 * recorded as a full one, and an unmapped payment is reported rather than guessed at.
 * A recording stub stands in for the admin client, so no network is needed.
 */

import { assert, assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

const { applyStripeRefundToBooking, recordStripeDispute, reverseStripeTopUpRefund } = await import(
  '../make-server-0b1f4071/_handlers/shared.ts'
);

type Admin = Parameters<typeof applyStripeRefundToBooking>[0]['admin'];

interface StubOptions {
  booking?: Record<string, unknown> | null;
  loadError?: { message: string } | null;
  updatedRow?: Record<string, unknown> | null;
  updateError?: { message: string } | null;
  rpcResult?: unknown;
  rpcError?: { message: string } | null;
}

interface Recorded {
  updates: Array<{ patch: Record<string, unknown>; filters: Array<[string, unknown]> }>;
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
}

function stubAdmin(options: StubOptions = {}): { admin: Admin; recorded: Recorded } {
  const recorded: Recorded = { updates: [], rpcCalls: [] };
  const admin = {
    from: () => {
      let mode: 'select' | 'update' = 'select';
      let current: { patch: Record<string, unknown>; filters: Array<[string, unknown]> } | null = null;
      const chain = {
        select: () => chain,
        update: (patch: Record<string, unknown>) => {
          mode = 'update';
          current = { patch, filters: [] };
          recorded.updates.push(current);
          return chain;
        },
        eq: (column: string, value: unknown) => {
          current?.filters.push([column, value]);
          return chain;
        },
        in: (column: string, values: unknown) => {
          current?.filters.push([column, values]);
          return chain;
        },
        maybeSingle: () =>
          Promise.resolve(
            mode === 'update'
              ? { data: options.updatedRow ?? null, error: options.updateError ?? null }
              : { data: options.booking ?? null, error: options.loadError ?? null },
          ),
      };
      return chain;
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      recorded.rpcCalls.push({ name, args });
      return Promise.resolve({ data: options.rpcResult ?? 'inserted', error: options.rpcError ?? null });
    },
  } as unknown as Admin;
  return { admin, recorded };
}

const BOOKING = { booking_id: 'b-1', payment_status: 'succeeded' };

// ── Refunds ───────────────────────────────────────────────────────────────────

Deno.test('refund — a partial refund is recorded as partially_refunded, never as refunded', async () => {
  const { admin, recorded } = stubAdmin({ booking: BOOKING, updatedRow: { booking_id: 'b-1' } });
  const result = await applyStripeRefundToBooking({ admin, intentId: 'pi_1', chargeAmount: 8000, amountRefunded: 3000 });

  assertEquals(result, { applied: true, reason: 'applied', bookingId: 'b-1', status: 'partially_refunded' });
  assertEquals(recorded.updates.length, 1);
  assertEquals(recorded.updates[0].patch.payment_status, 'partially_refunded');
  const from = recorded.updates[0].filters.find(([column]) => column === 'payment_status')?.[1] as string[];
  assertEquals(from.includes('refunded'), false);
  assertEquals(from.includes('partially_refunded'), false);
});

Deno.test('refund — a full refund is recorded as refunded and may follow a partial one', async () => {
  const { admin, recorded } = stubAdmin({ booking: BOOKING, updatedRow: { booking_id: 'b-1' } });
  const result = await applyStripeRefundToBooking({ admin, intentId: 'pi_1', chargeAmount: 8000, amountRefunded: 8000 });

  assertEquals(result.status, 'refunded');
  assertEquals(recorded.updates[0].patch.payment_status, 'refunded');
  const from = recorded.updates[0].filters.find(([column]) => column === 'payment_status')?.[1] as string[];
  assert(from.includes('partially_refunded'));
  assertEquals(from.includes('refunded'), false);
});

Deno.test('refund — a refund larger than the charge still counts as full', async () => {
  const { admin } = stubAdmin({ booking: BOOKING, updatedRow: { booking_id: 'b-1' } });
  const result = await applyStripeRefundToBooking({ admin, intentId: 'pi_1', chargeAmount: 8000, amountRefunded: 8001 });
  assertEquals(result.status, 'refunded');
});

Deno.test('refund — a booking already at the target state is reported, not rewritten', async () => {
  const { admin } = stubAdmin({ booking: { booking_id: 'b-1', payment_status: 'refunded' }, updatedRow: null });
  const result = await applyStripeRefundToBooking({ admin, intentId: 'pi_1', chargeAmount: 8000, amountRefunded: 3000 });
  assertEquals(result.applied, false);
  assertEquals(result.reason, 'already_reflected');
});

Deno.test('refund — a payment intent that is not a booking payment is reported and nothing is written', async () => {
  const { admin, recorded } = stubAdmin({ booking: null });
  const originalWarn = console.warn;
  console.warn = () => undefined;
  try {
    const result = await applyStripeRefundToBooking({ admin, intentId: 'pi_topup', chargeAmount: 5000, amountRefunded: 5000 });
    assertEquals(result.applied, false);
    assertEquals(result.reason, 'payment_intent_not_bound_to_booking');
    assertEquals(result.bookingId, null);
  } finally {
    console.warn = originalWarn;
  }
  assertEquals(recorded.updates.length, 0);
});

Deno.test('refund — database errors throw so Stripe retries the event', async () => {
  await assertRejects(
    () => applyStripeRefundToBooking({
      admin: stubAdmin({ loadError: { message: 'db down' } }).admin,
      intentId: 'pi_1',
      chargeAmount: 8000,
      amountRefunded: 8000,
    }),
    Error,
    'db down',
  );
  await assertRejects(
    () => applyStripeRefundToBooking({
      admin: stubAdmin({ booking: BOOKING, updateError: { message: 'write failed' } }).admin,
      intentId: 'pi_1',
      chargeAmount: 8000,
      amountRefunded: 8000,
    }),
    Error,
    'write failed',
  );
});

// ── Wallet top-up refunds ─────────────────────────────────────────────────────

function reversalArgs(admin: Admin, overrides: Record<string, unknown> = {}) {
  return {
    admin,
    intentId: 'pi_topup_1',
    chargeId: 'ch_topup_1',
    amountRefundedMinor: 5000,
    currency: 'JOD',
    eventId: 'evt_refund_1',
    ...overrides,
  };
}

Deno.test('top-up refund — the refunded amount is converted from fils to JOD and sent to the ledger function', async () => {
  const { admin, recorded } = stubAdmin({ rpcResult: 'reversed' });
  const result = await reverseStripeTopUpRefund(reversalArgs(admin));
  assertEquals(result, { outcome: 'reversed' });
  assertEquals(recorded.rpcCalls.length, 1);
  assertEquals(recorded.rpcCalls[0].name, 'app_reverse_stripe_topup_refund');
  assertEquals(recorded.rpcCalls[0].args, {
    p_payment_intent_id: 'pi_topup_1',
    p_charge_id: 'ch_topup_1',
    p_amount_refunded_jod: 5,
    p_event_id: 'evt_refund_1',
  });
});

Deno.test('top-up refund — a shortfall is reported at error level so finance can recover it', async () => {
  const { admin } = stubAdmin({ rpcResult: 'reversed_with_shortfall' });
  const originalError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => { logged.push(args); };
  try {
    const result = await reverseStripeTopUpRefund(reversalArgs(admin));
    assertEquals(result.outcome, 'reversed_with_shortfall');
  } finally {
    console.error = originalError;
  }
  assertEquals(logged.length, 1);
  assertEquals(String(logged[0][0]).includes('SHORTFALL'), true);
});

Deno.test('top-up refund — a clean reversal and a replay raise no alert', async () => {
  const originalError = console.error;
  let logged = 0;
  console.error = () => { logged += 1; };
  try {
    for (const outcome of ['reversed', 'already_applied', 'not_a_topup']) {
      const result = await reverseStripeTopUpRefund(reversalArgs(stubAdmin({ rpcResult: outcome }).admin));
      assertEquals(result.outcome, outcome);
    }
  } finally {
    console.error = originalError;
  }
  assertEquals(logged, 0);
});

Deno.test('top-up refund — a non-JOD refund cannot belong to a top-up and never reaches the database', async () => {
  const { admin, recorded } = stubAdmin({ rpcResult: 'reversed' });
  const result = await reverseStripeTopUpRefund(reversalArgs(admin, { currency: 'usd' }));
  assertEquals(result.outcome, 'ignored_currency');
  assertEquals(recorded.rpcCalls.length, 0);
});

Deno.test('top-up refund — database errors and unknown responses throw so Stripe retries', async () => {
  await assertRejects(
    () => reverseStripeTopUpRefund(reversalArgs(stubAdmin({ rpcError: { message: 'wallet locked' } }).admin)),
    Error,
    'wallet locked',
  );
  await assertRejects(
    () => reverseStripeTopUpRefund(reversalArgs(stubAdmin({ rpcResult: 'bogus' }).admin)),
    Error,
    'unexpected top-up reversal response',
  );
});

// ── Disputes ──────────────────────────────────────────────────────────────────

const DISPUTE = {
  id: 'dp_123',
  charge: 'ch_1',
  payment_intent: 'pi_1',
  amount: 8000,
  currency: 'JOD',
  reason: 'fraudulent',
  status: 'needs_response',
  evidence_details: { due_by: 1_800_000_000 },
};
const EVENT_TIME = '2026-11-16T10:00:00.000Z';

function disputeArgs(admin: Admin, overrides: Record<string, unknown> = {}) {
  return {
    admin,
    dispute: DISPUTE as Record<string, unknown>,
    eventId: 'evt_dp_1',
    eventCreatedAt: EVENT_TIME,
    livemode: false,
    eventType: 'charge.dispute.created',
    ...overrides,
  };
}

Deno.test('dispute — is recorded with the booking, normalised currency and evidence deadline', async () => {
  const { admin, recorded } = stubAdmin({ booking: { booking_id: 'b-1' }, rpcResult: 'inserted' });
  const originalError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => { logged.push(args); };
  try {
    const result = await recordStripeDispute(disputeArgs(admin));
    assertEquals(result, { result: 'inserted', disputeId: 'dp_123', bookingId: 'b-1' });
  } finally {
    console.error = originalError;
  }

  assertEquals(recorded.rpcCalls.length, 1);
  const call = recorded.rpcCalls[0];
  assertEquals(call.name, 'app_record_stripe_dispute');
  assertEquals(call.args.p_dispute_id, 'dp_123');
  assertEquals(call.args.p_booking_id, 'b-1');
  assertEquals(call.args.p_currency, 'jod');
  assertEquals(call.args.p_amount_minor, 8000);
  assertEquals(call.args.p_evidence_due_by, new Date(1_800_000_000 * 1000).toISOString());
  assertEquals(call.args.p_event_created_at, EVENT_TIME);

  // A newly opened dispute must reach the logs at error level so alerting sees it.
  assertEquals(logged.length, 1);
  assertEquals(String(logged[0][0]).includes('DISPUTE OPENED'), true);
});

Deno.test('dispute — a later update does not raise the opened-dispute alert again', async () => {
  const { admin } = stubAdmin({ booking: { booking_id: 'b-1' }, rpcResult: 'updated' });
  const originalError = console.error;
  let logged = 0;
  console.error = () => { logged += 1; };
  try {
    const result = await recordStripeDispute(disputeArgs(admin, { eventType: 'charge.dispute.updated' }));
    assertEquals(result.result, 'updated');
  } finally {
    console.error = originalError;
  }
  assertEquals(logged, 0);
});

Deno.test('dispute — an out-of-order older event is reported as stale', async () => {
  const { admin } = stubAdmin({ booking: null, rpcResult: 'stale' });
  const result = await recordStripeDispute(disputeArgs(admin, { eventType: 'charge.dispute.updated' }));
  assertEquals(result.result, 'stale');
  assertEquals(result.bookingId, null);
});

Deno.test('dispute — a dispute with no id is ignored without touching the database', async () => {
  const { admin, recorded } = stubAdmin();
  const result = await recordStripeDispute(disputeArgs(admin, { dispute: { amount: 100, currency: 'jod' } }));
  assertEquals(result.result, 'ignored');
  assertEquals(recorded.rpcCalls.length, 0);
});

Deno.test('dispute — an invalid amount or currency throws instead of being recorded', async () => {
  const { admin, recorded } = stubAdmin();
  await assertRejects(
    () => recordStripeDispute(disputeArgs(admin, { dispute: { ...DISPUTE, currency: 'jo' } })),
    Error,
    'invalid amount or currency',
  );
  await assertRejects(
    () => recordStripeDispute(disputeArgs(admin, { dispute: { ...DISPUTE, amount: -5 } })),
    Error,
    'invalid amount or currency',
  );
  assertEquals(recorded.rpcCalls.length, 0);
});

Deno.test('dispute — a database or ledger error throws so Stripe retries', async () => {
  await assertRejects(
    () => recordStripeDispute(disputeArgs(stubAdmin({ rpcError: { message: 'rpc failed' } }).admin)),
    Error,
    'rpc failed',
  );
  await assertRejects(
    () => recordStripeDispute(disputeArgs(stubAdmin({ rpcResult: 'bogus' }).admin)),
    Error,
    'unexpected dispute ledger response',
  );
  await assertRejects(
    () => recordStripeDispute(disputeArgs(stubAdmin({ loadError: { message: 'lookup failed' } }).admin)),
    Error,
    'lookup failed',
  );
});
