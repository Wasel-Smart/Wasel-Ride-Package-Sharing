import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as BackendWorkflowModule from '../backendWorkflow';

// ── Hoisted mocks (vi.mock factories are hoisted before const declarations) ──

const mocks = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockSupabase = { auth: { getUser: mockGetUser } };
  return { mockGetUser, mockSupabase };
});

vi.mock('@/utils/supabase/client', () => ({
  supabase: mocks.mockSupabase,
}));

vi.mock('../backendWorkflow', async (importOriginal) => {
  const actual = await importOriginal<typeof BackendWorkflowModule>();
  return { ...actual, requestEdgeJson: vi.fn() };
});

vi.mock('../core', () => ({
  getAuthDetails: vi.fn(),
}));

vi.mock('../../shared/currency/currency', () => ({
  toMinorUnits: vi.fn((amount: number) => Math.round(amount * 100)),
}));

vi.mock('../../domain/payments/cliq', () => ({
  generateJordanCliqDeeplink: vi.fn(() => 'cliq://deeplink'),
  generateJordanCliqQrPayload: vi.fn(() => 'QR_PAYLOAD'),
}));

import { paymentService, extractPaymentStatus } from '../payment';
import { requestEdgeJson } from '../backendWorkflow';
import { getAuthDetails } from '../core';

