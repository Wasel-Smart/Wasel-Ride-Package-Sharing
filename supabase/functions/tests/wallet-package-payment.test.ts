import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

const { resolvePayableAmount } = await import('../make-server-0b1f4071/_handlers/wallet.ts');

function packageAdmin(row: Record<string, unknown>) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }),
      }),
    }),
  } as unknown as Parameters<typeof resolvePayableAmount>[0];
}

Deno.test('package payment uses the server fee fields, preferring fee_amount', async () => {
  const result = await resolvePayableAmount(
    packageAdmin({
      id: 'package-1',
      sender_id: 'sender-1',
      status: 'posted',
      fee_amount: 5.61,
      delivery_fee: 5,
    }),
    'package_delivery',
    'package-1',
    'sender-1',
  );

  assertEquals(result, { amountJod: 5.61, metadata: { package_id: 'package-1' } });
});

Deno.test('package payment falls back to legacy delivery_fee', async () => {
  const result = await resolvePayableAmount(
    packageAdmin({
      id: 'package-1',
      sender_id: 'sender-1',
      status: 'posted',
      fee_amount: null,
      delivery_fee: 5.26,
    }),
    'package_delivery',
    'package-1',
    'sender-1',
  );

  assertEquals(result, { amountJod: 5.26, metadata: { package_id: 'package-1' } });
});

Deno.test('package payment refuses a package already in transit even if its legacy status is posted', async () => {
  const result = await resolvePayableAmount(
    packageAdmin({
      id: 'package-1',
      sender_id: 'sender-1',
      status: 'posted',
      package_status: 'in_transit',
      fee_amount: 5.26,
    }),
    'package_delivery',
    'package-1',
    'sender-1',
  );

  assertEquals('error' in result && result.error.status, 409);
});
