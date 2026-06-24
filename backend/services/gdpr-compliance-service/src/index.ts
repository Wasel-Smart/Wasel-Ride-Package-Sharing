import postgres from 'postgres';
import Redis from 'ioredis';
import express from 'express';
import { loadConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import {
  AppError,
  ValidationError,
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

interface DataDeletionRequest {
  id: string;
  user_id: string;
  request_type: 'account_deletion' | 'data_export' | 'data_correction';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
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

  app.get('/ready', async (_req, res) => ({ status: 'ready' }));

  app.get('/metrics', async (_req, res) => ({
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  app.post('/v1/gdpr/consents', async (req, res) => {
    const { userId, consentType, granted } = req.body;
    if (!userId || !consentType) {
      throw new ValidationError('User ID and consent type required');
    }

    const sql = PostgresPool.connection;
    const now = new Date().toISOString();

    const [consent] = await sql`
      INSERT INTO user_consents (user_id, consent_type, granted, granted_at, updated_at)
      VALUES (${userId}, ${consentType}, ${granted ?? true}, ${now}, ${now})
      ON CONFLICT (user_id, consent_type) DO UPDATE
      SET granted = ${granted ?? true}, granted_at = ${now}, updated_at = ${now}
      RETURNING *
    `;

    res.status(201).json({ consent });
  });

  app.get('/v1/gdpr/consents/:userId', async (req, res) => {
    const { userId } = req.params;
    const sql = PostgresPool.connection;

    const [consents] = await sql`
      SELECT * FROM user_consents WHERE user_id = ${userId}
      ORDER BY granted_at DESC
    `;

    res.json({ consents });
  });

  app.post('/v1/gdpr/deletion/request', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const sql = PostgresPool.connection;
    const now = new Date().toISOString();

    const [request] = await sql`
      INSERT INTO data_deletion_requests (user_id, request_type, status, requested_at)
      VALUES (${userId}, 'account_deletion', 'pending', ${now})
      RETURNING *
    `;

    logger.info({ userId, requestId: request.id }, 'GDPR deletion request scheduled');

    res.status(201).json({ request });
  });

  app.get('/v1/gdpr/deletion/:userId', async (req, res) => {
    const { userId } = req.params;

    const [request] = await PostgresPool.connection`
      SELECT * FROM data_deletion_requests WHERE user_id = ${userId}
      ORDER BY requested_at DESC
      LIMIT 1
    `;

    res.json({ request });
  });

  app.post('/v1/gdpr/deletion/:requestId/process', async (req, res) => {
    const { requestId } = req.params;
    const sql = PostgresPool.connection;

    const [request] = await sql`
      SELECT * FROM data_deletion_requests WHERE id = ${requestId}
    `;

    if (!request) {
      throw new ValidationError('Request not found');
    }

    const userId = request.user_id;

    await sql.begin(async (trx: postgres.TransactionClient) => {
      await trx`DELETE FROM bookings WHERE passenger_id = ${userId}`;
      await trx`DELETE FROM trips WHERE driver_id = ${userId}`;
      await trx`DELETE FROM payments WHERE user_id = ${userId}`;
      await trx`DELETE FROM wallets WHERE user_id = ${userId}`;
      await trx`DELETE FROM verification_records WHERE user_id = ${userId}`;
      await trx`UPDATE data_deletion_requests SET status = 'completed', completed_at = NOW() WHERE id = ${requestId}`;
    });

    logger.info({ userId, requestId }, 'GDPR deletion processed');
    res.json({ success: true });
  });

  app.get('/v1/gdpr/export/:userId', async (req, res) => {
    const { userId } = req.params;
    const sql = PostgresPool.connection;

    const [user, trips, bookings, payments] = await Promise.all([
      sql`SELECT id, email, full_name, created_at FROM users WHERE id = ${userId}`,
      sql`SELECT * FROM trips WHERE driver_id = ${userId}`,
      sql`SELECT * FROM bookings WHERE passenger_id = ${userId}`,
      sql`SELECT * FROM payments WHERE user_id = ${userId}`,
    ]);

    const exportData = {
      user: user[0],
      trips,
      bookings,
      payments,
      exportedAt: new Date().toISOString(),
    };

    const downloadUrl = `data:application/json;base64,${Buffer.from(JSON.stringify(exportData)).toString('base64')}`;

    res.json({ export: { ...exportData, downloadUrl } });
  });

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message, code: error.code });
      return;
    }
    logger.error('GDPR service error', { err: error });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

async function start() {
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`GDPR Compliance Service listening on port ${config.port}`);
  });

  const healthServer = startRuntimeHealthServer({
    serviceName: 'gdpr-compliance-service',
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
  console.error('Failed to start gdpr-compliance-service:', err);
  process.exit(1);
});