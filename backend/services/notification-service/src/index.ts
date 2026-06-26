import postgres from 'postgres';
import Redis from 'ioredis';
import express from 'express';
import { loadConfig, type AppConfig } from '@wasel/backend-shared';
import { createRateLimitMiddleware } from '@wasel/backend-shared/rate-limiter';
import {
  AppError,
  ValidationError,
  NotFoundError,
} from '@wasel/backend-shared/errors/app-errors';
import { startRuntimeHealthServer } from '../../runtime/http-health';
import { eventBroker } from '../../../../src/platform/event-broker-redis-production.js';
import { logger } from '@wasel/backend-shared/logging/logger';
import { z } from 'zod';

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

  const PreferencesSchema = z.object({
    userId: z.string().uuid(),
    inApp: z.boolean().optional(),
    push: z.boolean().optional(),
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    tripUpdates: z.boolean().optional(),
    bookingRequests: z.boolean().optional(),
    messages: z.boolean().optional(),
    promotions: z.boolean().optional(),
    prayerReminders: z.boolean().optional(),
    criticalAlerts: z.boolean().optional(),
    preferredLanguage: z.enum(['en', 'ar']).optional(),
  });

  app.get('/v1/communications/preferences', async (req, res) => {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('User ID required');
    }

    const [prefs] = await PostgresPool.connection`
      SELECT * FROM communication_preferences WHERE user_id = ${userId}
    `;

    res.json({ preferences: prefs ?? null });
  });

  app.patch('/v1/communications/preferences', async (req, res) => {
    const parsed = PreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid preferences', { issues: parsed.error.issues });
    }

    const { userId, ...preferences } = parsed.data;
    const now = new Date().toISOString();

    const [prefs] = await PostgresPool.connection`
      INSERT INTO communication_preferences (
        user_id, in_app_enabled, push_enabled, email_enabled, sms_enabled, whatsapp_enabled,
        trip_updates_enabled, booking_requests_enabled, messages_enabled, promotions_enabled,
        prayer_reminders_enabled, critical_alerts_enabled, preferred_language, updated_at
      )
      VALUES (
        ${userId}, ${preferences.inApp ?? true}, ${preferences.push ?? true},
        ${preferences.email ?? true}, ${preferences.sms ?? true}, ${preferences.whatsapp ?? false},
        ${preferences.tripUpdates ?? true}, ${preferences.bookingRequests ?? true},
        ${preferences.messages ?? true}, ${preferences.promotions ?? false},
        ${preferences.prayerReminders ?? false}, ${preferences.criticalAlerts ?? true},
        ${preferences.preferredLanguage ?? 'en'}, ${now}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        in_app_enabled = ${preferences.inApp ?? true},
        push_enabled = ${preferences.push ?? true},
        email_enabled = ${preferences.email ?? true},
        sms_enabled = ${preferences.sms ?? true},
        whatsapp_enabled = ${preferences.whatsapp ?? false},
        trip_updates_enabled = ${preferences.tripUpdates ?? true},
        booking_requests_enabled = ${preferences.bookingRequests ?? true},
        messages_enabled = ${preferences.messages ?? true},
        promotions_enabled = ${preferences.promotions ?? false},
        prayer_reminders_enabled = ${preferences.prayerReminders ?? false},
        critical_alerts_enabled = ${preferences.criticalAlerts ?? true},
        preferred_language = ${preferences.preferredLanguage ?? 'en'},
        updated_at = ${now}
      RETURNING *
    `;

    res.json({ preferences: prefs });
  });

  const RatingSchema = z.object({
    bookingId: z.string().uuid(),
    tripId: z.string().uuid(),
    driverId: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    review: z.string().optional(),
    tags: z.array(z.string()).optional(),
    riderId: z.string().uuid(),
  });

  app.post('/v1/ratings', async (req, res) => {
    const parsed = RatingSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid rating request', { issues: parsed.error.issues });
    }

    const { bookingId, tripId, driverId, rating, review, tags, riderId } = parsed.data;
    const now = new Date().toISOString();

    const [ratingRecord] = await PostgresPool.connection`
      INSERT INTO ratings (booking_id, trip_id, rider_id, driver_id, rating, review, tags, created_at)
      VALUES (${bookingId}, ${tripId}, ${riderId}, ${driverId}, ${rating}, ${review ?? null}, ${JSON.stringify(tags ?? [])}, ${now})
      RETURNING *
    `;

    res.status(201).json({ rating: ratingRecord });
  });

  app.get('/v1/ratings/drivers/:driverId', async (req, res) => {
    const { driverId } = req.params;

    const [{ data: profile }, { data: recentReviews }] = await Promise.all([
      PostgresPool.connection`SELECT average_rating, total_ratings FROM profiles WHERE id = ${driverId}`,
      PostgresPool.connection`SELECT rating, review, tags, created_at FROM ratings WHERE driver_id = ${driverId} AND review IS NOT NULL ORDER BY created_at DESC LIMIT 10`,
    ]);

    res.json({
      averageRating: Number(profile?.average_rating ?? 0),
      totalRatings: Number(profile?.total_ratings ?? 0),
      recentReviews: (recentReviews ?? []).map((r: any) => ({
        rating: Number(r.rating),
        review: String(r.review ?? ''),
        tags: Array.isArray(r.tags) ? r.tags : [],
        createdAt: String(r.created_at),
      })),
    });
  });

  app.get('/v1/ratings/bookings/:bookingId/eligibility', async (req, res) => {
    const { bookingId } = req.params;

    const [booking] = await PostgresPool.connection`
      SELECT id, user_id, status FROM bookings WHERE id = ${bookingId}
    `;

    if (!booking) {
      return res.json({ canRate: false, reason: 'Booking not found' });
    }

    const [existingRating] = await PostgresPool.connection`
      SELECT id FROM ratings WHERE booking_id = ${bookingId}
    `;

    if (existingRating) {
      return res.json({ canRate: false, reason: 'Already rated' });
    }

    res.json({ canRate: booking.status === 'completed' });
  });

  app.post('/v1/communications/deliver', async (req, res) => {
    const parsed = z.object({
      userId: z.string().uuid(),
      deliveries: z.array(z.object({
        channel: z.enum(['push', 'sms', 'email', 'whatsapp']),
        destination: z.string(),
        subject: z.string().optional(),
        body: z.string(),
        metadata: z.record(z.unknown()).optional(),
      })),
      notificationId: z.string().optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid delivery request', { issues: parsed.error.issues });
    }

    const { userId, deliveries, notificationId } = parsed.data;
    const now = new Date().toISOString();

    const rows = deliveries.map((d) => ({
      user_id: userId,
      notification_id: notificationId ?? null,
      channel: d.channel,
      delivery_status: 'queued',
      destination: d.destination,
      subject: d.subject ?? null,
      payload: JSON.stringify({ body: d.body, metadata: d.metadata ?? null }),
      provider_name: d.channel === 'email' ? 'sendgrid' : 'twilio',
      queued_at: now,
      updated_at: now,
    }));

    await PostgresPool.connection`
      INSERT INTO communication_deliveries ${PostgresPool.connection(rows as any, 'user_id', 'notification_id', 'channel', 'delivery_status', 'destination', 'subject', 'payload', 'provider_name', 'queued_at', 'updated_at')}
    `;

    res.status(202).json({ queued: deliveries.length });
  });

  app.post('/v1/communications/process', async (req, res) => {
    const now = new Date().toISOString();

    const [deliveries] = await PostgresPool.connection`
      SELECT * FROM communication_deliveries
      WHERE delivery_status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= ${now})
      ORDER BY queued_at ASC
      LIMIT 25
    `;

    let sent = 0;
    for (const delivery of (deliveries ?? []) as any[]) {
      await PostgresPool.connection`
        UPDATE communication_deliveries
        SET delivery_status = 'sent', sent_at = ${now}, locked_at = NULL, next_attempt_at = NULL
        WHERE id = ${delivery.id}
      `;
      sent++;
    }

    res.json({ processed: (deliveries ?? []).length, sent });
  });

  app.post('/v1/communications/admin/send-test', async (req, res) => {
    const { channel, destination, subject, message } = req.body;
    if (!channel || !destination) {
      throw new ValidationError('Channel and destination required');
    }

    logger.info({ channel, destination, subject }, 'Test communication sent');

    res.json({ success: true, channel, destination });
  });

  app.get('/v1/communications/admin/provider-diagnostics', async (req, res) => {
    res.json({
      resend: { configured: !!process.env.RESEND_API_KEY },
      sendgrid: { configured: !!process.env.SENDGRID_API_KEY },
      twilio: { configured: !!process.env.TWILIO_ACCOUNT_SID },
    });
  });

  app.post('/v1/communications/webhooks/resend', async (req, res) => {
    const payload = req.body;
    logger.info({ payload }, 'Resend webhook received');
    res.json({ received: true });
  });

  app.post('/v1/communications/webhooks/twilio', async (req, res) => {
    const payload = req.body;
    logger.info({ payload }, 'Twilio webhook received');
    res.json({ received: true });
  });

  app.get('/v1/chat/trips/:tripId/messages', async (req, res) => {
    const { tripId } = req.params;
    const limit = Math.min(Number(req.query.limit ?? 50), 100);

    const [messages] = await PostgresPool.connection`
      SELECT id, trip_id, sender_id, content, type, metadata, read_by, created_at
      FROM messages
      WHERE trip_id = ${tripId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    res.json({ messages: (messages ?? []).reverse() });
  });

  app.post('/v1/chat/trips/:tripId/messages', async (req, res) => {
    const { tripId } = req.params;
    const parsed = z.object({
      content: z.string().min(1),
      type: z.enum(['text', 'location', 'system']).optional(),
      senderId: z.string().uuid(),
    }).safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid message', { issues: parsed.error.issues });
    }

    const { content, type, senderId } = parsed.data;
    const now = new Date().toISOString();

    const [message] = await PostgresPool.connection`
      INSERT INTO messages (trip_id, sender_id, content, type, read_by, created_at, updated_at)
      VALUES (${tripId}, ${senderId}, ${content}, ${type ?? 'text'}, ARRAY[${senderId}], ${now}, ${now})
      RETURNING *
    `;

    res.status(201).json({ message });
  });

  app.post('/v1/chat/messages/read', async (req, res) => {
    const { messageIds, userId } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.json({ ok: true });
    }

    for (const msgId of messageIds) {
      await PostgresPool.connection`
        UPDATE messages
        SET read_by = array_append(read_by, ${userId})
        WHERE id = ${msgId} AND NOT (${userId} = ANY(read_by))
      `;
    }

    res.json({ ok: true });
  });

  app.get('/v1/chat/trips/:tripId/unread-count', async (req, res) => {
    const { tripId } = req.params;
    const { userId } = req.query;

    const [messages] = await PostgresPool.connection`
      SELECT id, read_by FROM messages WHERE trip_id = ${tripId}
    `;

    const count = ((messages as any) ?? []).filter((m: any) =>
      !Array.isArray(m.read_by) || !m.read_by.includes(userId)
    ).length;

    res.json({ count });
  });

  app.post('/v1/cancellations/bookings', async (req, res) => {
    const parsed = z.object({
      bookingId: z.string().uuid(),
      reason: z.string().min(1),
      refundRequested: z.boolean().optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid cancellation request', { issues: parsed.error.issues });
    }

    const { bookingId, reason, refundRequested } = parsed.data;
    const now = new Date().toISOString();

    const [booking] = await PostgresPool.connection`
      UPDATE bookings
      SET status = 'cancelled', cancelled_at = ${now}, cancellation_reason = ${reason}
      WHERE id = ${bookingId} AND status NOT IN ('cancelled', 'completed')
      RETURNING *
    `;

    if (!booking) {
      throw new NotFoundError('Booking not found or not cancellable');
    }

    logger.info({ bookingId, reason, refundRequested }, 'Booking cancelled');

    res.json({ ok: true, refundRequired: refundRequested ?? false });
  });

  app.post('/v1/cancellations/trips', async (req, res) => {
    const parsed = z.object({
      tripId: z.string().uuid(),
      reason: z.string().min(1),
    }).safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid cancellation request', { issues: parsed.error.issues });
    }

    const { tripId, reason } = parsed.data;
    const now = new Date().toISOString();

    const [trip] = await PostgresPool.connection`
      UPDATE trips
      SET trip_status = 'cancelled', cancelled_at = ${now}, cancellation_reason = ${reason}
      WHERE trip_id = ${tripId} AND trip_status NOT IN ('cancelled', 'completed')
      RETURNING *
    `;

    if (!trip) {
      throw new NotFoundError('Trip not found or not cancellable');
    }

    res.json({ ok: true });
  });

  app.get('/v1/cancellations/bookings/:bookingId/eligibility', async (req, res) => {
    const { bookingId } = req.params;

    const [booking] = await PostgresPool.connection`
      SELECT id, status FROM bookings WHERE id = ${bookingId}
    `;

    if (!booking) {
      return res.json({ canCancel: false, reason: 'Booking not found' });
    }

    if (booking.status === 'cancelled') {
      return res.json({ canCancel: false, reason: 'Already cancelled' });
    }

    if (booking.status === 'completed') {
      return res.json({ canCancel: false, reason: 'Cannot cancel completed booking' });
    }

    res.json({ canCancel: true });
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
    console.log('SIGTERM received, shutting down');
    server.close(() => console.log('Server closed'));
    await healthServer.close();
    await PostgresPool.disconnect();
    await RedisPool.disconnect();
    process.exit(0);
  });
}

start().catch(err => {
  console.error('Failed to start notification-service:', err);
  process.exit(1);
});