import express from 'express';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { loadConfig, type AppConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@wasel/backend-shared/errors/app-errors';

import authRouter from './routes/v1/auth';
import twoFactorRouter from './routes/v1/2fa';
import recoveryRouter from './routes/v1/recovery';
import { startRuntimeHealthServer } from '../../../runtime/http-health';

const config = loadConfig();
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  tls: config.redis.tls ? {} : undefined,
  maxRetries: config.redis.maxRetries,
  retryStrategy: (times: number) => {
    if (times > config.redis.maxRetries) return null;
    return Math.min(times * config.redis.retryDelayMs, 5000);
  },
});

function createApp(): express.Application {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.use(
    createRateLimitMiddleware(redis, {
      windowMs: 60_000,
      maxRequests: 100,
    }),
  );

  app.get('/health', async (_req, res) => {
    const redisHealthy = await redis.ping().then(() => true).catch(() => false);
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: { redis: redisHealthy },
    });
  });

  app.get('/ready', async (_req, res) => ({ status: 'ready' }));

  app.get('/metrics', async (_req, res) => ({
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  app.use('/v1/auth', authRouter);
  app.use('/v1/2fa', twoFactorRouter);
  app.use('/v1/recovery', recoveryRouter);

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
        context: error.context,
      });
      return;
    }

    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  return app;
}

async function start() {
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`Identity service listening on port ${config.port}`);
  });

  const healthServer = startRuntimeHealthServer({
    serviceName: 'identity-service',
    isReady: () => true,
    isHealthy: async () => {
      try {
        return await redis.ping().then(() => true).catch(() => false);
      } catch {
        return false;
      }
    },
  });

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down');
    server.close(() => {
      console.log('Server closed');
    });
    await healthServer.close();
    await redis.quit();
    process.exit(0);
  });
}

start().catch(error => {
  console.error('Failed to start identity service:', error);
  process.exit(1);
});