const mockRequestEdge = vi.mocked(requestEdgeJson);
const mockGetAuth = vi.mocked(getAuthDetails);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('paymentService', () => {
  beforeEach(() => {
    mocks.mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetAuth.mockResolvedValue({ token: 'tok', userId: 'user-1' });
  });

  afterEach(() => vi.clearAllMocks());

  // ── createPaymentIntent ──────────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    it('returns clientSecret and paymentIntentId on success', async () => {
      mockRequestEdge.mockResolvedValueOnce({
        clientSecret: 'pi_secret_123',
        paymentIntentId: 'pi_123',
      });

      const result = await paymentService.createPaymentIntent({
        amount: 10,
        currency: 'jod',
        bookingId: 'booking-1',
      });

      expect(result.clientSecret).toBe('pi_secret_123');
      expect(result.paymentIntentId).toBe('pi_123');
    });

    it('accepts client_secret as fallback field name', async () => {
      mockRequestEdge.mockResolvedValueOnce({
        client_secret: 'pi_secret_alt',
        paymentIntentId: 'pi_alt',
      });

      const result = await paymentService.createPaymentIntent({ amount: 5, bookingId: 'booking-2' });
      expect(result.clientSecret).toBe('pi_secret_alt');
    });

    it('throws when amount is below minimum (< 0.50 JOD = 50 fils)', async () => {
      await expect(
        paymentService.createPaymentIntent({ amount: 0.49, bookingId: 'b-1' }),
      ).rejects.toThrow('Payment amount must be at least 0.50');
    });

    it('throws when amount is zero', async () => {
      await expect(
        paymentService.createPaymentIntent({ amount: 0, bookingId: 'b-1' }),
      ).rejects.toThrow('Payment amount must be at least 0.50');
    });

    it('throws when amount is negative', async () => {
      await expect(
        paymentService.createPaymentIntent({ amount: -1, bookingId: 'b-1' }),
      ).rejects.toThrow('Payment amount must be at least 0.50');
    });

    it('throws BackendRequestError when response is missing clientSecret', async () => {
      mockRequestEdge.mockResolvedValueOnce({ paymentIntentId: 'pi_1' });

      await expect(
        paymentService.createPaymentIntent({ amount: 5, bookingId: 'b-1' }),
      ).rejects.toMatchObject({ name: 'BackendRequestError', status: 502 });
    });

    it('throws BackendRequestError when response is missing paymentIntentId', async () => {
      mockRequestEdge.mockResolvedValueOnce({ clientSecret: 'secret' });

      await expect(
        paymentService.createPaymentIntent({ amount: 5, bookingId: 'b-1' }),
      ).rejects.toMatchObject({ name: 'BackendRequestError', status: 502 });
    });

    it('throws BackendRequestError when user is not authenticated', async () => {
      mocks.mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Not authed' } });

      await expect(
        paymentService.createPaymentIntent({ amount: 5, bookingId: 'b-1' }),
      ).rejects.toMatchObject({ name: 'BackendRequestError', status: 401 });
    });

    it('shares one in-flight request for a repeated call on the same booking and amount', async () => {
      mockRequestEdge.mockResolvedValueOnce({
        clientSecret: 'pi_secret_1',
        paymentIntentId: 'pi_1',
      });

      const promise1 = paymentService.createPaymentIntent({ amount: 10, bookingId: 'same-booking' });
      const promise2 = paymentService.createPaymentIntent({ amount: 10, bookingId: 'same-booking' });

      const [first, second] = await Promise.all([promise1, promise2]);

      expect(first).toEqual({ clientSecret: 'pi_secret_1', paymentIntentId: 'pi_1' });
      expect(second).toEqual(first);
      expect(mockRequestEdge).toHaveBeenCalledTimes(1);
    });

    it('does not share a request when the amount differs', async () => {
      mockRequestEdge
        .mockResolvedValueOnce({ clientSecret: 's_a', paymentIntentId: 'pi_a' })
        .mockResolvedValueOnce({ clientSecret: 's_b', paymentIntentId: 'pi_b' });

      await Promise.all([
        paymentService.createPaymentIntent({ amount: 10, bookingId: 'diff-booking' }),
        paymentService.createPaymentIntent({ amount: 12, bookingId: 'diff-booking' }),
      ]);

      expect(mockRequestEdge).toHaveBeenCalledTimes(2);
    });

    it('allows a new request after the previous one settled (including after a failure)', async () => {
      mockRequestEdge.mockRejectedValueOnce(new Error('boom'));
      await expect(
        paymentService.createPaymentIntent({ amount: 10, bookingId: 'retry-booking' }),
      ).rejects.toThrow('boom');

      mockRequestEdge.mockResolvedValueOnce({ clientSecret: 's', paymentIntentId: 'pi_retry' });
      const result = await paymentService.createPaymentIntent({ amount: 10, bookingId: 'retry-booking' });
      expect(result.paymentIntentId).toBe('pi_retry');
    });

    it('does not leave a stale in-flight entry when validation fails', async () => {
      await expect(
        paymentService.createPaymentIntent({ amount: 0.1, bookingId: 'invalid-booking' }),
      ).rejects.toThrow('Payment amount must be at least 0.50');

      mockRequestEdge.mockResolvedValueOnce({ clientSecret: 's', paymentIntentId: 'pi_ok' });
      const result = await paymentService.createPaymentIntent({ amount: 5, bookingId: 'invalid-booking' });
      expect(result.paymentIntentId).toBe('pi_ok');
    });

    it('includes idempotency key in request body', async () => {
      mockRequestEdge.mockResolvedValueOnce({
        clientSecret: 'pi_secret_1',
        paymentIntentId: 'pi_1',
      });

      await paymentService.createPaymentIntent({ amount: 10, bookingId: 'booking-1' });

      expect(mockRequestEdge).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            idempotency_key: expect.stringContaining('booking:booking-1'),
          }),
        })
      );
    });

    it('includes metadata with booking_id and user_id', async () => {
      mockRequestEdge.mockResolvedValueOnce({
        clientSecret: 'pi_secret_1',
        paymentIntentId: 'pi_1',
      });

      await paymentService.createPaymentIntent({
        amount: 10,
        bookingId: 'booking-1',
        metadata: { note: 'test' },
      });

      expect(mockRequestEdge).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            metadata: expect.objectContaining({
              booking_id: 'booking-1',
              user_id: 'user-1',
              note: 'test',
            }),
          }),
        })
      );
    });
  });

  // ── confirmPayment ────────────────────────────────────────────────────────

  describe('confirmPayment', () => {
    it('returns succeeded when payment completes', async () => {
      mockRequestEdge
        .mockResolvedValueOnce('pending')
        .mockResolvedValueOnce('succeeded');

      const status = await paymentService.confirmPayment('booking-1');
      expect(status).toBe('succeeded');
    });

    it('returns failed when payment fails', async () => {
      mockRequestEdge
        .mockResolvedValueOnce('pending')
        .mockResolvedValueOnce('failed');

      const status = await paymentService.confirmPayment('booking-1');
      expect(status).toBe('failed');
    });

    // Regression: the edge handler (payments.ts -> handleGetPaymentStatus) answers
    // { paymentStatus }, not a bare string. The client used to compare the whole
    // object to 'succeeded', so it always polled the full 30s and reported pending.
    it('reads the { paymentStatus } object the edge function actually returns', async () => {
      mockRequestEdge.mockResolvedValueOnce({ paymentStatus: 'succeeded' });

      const status = await paymentService.confirmPayment('booking-1');
      expect(status).toBe('succeeded');
      expect(mockRequestEdge).toHaveBeenCalledTimes(1);
    });

    it('maps paid and completed to succeeded, and canceled to failed', async () => {
      mockRequestEdge.mockResolvedValueOnce({ paymentStatus: 'paid' });
      expect(await paymentService.confirmPayment('b-paid')).toBe('succeeded');

      mockRequestEdge.mockResolvedValueOnce({ paymentStatus: 'completed' });
      expect(await paymentService.confirmPayment('b-completed')).toBe('succeeded');

      mockRequestEdge.mockResolvedValueOnce({ paymentStatus: 'canceled' });
      expect(await paymentService.confirmPayment('b-canceled')).toBe('failed');
    });

    it('keeps polling on { paymentStatus: "pending" } until it succeeds', async () => {
      vi.useFakeTimers();
      mockRequestEdge
        .mockResolvedValueOnce({ paymentStatus: 'pending' })
        .mockResolvedValueOnce({ paymentStatus: 'succeeded' });

      const promise = paymentService.confirmPayment('booking-1');
      await vi.advanceTimersByTimeAsync(2_000);
      const status = await promise;

      expect(status).toBe('succeeded');
      expect(mockRequestEdge).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('returns pending after max poll duration', async () => {
      vi.useFakeTimers();
      mockRequestEdge.mockResolvedValue('pending');

      const promise = paymentService.confirmPayment('booking-1');
      await vi.advanceTimersByTimeAsync(35_000); // exceed PAYMENT_POLL_MAX_DURATION (30s)
      const status = await promise;

      expect(status).toBe('pending');
      vi.useRealTimers();
    });

    it('polls at PAYMENT_POLL_INTERVAL (2s)', async () => {
      vi.useFakeTimers();
      mockRequestEdge
        .mockResolvedValueOnce('pending')
        .mockResolvedValueOnce('pending')
        .mockResolvedValueOnce('succeeded');

      const promise = paymentService.confirmPayment('booking-1');
      await vi.advanceTimersByTimeAsync(2_000);
      await vi.advanceTimersByTimeAsync(2_000);
      const status = await promise;

      expect(status).toBe('succeeded');
      expect(mockRequestEdge).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });

    it('URL-encodes bookingId in path', async () => {
      mockRequestEdge.mockResolvedValue('succeeded');
      await paymentService.confirmPayment('booking/with/slashes');
      expect(mockRequestEdge).toHaveBeenCalledWith(
        expect.objectContaining({ path: expect.stringContaining('booking%2Fwith%2Fslashes') }),
      );
    });
  });

  // ── processRefund ────────────────────────────────────────────────────────

  describe('processRefund', () => {
    it('returns refund details on success', async () => {
      mockRequestEdge.mockResolvedValueOnce({ refundId: 'ref_1', amount: 1000, status: 'succeeded' });

      const result = await paymentService.processRefund({ bookingId: 'b-1', amount: 10, reason: 'cancelled' });

      expect(result.success).toBe(true);
      expect(result.refundId).toBe('ref_1');
      expect(result.status).toBe('succeeded');
    });

    it('uses amountMinor directly when provided', async () => {
      mockRequestEdge.mockResolvedValueOnce({ refundId: 'ref_2', amount: 500 });

      const result = await paymentService.processRefund({ bookingId: 'b-2', amountMinor: 500, reason: 'driver_no_show' });
      expect(result.amountMinor).toBe(500);
    });

    it('converts amount to minor units when amountMinor not provided', async () => {
      mockRequestEdge.mockResolvedValueOnce({ refundId: 'ref_3', amount: 750 });
      const { toMinorUnits } = await import('../../shared/currency/currency');

      await paymentService.processRefund({ bookingId: 'b-3', amount: 7.5, reason: 'test' });
      expect(toMinorUnits).toHaveBeenCalledWith(7.5, 'jod');
    });

    it('throws BackendRequestError when refundId is missing', async () => {
      mockRequestEdge.mockResolvedValueOnce({ status: 'failed' });

      await expect(
        paymentService.processRefund({ bookingId: 'b-3', reason: 'test' }),
      ).rejects.toMatchObject({ name: 'BackendRequestError', status: 502 });
    });

    it('includes reason in request body', async () => {
      mockRequestEdge.mockResolvedValueOnce({ refundId: 'ref_1', amount: 1000 });
      await paymentService.processRefund({ bookingId: 'b-1', reason: 'duplicate' });
      expect(mockRequestEdge).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ reason: 'duplicate' }),
        })
      );
    });
  });

  // ── getPaymentStatus ─────────────────────────────────────────────────────

  describe('getPaymentStatus', () => {
    it('returns status string from edge', async () => {
      mockRequestEdge.mockResolvedValueOnce('succeeded');
      const status = await paymentService.getPaymentStatus('booking-1');
      expect(status).toBe('succeeded');
    });

    it('unwraps the { paymentStatus } object returned by the edge function', async () => {
      mockRequestEdge.mockResolvedValueOnce({ paymentStatus: 'succeeded' });
      const status = await paymentService.getPaymentStatus('booking-1');
      expect(status).toBe('succeeded');
    });

    it('URL-encodes the bookingId in the path', async () => {
      mockRequestEdge.mockResolvedValueOnce('pending');
      await paymentService.getPaymentStatus('booking/with/slashes');
      expect(mockRequestEdge).toHaveBeenCalledWith(
        expect.objectContaining({ path: expect.stringContaining('booking%2Fwith%2Fslashes') }),
      );
    });
  });

  // ── extractPaymentStatus ─────────────────────────────────────────────────

  describe('extractPaymentStatus', () => {
    it('reads paymentStatus, payment_status and status keys', () => {
      expect(extractPaymentStatus({ paymentStatus: 'succeeded' })).toBe('succeeded');
      expect(extractPaymentStatus({ payment_status: 'failed' })).toBe('failed');
      expect(extractPaymentStatus({ status: 'pending' })).toBe('pending');
    });

    it('accepts a bare string and normalises case and whitespace', () => {
      expect(extractPaymentStatus('  Succeeded ')).toBe('succeeded');
    });

    it('falls back to unknown for anything unusable', () => {
      expect(extractPaymentStatus(undefined)).toBe('unknown');
      expect(extractPaymentStatus(null)).toBe('unknown');
      expect(extractPaymentStatus({})).toBe('unknown');
      expect(extractPaymentStatus({ paymentStatus: 42 })).toBe('unknown');
      expect(extractPaymentStatus('')).toBe('unknown');
    });
  });

  // ── generateCliqPaymentDetails ───────────────────────────────────────────

  describe('generateCliqPaymentDetails', () => {
    it('returns deeplink and qrPayload', () => {
      const result = paymentService.generateCliqPaymentDetails('booking-1', 15.5);
      expect(result.deeplink).toBe('cliq://deeplink');
      expect(result.qrPayload).toBe('QR_PAYLOAD');
    });

    it('uses default alias WASELSMART when none provided', async () => {
      const { generateJordanCliqDeeplink } = await import('../../domain/payments/cliq');
      paymentService.generateCliqPaymentDetails('b-1', 10);
      expect(vi.mocked(generateJordanCliqDeeplink)).toHaveBeenCalledWith(
        expect.objectContaining({ identifierValue: 'WASELSMART' }),
      );
    });

    it('uses custom alias when provided', async () => {
      const { generateJordanCliqDeeplink } = await import('../../domain/payments/cliq');
      paymentService.generateCliqPaymentDetails('b-1', 10, 'CUSTOM_ALIAS');
      expect(vi.mocked(generateJordanCliqDeeplink)).toHaveBeenCalledWith(
        expect.objectContaining({ identifierValue: 'CUSTOM_ALIAS' }),
      );
    });

    it('passes correct amount and bookingId to generator', async () => {
      const { generateJordanCliqDeeplink } = await import('../../domain/payments/cliq');
      paymentService.generateCliqPaymentDetails('booking-xyz', 25.75);
      expect(vi.mocked(generateJordanCliqDeeplink)).toHaveBeenCalledWith(
        expect.objectContaining({
          amountJod: 25.75,
          orderOrBookingId: 'booking-xyz',
        }),
      );
    });
  });

  // ── security ─────────────────────────────────────────────────────────────

  it('does not expose verifyWebhookSignature in the browser', () => {
    expect('verifyWebhookSignature' in paymentService).toBe(false);
  });

  // ── error handling ────────────────────────────────────────────────────────

  it('propagates network errors from requestEdgeJson', async () => {
    mockRequestEdge.mockRejectedValueOnce(new Error('Network error'));
    await expect(paymentService.createPaymentIntent({ amount: 10, bookingId: 'b-1' })).rejects.toThrow('Network error');
  });

  it('handles rate limit errors from backend', async () => {
    mockRequestEdge.mockRejectedValueOnce({ status: 429, recoverable: true, name: 'BackendRequestError' });
    await expect(paymentService.createPaymentIntent({ amount: 10, bookingId: 'b-1' })).rejects.toMatchObject({ status: 429 });
  });
});
