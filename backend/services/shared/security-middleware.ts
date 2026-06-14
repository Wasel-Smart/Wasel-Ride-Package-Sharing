import { createHmac } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { 
  RateLimiter,
  createApiRateLimiter,
  createAuthRateLimiter,
  createPaymentRateLimiter,
  createBookingRateLimiter
} from './rate-limiter.js';

interface SignedRequest {
  payload: unknown;
  signature: string;
  timestamp: number;
}

export class SecurityMiddleware {
  private readonly SIGNING_SECRET = process.env.REQUEST_SIGNING_SECRET || '';
  private readonly TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
  
  // Rate limiters
  private readonly apiLimiter = createApiRateLimiter();
  private readonly authLimiter = createAuthRateLimiter();
  private readonly paymentLimiter = createPaymentRateLimiter();
  private readonly bookingLimiter = createBookingRateLimiter();

  signRequest(payload: object): SignedRequest {
    const timestamp = Date.now();
    const data = JSON.stringify({ payload, timestamp });
    const signature = createHmac('sha256', this.SIGNING_SECRET)
      .update(data)
      .digest('hex');

    return { payload, signature, timestamp };
  }

  verifyRequest(signed: SignedRequest): boolean {
    const now = Date.now();
    if (Math.abs(now - signed.timestamp) > this.TIMESTAMP_TOLERANCE_MS) {
      return false;
    }

    const data = JSON.stringify({ 
      payload: signed.payload, 
      timestamp: signed.timestamp 
    });
    const expectedSignature = createHmac('sha256', this.SIGNING_SECRET)
      .update(data)
      .digest('hex');

    return signed.signature === expectedSignature;
  }

  generateNonce(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  validateNonce(nonce: string, usedNonces: Set<string>): boolean {
    if (usedNonces.has(nonce)) {
      return false;
    }
    usedNonces.add(nonce);
    return true;
  }
  
  // Rate limiting middleware methods
  getApiRateLimit() {
    return this.apiLimiter.middleware();
  }
  
  getAuthRateLimit() {
    return this.authLimiter.middleware();
  }
  
  getPaymentRateLimit() {
    return this.paymentLimiter.middleware();
  }
  
  getBookingRateLimit() {
    return this.bookingLimiter.middleware();
  }
  
  // Security headers middleware
  securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(self)',
      });
      next();
    };
  }
}