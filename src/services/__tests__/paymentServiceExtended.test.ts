import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as BackendWorkflowModule from '../backendWorkflow';

// These tests run the real paymentService against the real currency conversion
// (the sibling paymentService.test.ts mocks it). Boundary values, floating-point
// rounding and the refund body are exactly where a money bug would hide.
//
// This file used to assert on local constants (`const amount = 0; expect(amount > 0)`),
// which never touched application code and could not fail. Every test below calls
// paymentService.

const mocks = vi.hoisted(() => {
  const getUser = vi.fn();
  return { getUser, supabase: { auth: { getUser } } };
});

vi.mock('@/utils/supabase/client', () => ({ supabase: mocks.supabase }));

vi.mock('../backendWorkflow', async (importOriginal) => {
  const actual = await importOriginal<typeof BackendWorkflowModule>();
  return { ...actual, requestEdgeJson: vi.fn() };
});

vi.mock('../core', () => ({ getAuthDetails: vi.fn() }));

import { paymentService } from '../payment';
import { requestEdgeJson } from '../backendWorkflow';
import { getAuthDetails } from '../core';

const requestEdge = vi.mocked(requestEdgeJson);
const intentReply = { clientSecret: 'secret', paymentIntentId: 'pi_1' };

function lastRequest(): { path?: string; body?: Record<string, unknown> } {
  const calls = requestEdge.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as { path?: string; body?: Record<string, unknown> };
}

describe('paymentService with real currency conversion', () => {
  beforeEach(() => {
    requestEdge.mockReset();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    vi.mocked(getAuthDetails).mockResolvedValue({ token: 'tok', userId: 'user-1' } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createPaymentIntent amounts', () => {
    it.each<[string, number, number]>([
      ['jod', 0.05, 50],
      ['JOD', 1.5, 1500],
      ['jod', 12.345, 12345],
      ['usd', 0.5, 50],
      ['usd', 12.34, 1234],
    ])('sends %s %s as %i minor units', async (currency, amount, expectedMinor) => {
      requestEdge.mockResolvedValueOnce(intentReply);

      await paymentService.createPaymentIntent({ amount, currency, bookingId: `b-${ currency }-${ amount }` });

      expect(lastRequest().path).toBe('/payment/create-intent');
      expect(lastRequest().body?.amount).toBe(expectedMinor);
    });

    it('rounds floating-point sums instead of truncating them', async () => {
      requestEdge.mockResolvedValueOnce(intentReply).mockResolvedValueOnce(intentReply);

      // 0.1 + 0.2 === 0.30000000000000004 and 19.99 * 100 === 1998.9999999999998
      await paymentService.createPaymentIntent({ amount: 0.1 + 0.2, currency: 'jod', bookingId: 'float-jod' });
      expect(lastRequest().body?.amount).toBe(300);

      await paymentService.createPaymentIntent({ amount: 19.99, currency: 'usd', bookingId: 'float-usd' });
      expect(lastRequest().body?.amount).toBe(1999);
    });

    it.each<[string, number]>([
      ['jod', 0.049],
      ['jod', 0],
      ['jod', -2],
      ['jod', Number.NaN],
      ['jod', Number.POSITIVE_INFINITY],
      ['usd', 0.49],
    ])('rejects %s %s before any network call', async (currency, amount) => {
      await expect(
        paymentService.createPaymentIntent({ amount, currency, bookingId: 'b-invalid' }),
      ).rejects.toThrow('Payment amount must be at least 0.50');

      expect(requestEdge).not.toHaveBeenCalled();
    });

    it('never reaches the network for an unauthenticated user', async () => {
      mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'no session' } });

      await expect(
        paymentService.createPaymentIntent({ amount: 5, bookingId: 'b-anon' }),
      ).rejects.toMatchObject({ name: 'BackendRequestError', status: 401 });

      expect(requestEdge).not.toHaveBeenCalled();
    });

    it('keeps the idempotency key stable per booking so a retry cannot double charge', async () => {
      requestEdge.mockResolvedValueOnce(intentReply);
      await paymentService.createPaymentIntent({ amount: 5, bookingId: 'booking-stable' });
      const firstKey = lastRequest().body?.idempotency_key;

      requestEdge.mockResolvedValueOnce(intentReply);
      await paymentService.createPaymentIntent({ amount: 5, bookingId: 'booking-stable' });

      expect(firstKey).toBe('booking:booking-stable');
      expect(lastRequest().body?.idempotency_key).toBe(firstKey);
    });

    it('ignores caller metadata that tries to override booking_id or user_id', async () => {
      requestEdge.mockResolvedValueOnce(intentReply);

      await paymentService.createPaymentIntent({
        amount: 5,
        bookingId: 'real-booking',
        metadata: { booking_id: 'someone-elses', user_id: 'someone-else', note: 'kept' },
      });

      expect(lastRequest().body?.metadata).toEqual({
        booking_id: 'real-booking',
        user_id: 'user-1',
        note: 'kept',
      });
    });
  });

  describe('processRefund request body', () => {
    it('converts a JOD amount to fils', async () => {
      requestEdge.mockResolvedValueOnce({ refundId: 'ref_1', amount: 7500 });

      await paymentService.processRefund({ bookingId: 'b-1', amount: 7.5, reason: 'cancelled' });

      expect(lastRequest().path).toBe('/payment/refund');
      expect(lastRequest().body).toMatchObject({
        action: 'create-refund',
        booking_id: 'b-1',
        amount: 7500,
        reason: 'cancelled',
      });
    });

    it('prefers amountMinor over amount when both are given', async () => {
      requestEdge.mockResolvedValueOnce({ refundId: 'ref_2', amount: 123 });

      await paymentService.processRefund({ bookingId: 'b-2', amount: 99, amountMinor: 123, reason: 'dispute' });

      expect(lastRequest().body?.amount).toBe(123);
    });

    it('omits the amount for a full refund', async () => {
      requestEdge.mockResolvedValueOnce({ refundId: 'ref_3' });

      const result = await paymentService.processRefund({ bookingId: 'b-3', reason: 'duplicate' });

      expect(lastRequest().body?.amount).toBeUndefined();
      expect(result).toMatchObject({ success: true, refundId: 'ref_3', status: 'succeeded' });
    });

    it('reports the amount the server actually refunded', async () => {
      requestEdge.mockResolvedValueOnce({ refundId: 'ref_4', amount: 4000, status: 'pending' });

      const result = await paymentService.processRefund({ bookingId: 'b-4', amount: 5, reason: 'partial' });

      expect(result.amountMinor).toBe(4000);
      expect(result.status).toBe('pending');
    });
  });

  describe('confirmPayment polling', () => {
    it('stops immediately on a failed payment', async () => {
      requestEdge.mockResolvedValueOnce({ paymentStatus: 'failed' });

      await expect(paymentService.confirmPayment('b-failed')).resolves.toBe('failed');
      expect(requestEdge).toHaveBeenCalledTimes(1);
    });

    it('treats an unknown booking as still pending and gives up after the poll window', async () => {
      vi.useFakeTimers();
      requestEdge.mockResolvedValue({ paymentStatus: 'unknown' });

      const promise = paymentService.confirmPayment('b-missing');
      await vi.advanceTimersByTimeAsync(35_000);

      await expect(promise).resolves.toBe('pending');
    });

    it('treats a response with no usable status as pending rather than succeeded', async () => {
      vi.useFakeTimers();
      requestEdge.mockResolvedValue({});

      const promise = paymentService.confirmPayment('b-empty');
      await vi.advanceTimersByTimeAsync(35_000);

      await expect(promise).resolves.toBe('pending');
    });
  });
});
