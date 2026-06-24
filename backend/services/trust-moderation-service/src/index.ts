import postgres from 'postgres';
import Redis from 'ioredis';
import express from 'express';
import { loadConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import {
  AppError,
  ValidationError,
  NotFoundError,
} from '@wasel/backend-shared/errors/app-errors';
import { startRuntimeHealthServer } from '../../../runtime/http-health';
import { logger } from '@wasel/backend-shared/logging/logger';
import { z } from 'zod';

const config = loadConfig();

class PostgresPool {
  private static instance: ReturnType<typeof postgres> | null = null;
  static get connection() {
    if (!PostgresPool.instance) {
      PostgresPool.instance = postgres(config.database.url, {
        max: config.database.maxConnections,
        idle_timeout: config.database.idleTimeoutSeconds * 1000,
        connect_timeout: config.database.connectionTimeoutSeconds * 1000,
      });
    }
    return PostgresPool.instance;
  }
  static async disconnect() {
    if (PostgresPool.instance) {
      await PostgresPool.instance.end();
      PostgresPool.instance = null;
    }
  }
}

class RedisPool {
  private static instance: Redis | null = null;
  static get connection() {
    if (!RedisPool.instance) {
      RedisPool.instance = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        tls: config.redis.tls ? {} : undefined,
        maxRetries: config.redis.maxRetries,
        retryStrategy: times => Math.min(times * config.redis.retryDelayMs, 5000),
      });
    }
    return RedisPool.instance;
  }
  static async disconnect() {
    if (RedisPool.instance) {
      await RedisPool.instance.quit();
      RedisPool.instance = null;
    }
  }
}

function moderateText(text: string): { cleaned: string; flags: string[] } {
  const flags: string[] = [];
  let cleaned = text;

  cleaned = cleaned.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/(?i)(javascript:|data:|vbscript:)/g, '');
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ');

  const inappropriatePatterns = [
    /(?i)\b(damn|shit|fuck|bitch|asshole|bastard)\b/g,
  ];
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(text)) flags.push('inappropriate_language');
    cleaned = cleaned.replace(pattern, '[redacted]');
  }

  return { cleaned: cleaned.trim(), flags };
}

