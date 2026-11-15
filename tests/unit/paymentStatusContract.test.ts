import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';

// Contract guard between the web client and the edge function for
// GET /booking/:id/payment-status.
//
// The route-contract script only proves a path exists on both sides. It cannot see
// the response *shape*, which is how the client came to compare an object to the
// string 'succeeded' and always report "pending". This test reads the handler
// source, extracts the key it answers with, and feeds that exact shape through the
// client parser, so a rename on either side fails here instead of in production.

vi.mock('@/utils/supabase/client', () => ({ supabase: null }));
vi.mock('@/services/core', () => ({ getAuthDetails: vi.fn() }));

import { extractPaymentStatus } from '@/services/payment';

const HANDLER_PATH = path.resolve(
  __dirname,
  '../../supabase/functions/make-server-0b1f4071/_handlers/payments.ts',
);

function readHandlerSource(): string {
  return readFileSync(HANDLER_PATH, 'utf8');
}

function statusHandlerBody(source: string): string {
  const start = source.indexOf('export async function handleGetPaymentStatus');
  expect(start, 'handleGetPaymentStatus must exist in payments.ts').toBeGreaterThan(-1);
  return source.slice(start);
}

describe('payment-status response contract', () => {
  it('the edge handler answers with a single { paymentStatus } key', () => {
    const body = statusHandlerBody(readHandlerSource());
    const match = /return json\(\s*\{\s*([A-Za-z_]+)\s*:/.exec(body.slice(body.lastIndexOf('return json(')));
    expect(match, 'could not find the success response of handleGetPaymentStatus').not.toBeNull();
    expect(match?.[1]).toBe('paymentStatus');
  });

  it('the client parser understands exactly what the handler returns', () => {
    const body = statusHandlerBody(readHandlerSource());
    const match = /return json\(\s*\{\s*([A-Za-z_]+)\s*:/.exec(body.slice(body.lastIndexOf('return json(')));
    const key = match?.[1] ?? '';

    for (const status of ['succeeded', 'failed', 'pending']) {
      expect(extractPaymentStatus({ [key]: status })).toBe(status);
    }
  });

  it('the handler only reads the caller\'s own booking', () => {
    const body = statusHandlerBody(readHandlerSource());
    expect(body).toMatch(/\.eq\(\s*'passenger_id',\s*auth\.canonicalUser\.id\s*\)/);
  });
});
