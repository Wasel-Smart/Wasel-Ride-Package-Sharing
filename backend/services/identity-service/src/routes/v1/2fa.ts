import { Router } from 'express';
import Redis from 'ioredis';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { z } from 'zod';
import { ValidationError, UnauthorizedError, ForbiddenError } from '@wasel/backend-shared/errors/app-errors';

const SetupSchema = z.object({
  userId: z.string().uuid(),
  deviceName: z.string().optional(),
});

const VerifySchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6),
  backupCode: z.string().optional(),
});

const DisableSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6),
});

const RecoverySchema = z.object({
  userId: z.string().uuid(),
  backupCode: z.string(),
});

export class TwoFactorService {
  private redis: Redis;
  private issuer = 'Wasel';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async setup2FA(userId: string, deviceName?: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const secret = authenticator.generateSecret();
    const backupCodes = this.generateBackupCodes();

    await this.redis.setex(
      `2fa:secret:${userId}`,
      60 * 60 * 24 * 30,
      secret,
    );

    await this.redis.sadd(`2fa:backup:${userId}`, ...backupCodes);
    await this.redis.sadd(`2fa:devices:${userId}`, deviceName ?? 'default');

    const otpAuthUrl = authenticator.keyuri(userId, this.issuer, secret);
    const qrCode = await qrcode.toDataURL(otpAuthUrl);

    return { secret, qrCode, backupCodes };
  }

  async verify2FA(userId: string, code: string): Promise<boolean> {
    const secret = await this.redis.get(`2fa:secret:${userId}`);
    if (!secret) {
      throw new ForbiddenError('2FA not set up');
    }

    const isValid = authenticator.check(code, secret);
    if (!isValid) {
      return false;
    }

    await this.redis.setex(`2fa:trust:${userId}`, 60 * 60 * 24 * 30, 'trusted');
    return true;
  }

  async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    const valid = await this.redis.sismember(`2fa:backup:${userId}`, code);
    if (valid) {
      await this.redis.srem(`2fa:backup:${userId}`, code);
      await this.redis.setex(`2fa:used_backup:${userId}`, 60 * 60, code);
    }
    return valid === 1;
  }

  async disable2FA(userId: string, code: string): Promise<boolean> {
    const verified = await this.verify2FA(userId, code);
    if (!verified) {
      return false;
    }

    await this.redis.del(`2fa:secret:${userId}`);
    await this.redis.del(`2fa:backup:${userId}`);
    await this.redis.del(`2fa:trust:${userId}`);
    await this.redis.del(`2fa:devices:${userId}`);

    return true;
  }

  isDeviceTrusted(userId: string): Promise<boolean> {
    return this.redis.exists(`2fa:trust:${userId}`).then(exists => exists === 1);
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).slice(2, 10).toUpperCase());
    }
    return codes;
  }
}

export function create2FARouter(redis: Redis): Router {
  const router = Router();
  const twoFactor = new TwoFactorService(redis);

  router.post('/setup', async (req, res) => {
    const parsed = SetupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid setup request', { issues: parsed.error.issues });
    }

    const { userId, deviceName } = parsed.data;
    const result = await twoFactor.setup2FA(userId, deviceName);

    res.json({
      secret: result.secret,
      qrCode: result.qrCode,
      backupCodes: result.backupCodes,
    });
  });

  router.post('/verify', async (req, res) => {
    const parsed = VerifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid verify request', { issues: parsed.error.issues });
    }

    const { userId, code, backupCode } = parsed.data;

    if (backupCode) {
      const valid = await twoFactor.verifyRecoveryCode(userId, backupCode);
      res.json({ valid });
      return;
    }

    const valid = await twoFactor.verify2FA(userId, code);
    res.json({ valid });
  });

  router.post('/disable', async (req, res) => {
    const parsed = DisableSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid disable request', { issues: parsed.error.issues });
    }

    const { userId, code } = parsed.data;
    const disabled = await twoFactor.disable2FA(userId, code);

    res.json({ disabled });
  });

  router.post('/recovery', async (req, res) => {
    const parsed = RecoverySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid recovery request', { issues: parsed.error.issues });
    }

    const { userId, backupCode } = parsed.data;
    const valid = await twoFactor.verifyRecoveryCode(userId, backupCode);

    res.json({ valid });
  });

  return router;
}