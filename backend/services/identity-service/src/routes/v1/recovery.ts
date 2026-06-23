import { Router } from 'express';
import Redis from 'ioredis';
import { z } from 'zod';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import { ValidationError, NotFoundError } from '@wasel/backend-shared/errors/app-errors';
import crypto from 'crypto';

const RequestResetSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(32),
  newPassword: z.string().min(8),
});

export class PasswordRecoveryService {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async requestReset(email: string): Promise<{ token: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const key = `pwd:reset:${token}`;

    await this.redis.setex(key, 60 * 60, email);

    return { token };
  }

  async verifyResetToken(token: string): Promise<string | null> {
    const email = await this.redis.get(`pwd:reset:${token}`);
    return email ?? null;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const email = await this.verifyResetToken(token);
    if (!email) {
      return { success: false };
    }

    await this.redis.del(`pwd:reset:${token}`);
    await this.redis.sadd(`pwd:invalid:${email}`, ...this.extractRecentPasswords(email));

    return { success: true };
  }

  private async extractRecentPasswords(email: string): Promise<string[]> {
    const profile = await this.redis.hgetall(`profile:${email}`);
    return Object.keys(profile).filter(k => k.startsWith('pw_'));
  }
}

export function createRecoveryRouter(redis: Redis): Router {
  const router = Router();
  const recovery = new PasswordRecoveryService(redis);

  router.post(
    '/request',
    createRateLimitMiddleware(redis, {
      windowMs: 60_000,
      maxRequests: 5,
      keyPrefix: 'recovery:req',
    }),
    async (req, res) => {
      const parsed = RequestResetSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request', { issues: parsed.error.issues });
      }

      const { email } = parsed.data;
      const { token } = await recovery.requestReset(email);

      res.json({
        success: true,
        resetToken: token,
      });
    },
  );

  router.post('/verify', async (req, res) => {
    const { token } = req.body;
    const email = await recovery.verifyResetToken(token);

    res.json({ valid: !!email });
  });

  router.post('/reset', async (req, res) => {
    const parsed = ResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid reset request', { issues: parsed.error.issues });
    }

    const { token, newPassword } = parsed.data;
    const result = await recovery.resetPassword(token, newPassword);

    res.json(result);
  });

  return router;
}