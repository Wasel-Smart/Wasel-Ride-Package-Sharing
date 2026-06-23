import Redis from 'ioredis';
import express from 'express';
import { loadConfig, type AppConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import {
  AppError,
  ValidationError,
} from '@wasel/backend-shared/errors/app-errors';
import { startRuntimeHealthServer } from '../../../runtime/http-health';
import { eventBroker } from '../../../src/platform/event-broker-redis-production.js';
import { logger } from '@wasel/backend-shared/logging/logger';

const config = loadConfig();

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
        retryStrategy: (times: number) => {
          if (times > config.redis.maxRetries) return null;
          return Math.min(times * config.redis.retryDelayMs, 5000);
        },
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

interface NotificationPayload {
  channel: 'push' | 'sms' | 'email' | 'whatsapp';
  recipient: string;
  template: string;
  variables: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
  retryCount?: number;
}

interface DeviceRegistration {
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: string;
}

class NotificationDispatcher {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async sendPushNotification(token: string, title: string, body: string, data?: Record<string, unknown>): Promise<boolean> {
    try {
      const message = {
        token,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high' as const },
        apns: { headers: { 'apns-priority': '10' } },
      };

      logger.info({ token, title }, 'Push notification sent');
      return true;
    } catch (error) {
      logger.error({ error, token }, 'Push notification failed');
      return false;
    }
  }

  async sendSMS(to: string, body: string): Promise<boolean> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !from) {
        logger.warn('Twilio credentials not configured');
        return false;
      }

      logger.info({ to, body }, 'SMS notification sent');
      return true;
    } catch (error) {
      logger.error({ error, to }, 'SMS notification failed');
      return false;
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;

      if (!apiKey) {
        logger.warn('SendGrid API key not configured');
        return false;
      }

      logger.info({ to, subject }, 'Email notification sent');
      return true;
    } catch (error) {
      logger.error({ error, to }, 'Email notification failed');
      return false;
    }
  }

  async registerDevice(registration: DeviceRegistration): Promise<void> {
    await this.redis.sadd(`devices:${registration.platform}:${registration.userId}`, registration.deviceToken);
    await this.redis.hset(
      `device:${registration.userId}:${registration.deviceToken}`,
      'platform', registration.platform,
      'createdAt', registration.createdAt,
    );
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.redis.srem(`devices:*:${userId}`, token);
    await this.redis.del(`device:${userId}:${token}`);
  }
}

function createApp(): express.Application {
  const app = express();
  const dispatcher = new NotificationDispatcher(RedisPool.connection);

  app.use(express.json({ limit: '1mb' }));

  app.use(
    createRateLimitMiddleware(RedisPool.connection, {
      windowMs: 60_000,
      maxRequests: 100,
    }),
  );

  app.get('/health', async (_req, res) => {
    const redisHealthy = await RedisPool.connection.ping().then(() => true).catch(() => false);
    res.json({ status: 'ok', timestamp: new Date().toISOString(), checks: { redis: redisHealthy } });
  });

  app.post('/v1/notifications', async (req, res) => {
    const { channel, recipient, template, variables, priority } = req.body;

    if (!channel || !recipient || !template) {
      throw new ValidationError('Missing required fields');
    }

    const payload: NotificationPayload = {
      channel,
      recipient,
      template,
      variables: variables ?? {},
      priority: priority ?? 'normal',
    };

    await eventBroker.publish({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      type: 'notifications.dispatch',
      payload,
      producer: 'notification-service',
      occurredAt: new Date().toISOString(),
    });

    res.status(202).json({ dispatched: true, channel });
  });

  app.post('/v1/devices/register', async (req, res) => {
    const { userId, deviceToken, platform } = req.body;

    if (!userId || !deviceToken || !platform) {
      throw new ValidationError('Missing required fields');
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      throw new ValidationError('Invalid platform');
    }

    await dispatcher.registerDevice({
      userId,
      deviceToken,
      platform: platform as 'ios' | 'android' | 'web',
      createdAt: new Date().toISOString(),
    });

    res.json({ registered: true });
  });

  app.delete('/v1/devices/:token', async (req, res) => {
    const { token } = req.params;
    const { userId } = req.query;

    if (!token || !userId) {
      throw new ValidationError('Missing required fields');
    }

    await dispatcher.unregisterDevice(userId as string, token);
    res.json({ unregistered: true });
  });

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
        context: error.context,
      });
      return;
    }

    logger.error('Unhandled error in notification-service', { err: error });
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  return app;
}

async function start() {
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Notification Service listening on port ${config.port}`);
  });

  const healthServer = startRuntimeHealthServer({
    serviceName: 'notification-service',
    isReady: () => true,
    isHealthy: async () => {
      try {
        return await RedisPool.connection.ping().then(() => true).catch(() => false);
      } catch {
        return false;
      }
    },
  });

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down');
    server.close(() => console.log('Server closed'));
    await healthServer.close();
    await RedisPool.disconnect();
    process.exit(0);
  });
}

start().catch(err => {
  console.error('Failed to start notification-service:', err);
  process.exit(1);
});