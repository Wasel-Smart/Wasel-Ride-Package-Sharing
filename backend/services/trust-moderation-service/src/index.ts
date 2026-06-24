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

  app.post('/v1/moderate/text', async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      throw new ValidationError('Text is required');
    }

    const result = moderateText(text);
    res.json(result);
  });

  app.post('/v1/trust/status/:userId', async (req, res) => {
    const { userId } = req.params;
    const sql = PostgresPool.connection;

    const [{ data: wallet }] = await Promise.all([
      sql`SELECT wallet_status FROM wallets WHERE user_id = ${userId}`,
    ]);

    const steps = {
      identity: { id: 'identity', state: 'not_started', detail: 'Submit ID verification' },
      email: { id: 'email', state: 'completed', detail: 'Email verified' },
      phone: { id: 'phone', state: 'not_started', detail: 'Add and verify phone' },
      driverDocuments: { id: 'driver_documents', state: 'not_started', detail: 'Submit driver documents' },
      walletStanding: {
        id: 'wallet_standing',
        state: wallet?.wallet_status === 'active' ? 'completed' : 'failed',
        detail: wallet?.wallet_status ? `Wallet status: ${wallet.wallet_status}` : 'No wallet',
      },
    };

    res.json({ steps, fetchedAt: new Date().toISOString() });
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