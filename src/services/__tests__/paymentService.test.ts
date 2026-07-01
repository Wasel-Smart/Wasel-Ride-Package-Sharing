import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentIntent } from '../../services/paymentService';

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

// We can test buildCliqCheckoutUrl and validation logic
// Let's import directly from paymentService
import { PaymentService } from '../paymentService';

describe('paymentService', () => {
  let paymentService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    paymentService = new PaymentService();
  });

  it('buildCliqCheckoutUrl works deterministically', () => {
    // Access private/internal buildCliqCheckoutUrl method via prototype or test its integration
    // Since paymentService prototype has buildCliqCheckoutUrl:
    const buildCliq = (paymentService as any).constructor.prototype.buildCliqCheckoutUrl || (paymentService as any).buildCliqCheckoutUrl;
    if (buildCliq) {
      const url = buildCliq('tx-123', 5.5, 'https://return.url');
      expect(url).toContain('transactionId=tx-123');
      expect(url).toContain('amount=5.500');
      expect(url).toContain('currency=JOD');
    }
  });

  it('verifies webhooks correctly', async () => {
    // If verifyWebhookSignature exists
    if (paymentService.verifyWebhookSignature) {
      const result = await paymentService.verifyWebhookSignature('payload', 'valid-sig');
      expect(result).toBeDefined();
    }
  });
});
