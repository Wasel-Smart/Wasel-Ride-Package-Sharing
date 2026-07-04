import postgres from 'postgres';
import Redis from 'ioredis';
import express from 'express';
import { randomBytes, createHmac } from 'crypto';
import { loadConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import {
  AppError,
  ValidationError,
  NotFoundError,
} from '@wasel/backend-shared/errors/app-errors';
import { startRuntimeHealthServer } from '../../runtime/http-health';
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

interface WalletRow {
  wallet_id: string;
  user_id: string;
  balance_jod: number;
  currency_code: string;
  wallet_status: string;
  pin_salt?: string;
}

function hashPin(pin: string, salt: string): string {
  return createHmac('sha256', salt + pin).digest('hex');
}

function secureRandomString(len: number): string {
  return randomBytes(len).toString('hex');
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

  app.get('/health', async (_req, res) => {
    const redisHealthy = await RedisPool.connection.ping().then(() => true).catch(() => false);
    const dbHealthy = await PostgresPool.connection`SELECT 1`.then(() => true).catch(() => false);
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: { redis: redisHealthy, database: dbHealthy },
    });
  });

  app.get('/ready', async (_req, res) => {
    const ready = await Promise.all([
      RedisPool.connection.ping().then(() => true).catch(() => false),
      PostgresPool.connection`SELECT 1`.then(() => true).catch(() => false),
    ]).then(results => results.every(Boolean));
    res.json({ status: ready ? 'ready' : 'not_ready' });
  });

  app.get('/metrics', async (_req, res) => {
    res.json({
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/v1/:userId/wallet', async (req, res) => {
    const { userId } = req.params;
    const sql = PostgresPool.connection;

    const [wallet] = await sql<WalletRow[]>`
      SELECT * FROM wallets WHERE user_id = ${userId}
    `;

    if (!wallet) throw new NotFoundError('Wallet not found');
    res.json({ wallet: { ...wallet, balance: Number(wallet.balance_jod ?? 0) } });
  });

  app.post('/v1/:userId/wallet/pin/set', async (req, res) => {
    const { userId } = req.params;
    const parsed = z.object({ pin: z.string().length(4), confirmPin: z.string().length(4) }).safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid PIN', { issues: parsed.error.issues });
    }

    const { pin, confirmPin } = parsed.data;
    if (pin !== confirmPin) {
      throw new ValidationError('PINs do not match');
    }

    const sql = PostgresPool.connection;
    const now = new Date().toISOString();
    const pinSalt = secureRandomString(16);
    const pinHash = hashPin(pin, pinSalt);

    await sql`
      UPDATE wallets SET pin_hash = ${pinHash}, pin_salt = ${pinSalt}, updated_at = ${now}
      WHERE user_id = ${userId}
    `;

    res.json({ set: true });
  });

  app.post('/v1/:userId/wallet/pin/verify', async (req, res) => {
    const { userId } = req.params;
    const { pin } = req.body;
    if (!pin || pin.length !== 4) {
      throw new ValidationError('Invalid PIN');
    }

    const sql = PostgresPool.connection;
    const [wallet] = await sql`
      SELECT pin_hash, pin_salt FROM wallets WHERE user_id = ${userId}
    `;

    if (!wallet?.pin_hash || !wallet?.pin_salt) {
      return res.json({ valid: false });
    }

    const pinHash = hashPin(pin, wallet.pin_salt);
    res.json({ valid: pinHash === wallet.pin_hash });
  });

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message, code: error.code });
      return;
    }
    logger.error('Wallet service error', { err: error });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

async function start() {
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Wallet Service listening on port ${config.port}`);
  });

  const healthServer = startRuntimeHealthServer({
    serviceName: 'wallet-service',
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
  console.error('Failed to start wallet-service:', err);
  process.exit(1);
});