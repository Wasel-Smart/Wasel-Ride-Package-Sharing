import { createHmac } from 'node:crypto';

interface SignedRequest {
  payload: unknown;
  signature: string;
  timestamp: number;
}

export class SecurityMiddleware {
  private readonly SIGNING_SECRET = process.env.REQUEST_SIGNING_SECRET || '';
  private readonly TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

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
}