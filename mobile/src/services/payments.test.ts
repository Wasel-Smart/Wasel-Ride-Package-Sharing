jest.mock('../lib/config', () => ({
  waselMobileConfig: {
    hasSupabase: true,
    apiUrl: 'https://api.test.wasel',
    authRedirectUrl: 'wasel://auth/callback',
  },
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('../services/auth', () => ({
  mobileAuth: {
    getUser: jest.fn().mockReturnValue({ id: 'user-1' }),
  },
}));

import { supabase } from '../lib/config';
import { paymentService, type PaymentResult } from '../services/payments';

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWalletBalance', () => {
    it('returns balance data on success', async () => {
      const mockData = { available_balance: 50, pending_balance: 10, currency: 'JOD' };
      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      (supabase as any).from.mockReturnValue(fromMock);

      const result = await paymentService.getWalletBalance('user-1');
      expect(result.available).toBe(50);
      expect(result.pending).toBe(10);
      expect(result.total).toBe(60);
      expect(result.currency).toBe('JOD');
    });

    it('returns zero balance on error', async () => {
      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };
      (supabase as any).from.mockReturnValue(fromMock);

      const result = await paymentService.getWalletBalance('user-1');
      expect(result.available).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.total).toBe(0);
      expect(result.currency).toBe('JOD');
    });
  });

  describe('getPaymentMethods', () => {
    it('maps database rows to PaymentMethod objects', async () => {
      const mockData = [
        {
          id: 'pm-1',
          user_id: 'user-1',
          card_brand: 'Visa',
          last_four: '1234',
          expiry_month: 12,
          expiry_year: 2028,
          is_default: true,
          created_at: '2026-01-01T00:00:00Z',
        },
      ];
      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      (supabase as any).from.mockReturnValue(fromMock);

      const result = await paymentService.getPaymentMethods('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pm-1');
      expect(result[0].brand).toBe('Visa');
      expect(result[0].last4).toBe('1234');
      expect(result[0].isDefault).toBe(true);
    });

    it('returns empty array on error', async () => {
      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };
      (supabase as any).from.mockReturnValue(fromMock);

      const result = await paymentService.getPaymentMethods('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('addFunds', () => {
    it('returns error for invalid amount', async () => {
      const result = await paymentService.addFunds('user-1', 5, 'JOD');
      expect(result.success).toBe(false);
      expect(result.error).toContain('between 10 and 500');
    });

    it('returns error when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValueOnce({ data: { session: null } });

      const result = await paymentService.addFunds('user-1', 100, 'JOD');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('creates payment intent on success', async () => {
      const mockSession = { session: { access_token: process.env.TEST_ACCESS_TOKEN ?? 'test-token', refresh_token: process.env.TEST_REFRESH_TOKEN ?? 'test-refresh' } };
      (supabase.auth.getSession as any).mockResolvedValueOnce({ data: mockSession });
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: { clientSecret: 'secret', paymentIntentId: 'pi-123' },
        error: null,
      });

      const result = await paymentService.addFunds('user-1', 50, 'JOD');
      expect(result.success).toBe(true);
      expect(result.clientSecret).toBe('secret');
      expect(result.paymentId).toBe('pi-123');
    });
  });

  describe('removePaymentMethod', () => {
    it('returns true on successful removal', async () => {
      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase as any).from.mockReturnValue(fromMock);

      const result = await paymentService.removePaymentMethod('pm-1');
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: new Error('DB error') }),
      };
      (supabase as any).from.mockReturnValue(fromMock);

      const result = await paymentService.removePaymentMethod('pm-1');
      expect(result).toBe(false);
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('sets default and returns true on success', async () => {
      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase as any).from.mockReturnValue(fromMock);

      const result = await paymentService.setDefaultPaymentMethod('user-1', 'pm-1');
      expect(result).toBe(true);
    });
  });
});
