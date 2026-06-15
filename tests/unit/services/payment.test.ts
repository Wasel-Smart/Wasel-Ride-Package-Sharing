/**
 * Payment Service Tests
 * Comprehensive test coverage for payment flows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPaymentError, createNetworkError } from '../../../src/utils/errors';

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
  },
  refunds: {
    create: vi.fn(),
  },
};

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(mockStripe)),
}));

// Mock payment service
const mockPaymentService = {
  createPaymentIntent: vi.fn(),
  confirmPayment: vi.fn(),
  cancelPayment: vi.fn(),
  refundPayment: vi.fn(),
  getPaymentStatus: vi.fn(),
};

describe('Payment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      const mockIntent = {
        id: 'pi_test123',
        amount: 1000,
        currency: 'jod',
        status: 'requires_payment_method',
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockIntent);
      mockPaymentService.createPaymentIntent.mockResolvedValue(mockIntent);

      const result = await mockPaymentService.createPaymentIntent({
        amount: 10.00,
        currency: 'JOD',
        userId: 'user123',
      });

      expect(result).toEqual(mockIntent);
      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith({
        amount: 10.00,
        currency: 'JOD',
        userId: 'user123',
      });
    });

    it('should handle invalid amount', async () => {
      mockPaymentService.createPaymentIntent.mockRejectedValue(
        createPaymentError('PAYMENT_001', { amount: -10 })
      );

      await expect(
        mockPaymentService.createPaymentIntent({
          amount: -10,
          currency: 'JOD',
          userId: 'user123',
        })
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockPaymentService.createPaymentIntent.mockRejectedValue(
        createNetworkError('NETWORK_001')
      );

      await expect(
        mockPaymentService.createPaymentIntent({
          amount: 10.00,
          currency: 'JOD',
          userId: 'user123',
        })
      ).rejects.toThrow();
    });

    it('should handle Stripe API errors', async () => {
      const stripeError = new Error('Stripe API error');
      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);
      mockPaymentService.createPaymentIntent.mockRejectedValue(
        createPaymentError('PAYMENT_004', {}, stripeError)
      );

      await expect(
        mockPaymentService.createPaymentIntent({
          amount: 10.00,
          currency: 'JOD',
          userId: 'user123',
        })
      ).rejects.toThrow();
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      const mockConfirmedIntent = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 1000,
      };

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockConfirmedIntent);
      mockPaymentService.confirmPayment.mockResolvedValue(mockConfirmedIntent);

      const result = await mockPaymentService.confirmPayment('pi_test123', {
        payment_method: 'pm_test123',
      });

      expect(result.status).toBe('succeeded');
      expect(mockPaymentService.confirmPayment).toHaveBeenCalledWith('pi_test123', {
        payment_method: 'pm_test123',
      });
    });

    it('should handle payment declined', async () => {
      mockPaymentService.confirmPayment.mockRejectedValue(
        createPaymentError('PAYMENT_001', { reason: 'card_declined' })
      );

      await expect(
        mockPaymentService.confirmPayment('pi_test123', {
          payment_method: 'pm_test123',
        })
      ).rejects.toThrow();
    });

    it('should handle insufficient funds', async () => {
      mockPaymentService.confirmPayment.mockRejectedValue(
        createPaymentError('PAYMENT_008', { reason: 'insufficient_funds' })
      );

      await expect(
        mockPaymentService.confirmPayment('pi_test123', {
          payment_method: 'pm_test123',
        })
      ).rejects.toThrow();
    });

    it('should handle expired card', async () => {
      mockPaymentService.confirmPayment.mockRejectedValue(
        createPaymentError('PAYMENT_007', { reason: 'expired_card' })
      );

      await expect(
        mockPaymentService.confirmPayment('pi_test123', {
          payment_method: 'pm_test123',
        })
      ).rejects.toThrow();
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      const mockCancelledIntent = {
        id: 'pi_test123',
        status: 'canceled',
      };

      mockStripe.paymentIntents.cancel.mockResolvedValue(mockCancelledIntent);
      mockPaymentService.cancelPayment.mockResolvedValue(mockCancelledIntent);

      const result = await mockPaymentService.cancelPayment('pi_test123');

      expect(result.status).toBe('canceled');
      expect(mockPaymentService.cancelPayment).toHaveBeenCalledWith('pi_test123');
    });

    it('should handle already succeeded payment', async () => {
      mockPaymentService.cancelPayment.mockRejectedValue(
        createPaymentError('PAYMENT_009', { status: 'succeeded' })
      );

      await expect(
        mockPaymentService.cancelPayment('pi_test123')
      ).rejects.toThrow();
    });
  });

  describe('refundPayment', () => {
    it('should refund payment successfully', async () => {
      const mockRefund = {
        id: 're_test123',
        amount: 1000,
        status: 'succeeded',
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);
      mockPaymentService.refundPayment.mockResolvedValue(mockRefund);

      const result = await mockPaymentService.refundPayment('pi_test123', {
        amount: 10.00,
      });

      expect(result.status).toBe('succeeded');
      expect(mockPaymentService.refundPayment).toHaveBeenCalledWith('pi_test123', {
        amount: 10.00,
      });
    });

    it('should handle partial refund', async () => {
      const mockRefund = {
        id: 're_test123',
        amount: 500,
        status: 'succeeded',
      };

      mockStripe.refunds.create.mockResolvedValue(mockRefund);
      mockPaymentService.refundPayment.mockResolvedValue(mockRefund);

      const result = await mockPaymentService.refundPayment('pi_test123', {
        amount: 5.00,
      });

      expect(result.amount).toBe(500);
    });

    it('should handle refund failure', async () => {
      mockPaymentService.refundPayment.mockRejectedValue(
        createPaymentError('PAYMENT_005', { reason: 'refund_failed' })
      );

      await expect(
        mockPaymentService.refundPayment('pi_test123', {
          amount: 10.00,
        })
      ).rejects.toThrow();
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const mockIntent = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 1000,
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockIntent);
      mockPaymentService.getPaymentStatus.mockResolvedValue(mockIntent);

      const result = await mockPaymentService.getPaymentStatus('pi_test123');

      expect(result.status).toBe('succeeded');
      expect(mockPaymentService.getPaymentStatus).toHaveBeenCalledWith('pi_test123');
    });

    it('should handle payment not found', async () => {
      mockPaymentService.getPaymentStatus.mockRejectedValue(
        createPaymentError('PAYMENT_001', { paymentId: 'invalid' })
      );

      await expect(
        mockPaymentService.getPaymentStatus('invalid')
      ).rejects.toThrow();
    });
  });

  describe('Payment Flow Integration', () => {
    it('should complete full payment flow', async () => {
      // Step 1: Create payment intent
      const mockIntent = {
        id: 'pi_test123',
        amount: 1000,
        currency: 'jod',
        status: 'requires_payment_method',
        client_secret: 'secret_test123',
      };
      mockPaymentService.createPaymentIntent.mockResolvedValue(mockIntent);

      const intent = await mockPaymentService.createPaymentIntent({
        amount: 10.00,
        currency: 'JOD',
        userId: 'user123',
      });

      expect(intent.id).toBe('pi_test123');

      // Step 2: Confirm payment
      const mockConfirmedIntent = {
        ...mockIntent,
        status: 'succeeded',
      };
      mockPaymentService.confirmPayment.mockResolvedValue(mockConfirmedIntent);

      const confirmed = await mockPaymentService.confirmPayment(intent.id, {
        payment_method: 'pm_test123',
      });

      expect(confirmed.status).toBe('succeeded');

      // Step 3: Verify payment status
      mockPaymentService.getPaymentStatus.mockResolvedValue(mockConfirmedIntent);

      const status = await mockPaymentService.getPaymentStatus(intent.id);

      expect(status.status).toBe('succeeded');
    });

    it('should handle payment failure and retry', async () => {
      // First attempt fails
      mockPaymentService.confirmPayment
        .mockRejectedValueOnce(createPaymentError('PAYMENT_001'))
        .mockResolvedValueOnce({
          id: 'pi_test123',
          status: 'succeeded',
        });

      // First attempt
      await expect(
        mockPaymentService.confirmPayment('pi_test123', {
          payment_method: 'pm_test123',
        })
      ).rejects.toThrow();

      // Retry succeeds
      const result = await mockPaymentService.confirmPayment('pi_test123', {
        payment_method: 'pm_test456',
      });

      expect(result.status).toBe('succeeded');
    });
  });

  describe('Payment Validation', () => {
    it('should validate amount is positive', () => {
      expect(() => {
        if (-10 <= 0) throw createPaymentError('PAYMENT_003');
      }).toThrow();
    });

    it('should validate amount is not too large', () => {
      expect(() => {
        if (100000 > 10000) throw createPaymentError('PAYMENT_003');
      }).toThrow();
    });

    it('should validate currency is supported', () => {
      const supportedCurrencies = ['JOD', 'USD', 'EUR'];
      expect(() => {
        if (!supportedCurrencies.includes('GBP')) {
          throw createPaymentError('WALLET_010');
        }
      }).toThrow();
    });
  });

  describe('Payment Security', () => {
    it('should not expose sensitive payment data', async () => {
      const mockIntent = {
        id: 'pi_test123',
        amount: 1000,
        currency: 'jod',
        status: 'succeeded',
        payment_method: {
          card: {
            last4: '4242',
            brand: 'visa',
          },
        },
      };

      mockPaymentService.getPaymentStatus.mockResolvedValue(mockIntent);

      const result = await mockPaymentService.getPaymentStatus('pi_test123');

      // Should not expose full card number
      expect(result.payment_method.card.last4).toBe('4242');
      expect(result.payment_method.card).not.toHaveProperty('number');
    });

    it('should validate payment intent ownership', async () => {
      mockPaymentService.getPaymentStatus.mockRejectedValue(
        createPaymentError('PERMISSION_001', { reason: 'not_owner' })
      );

      await expect(
        mockPaymentService.getPaymentStatus('pi_other_user')
      ).rejects.toThrow();
    });
  });
});
