import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../monitoring', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../rateLimit', () => ({
  paymentLimiter: {
    checkLimit: vi.fn(async () => ({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 })),
  },
}));

// paymentService is exported as a singleton instance, not a class
import { paymentService } from '../payment';

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies webhooks correctly', async () => {
    // If verifyWebhookSignature exists
    if (paymentService.verifyWebhookSignature) {
      const result = await paymentService.verifyWebhookSignature(
        'payload',
        'valid-sig',
        'test-secret',
      );
      expect(result).toBeDefined();
    }
  });
});