function createApp(): express.Application {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.use(
    createRateLimitMiddleware(RedisPool.connection, {
      windowMs: 60_000,
      maxRequests: 100,
    }),
  );

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/ready', async () => ({ status: 'ready' }));

  app.get('/metrics', async () => ({
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  app.get('/v1/trust/status/:userId', async (req, res) => {
    const { userId } = req.params;
    const sql = PostgresPool.connection;

    const [{ data: user }, { data: wallet }, { data: verifications }] = await Promise.all([
      sql`SELECT id, email, phone_number, phone_verified_at, verification_level, sanad_verified_status FROM users WHERE id = ${userId}`,
      sql`SELECT wallet_id, wallet_status FROM wallets WHERE user_id = ${userId}`,
      sql`SELECT id, verification_level, document_status, sanad_status, created_at FROM verification_records WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 5`,
    ]);

    const steps = {
      identity: {
        id: 'identity',
        state: verifications?.[0]?.document_status === 'pending' ? 'in_progress' :
          (verifications?.[0]?.document_status === 'verified' ? 'completed' :
            user?.sanad_verified_status === 'verified' ? 'completed' : 'not_started'),
        detail: verifications?.[0]?.document_status === 'verified' ? 'Identity verified' :
          user?.sanad_verified_status ? `Sanad status: ${user.sanad_verified_status}` : 'Submit ID verification',
      },
      email: {
        id: 'email',
        state: user?.email ? 'completed' : 'not_started',
        detail: user?.email ? 'Email verified' : 'Add email',
      },
      phone: {
        id: 'phone',
        state: user?.phone_verified_at ? 'completed' : 'not_started',
        detail: user?.phone_verified_at ? `Phone verified: ${user.phone_number}` : 'Add and verify phone',
      },
      driverDocuments: {
        id: 'driver_documents',
        state: 'not_started',
        detail: 'Submit driver documents',
      },
      walletStanding: {
        id: 'wallet_standing',
        state: wallet?.wallet_status === 'active' ? 'completed' : 'failed',
        detail: wallet?.wallet_status ? `Wallet status: ${wallet.wallet_status}` : 'No wallet',
      },
    };

    res.json({ steps, fetchedAt: new Date().toISOString() });
  });

  const PhoneVerificationSchema = z.object({
    phoneNumber: z.string().regex(/^\+962\d{9}$/, 'Invalid Jordanian phone number'),
    userId: z.string().uuid(),
  });

  const IdentityVerificationSchema = z.object({
    userId: z.string().uuid(),
    providerReference: z.string().min(4),
    documentReference: z.string().optional(),
  });

  app.post('/v1/trust/phone/start', async (req, res) => {
    const parsed = PhoneVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid phone verification request', { issues: parsed.error.issues });
    }

    const { phoneNumber, userId } = parsed.data;
    const sql = PostgresPool.connection;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await sql`
      INSERT INTO otp_sessions (user_id, phone_number, otp_hash, purpose, attempts, max_attempts, expires_at, created_at, updated_at)
      VALUES (${userId}, ${phoneNumber}, ${require('crypto').createHash('sha256').update(code).digest('hex')}, 'driver_action', 0, 5, ${expiresAt}, ${now}, ${now})
    `;

    logger.info({ userId, phoneNumber }, 'Phone verification started');

    res.status(202).json({
      started: true,
      phoneNumber,
      expiresAt,
      provider: 'twilio_sms',
    });
  });

  const ConfirmPhoneSchema = z.object({
    userId: z.string().uuid(),
    code: z.string().length(6),
  });

  app.post('/v1/trust/phone/confirm', async (req, res) => {
    const parsed = ConfirmPhoneSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid confirmation request', { issues: parsed.error.issues });
    }

    const { userId, code } = parsed.data;
    const sql = PostgresPool.connection;

    const [otpSession] = await sql`
      SELECT * FROM otp_sessions
      WHERE user_id = ${userId} AND purpose = 'driver_action'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!otpSession || otpSession.consumed_at) {
      throw new ValidationError('No active verification session');
    }

    const expectedHash = require('crypto').createHash('sha256').update(code).digest('hex');
    if (otpSession.otp_hash !== expectedHash) {
      await sql`UPDATE otp_sessions SET attempts = attempts + 1 WHERE otp_session_id = ${otpSession.otp_session_id}`;
      return res.status(400).json({ valid: false, error: 'Invalid code' });
    }

    const now = new Date().toISOString();
    await sql.begin(async (tx) => {
      await tx`UPDATE otp_sessions SET consumed_at = ${now}, attempts = attempts + 1 WHERE otp_session_id = ${otpSession.otp_session_id}`;
      await tx`UPDATE users SET phone_number = ${otpSession.phone_number}, phone_verified_at = ${now} WHERE id = ${userId}`;
    });

    res.json({ verified: true, phoneNumber: otpSession.phone_number });
  });

  app.post('/v1/trust/identity/submit', async (req, res) => {
    const parsed = IdentityVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid identity verification request', { issues: parsed.error.issues });
    }

    const { userId, providerReference, documentReference } = parsed.data;
    const sql = PostgresPool.connection;
    const now = new Date().toISOString();

    const [record] = await sql`
      INSERT INTO verification_records
        (user_id, provider_reference, document_reference, document_status, verification_level, created_at, updated_at)
      VALUES
        (${userId}, ${providerReference}, ${documentReference ?? null}, 'pending', 'level_1', ${now}, ${now})
      RETURNING *
    `;

    logger.info({ userId, verificationId: record.id }, 'Identity verification submitted');

    res.status(202).json({
      submitted: true,
      verificationId: record.id,
    });
  });

  app.post('/v1/trust/driver-mode/enable', async (req, res) => {
    const { userId } = req.body;
    if (!userId) throw new ValidationError('User ID required');

    const sql = PostgresPool.connection;
    const now = new Date().toISOString();

    await sql`
      UPDATE users SET role = 'driver', updated_at = ${now}
      WHERE id = ${userId}
    `;

    res.json({ enabled: true, role: 'driver' });
  });

  app.post('/v1/trust/driver-documents/submit', async (req, res) => {
    const { userId, licenseNumber, documentReference } = req.body;
    if (!userId || !licenseNumber) {
      throw new ValidationError('User ID and license number required');
    }

    const sql = PostgresPool.connection;
    const now = new Date().toISOString();

    const [driver] = await sql`
      INSERT INTO drivers (user_id, license_number, driver_status, background_check_status, verification_level, sanad_identity_linked, created_at, updated_at)
      VALUES (${userId}, ${licenseNumber}, 'pending_approval', 'pending', 'level_0', false, ${now}, ${now})
      ON CONFLICT (user_id) DO UPDATE
      SET license_number = ${licenseNumber}, driver_status = 'pending_approval', updated_at = ${now}
      RETURNING *
    `;

    res.status(202).json({
      submitted: true,
      driverId: driver.driver_id,
    });
  });

  app.get('/v1/admin/drivers/pending', async (req, res) => {
    const sql = PostgresPool.connection;

    const [drivers] = await sql`
      SELECT d.*, u.full_name, u.phone_number
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      WHERE d.driver_status = 'pending_approval'
      ORDER BY d.created_at DESC
      LIMIT 100
    `;

    res.json({ drivers: drivers ?? [] });
  });

  app.post('/v1/admin/drivers/:driverId/approve', async (req, res) => {
    const { driverId } = req.params;
    const { approved } = req.body;
    const sql = PostgresPool.connection;
    const now = new Date().toISOString();

    const [driver] = await sql`
      UPDATE drivers
      SET driver_status = ${approved ? 'approved' : 'rejected'}, approved_at = ${now}, approved_by = 'admin'
      WHERE driver_id = ${driverId} AND driver_status = 'pending_approval'
      RETURNING *
    `;

    if (!driver) throw new NotFoundError('Driver not found or already processed');

    res.json({ approved: true, driver });
  });

  app.post('/v1/moderate/text', async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      throw new ValidationError('Text is required');
    }

    const result = moderateText(text);
    res.json(result);
  });

  app.post('/v1/trust/webhooks/sanad', async (req, res) => {
    const payload = req.body;
    const signature = req.headers['x-sanad-signature'] as string;

    logger.info({ payload, hasSignature: !!signature }, 'Sanad webhook received');

    const status = payload?.status ?? payload?.verification_status ?? 'unknown';
    const userId = payload?.user_id ?? payload?.userId;

    if (userId) {
      const now = new Date().toISOString();
      await PostgresPool.connection`
        UPDATE users SET sanad_verified_status = ${status}, updated_at = ${now} WHERE id = ${userId}
      `;
      await PostgresPool.connection`
        INSERT INTO verification_records (user_id, sanad_status, document_status, created_at, updated_at)
        VALUES (${userId}, ${status}, 'completed', ${now}, ${now})
        ON CONFLICT DO NOTHING
      `;
    }

    res.json({ received: true, status });
  });

  app.post('/v1/payments/webhooks/stripe', async (req, res) => {
    const payload = req.body;
    const event = payload?.type ?? 'unknown';

    logger.info({ event, payload }, 'Stripe webhook received');

    if (event === 'checkout.session.completed') {
      const session = payload?.data?.object;
      const transactionId = session?.metadata?.transaction_id;

      if (transactionId) {
        await PostgresPool.connection`
          UPDATE transactions SET transaction_status = 'posted', updated_at = ${new Date().toISOString()} WHERE transaction_id = ${transactionId}
        `;
      }
    }

    res.json({ received: true });
  });

  app.post('/v1/payments/webhooks/cliq', async (req, res) => {
    const payload = req.body;
    const signature = req.headers['x-cliq-signature'] as string;

    logger.info({ payload, hasSignature: !!signature }, 'CliQ webhook received');

    const status = payload?.status ?? payload?.payment_status ?? 'unknown';
    const transactionId = payload?.transaction_id ?? payload?.transactionId;

    if (transactionId) {
      await PostgresPool.connection`
        UPDATE transactions SET transaction_status = ${status}, updated_at = ${new Date().toISOString()} WHERE transaction_id = ${transactionId}
      `;
    }

    res.json({ received: true, status });
  });

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message, code: error.code });
      return;
    }
    logger.error('Trust service error', { err: error });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

async function start() {
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Trust Moderation Service listening on port ${config.port}`);
  });

  const healthServer = startRuntimeHealthServer({
    serviceName: 'trust-moderation-service',
    isReady: () => true,
    isHealthy: async () => {
      try {
        return await Promise.all([
          RedisPool.connection.ping().then(() => true).catch(() => false),
          PostgresPool.connection`SELECT 1`.then(() => true).catch(() => false),
        ]).then(results => results.every(Boolean));
      } catch {
        return false;
      }
    },
  });

  process.on('SIGTERM', async () => {
    server.close(() => console.log('Server closed'));
    await healthServer.close();
    await PostgresPool.disconnect();
    await RedisPool.disconnect();
    process.exit(0);
  });
}

start().catch(err => {
  console.error('Failed to start trust-moderation-service:', err);
  process.exit(1);
});