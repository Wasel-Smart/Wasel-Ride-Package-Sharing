/**
 * Payment Reconciliation Service - Production Implementation
 * Stripe idempotency, structured logging, env-driven config, Input validation
 */
import postgres from 'postgres';
import Stripe from 'stripe';
import Redis from 'ioredis';
import type { PaymentAuthorizationInput, PaymentRefundInput } from './shared/src/validation/schemas.js';
import { logger } from './shared/src/logging/logger.js';
import { ValidationError, DatabaseError } from './shared/src/errors/app-errors.js';
import { eventBroker } from './shared/platform/event-broker-redis-production.js';
import { startRuntimeHealthServer } from './runtime/http-health.js';

const config = (() => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL is required');
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) throw new Error('STRIPE_SECRET_KEY is required');
  return {
    database: {
      url: dbUrl,
      max: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
      idle: parseInt(process.env.DB_POOL_IDLE ?? '20', 10),
      timeout: parseInt(process.env.DB_POOL_TIMEOUT ?? '10', 10),
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true',
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES ?? '10', 10),
      retryDelay: parseInt(process.env.REDIS_RETRY_DELAY_MS ?? '1000', 10),
    },
    stripe: {
      secretKey: stripeSecret,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
      apiVersion: process.env.STRIPE_API_VERSION ?? '2026-02-25.clover',
    },
  };
})();

const stripe = new Stripe(config.stripe.secretKey, {
  maxNetworkRetries: 3,
  timeout: 30000,
  apiVersion: config.stripe.apiVersion,
});

class PostgresPool {
  private static instance: ReturnType<typeof postgres> | null = null;
  static get connection() {
    if (!PostgresPool.instance) {
      PostgresPool.instance = postgres(config.database.url, {
        max: config.database.max,
        idle_timeout: config.database.idle * 1000,
        connect_timeout: config.database.timeout * 1000,
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
        retryStrategy: (times: number) => {
          if (times > config.redis.maxRetries) return null;
          return Math.min(times * config.redis.retryDelay, 5000);
        },
        enableReadyCheck: true,
        enableOfflineQueue: false,
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

class PaymentProviderAdapter {
  async capturePayment(providerId: string, amount: number, idempotencyKey: string) {
    try {
      const pi = await stripe.paymentIntents.capture(providerId, { amount_to_capture: amount }, { idempotencyKey });
      return {
        paymentId: pi.metadata.paymentId ?? '',
        capturedAmount: pi.amount_received,
        providerTransactionId: pi.id,
        capturedAt: new Date(pi.created * 1000).toISOString(),
        status: 'success',
      };
    } catch (err) {
      logger.error({ err, providerId, amount, idempotencyKey }, 'Stripe capture failed');
      return {
        paymentId: '', capturedAmount: 0, providerTransactionId: providerId,
        capturedAt: new Date().toISOString(), status: 'failed',
        failureReason: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async refundPayment(providerId: string, amount: number, reason?: string, idempotencyKey?: string) {
    try {
      await stripe.refunds.create({
        payment_intent: providerId, amount, reason: 'requested_by_customer',
        metadata: { reason },
      }, { idempotencyKey });
      return true;
    } catch (err) {
      logger.error({ err, providerId, amount }, 'Stripe refund failed');
      return false;
    }
  }

  async getPaymentStatus(providerId: string) {
    try {
      return (await stripe.paymentIntents.retrieve(providerId)).status;
    } catch (err) {
      logger.error({ err, providerId }, 'Stripe status check failed');
      return 'unknown';
    }
  }
}

export class PaymentReconciliationService {
  private readonly provider: PaymentProviderAdapter;
  private readonly processing = new Set<string>();
  private unsubscribe: (() => Promise<void>) | null = null;
  private healthServer: { close(): Promise<void> } | null = null;
  private ready = false;

  async start() {
    logger.info('PaymentReconciliationService starting');
    this.healthServer = startRuntimeHealthServer({
      serviceName: 'payment-reconciliation-service',
      isReady: () => this.ready,
      isHealthy: () => this.healthCheck(),
    });
    this.unsubscribe = await eventBroker.subscribe(
      'payments.authorized',
      this.handlePaymentAuthorization.bind(this),
      { groupName: 'payment-reconciliation-service', consumerName: `payment-worker-${process.env.HOSTNAME ?? 'local'}`, blockMs: 5000, count: 5 },
    );
    this.ready = true;
    logger.info('PaymentReconciliationService started');
  }

  async stop() {
    this.ready = false;
    if (this.unsubscribe) await this.unsubscribe();
    if (this.healthServer) await this.healthServer.close();
    await PostgresPool.disconnect();
    await RedisPool.disconnect();
    logger.info('PaymentReconciliationService stopped');
  }

  async handlePaymentAuthorization(event: { id: string; payload: PaymentAuthorizationInput; traceId?: string }) {
    const startMs = Date.now();
    try {
      const auth = event.payload;
      this.validateAuthorization(auth);

      if (this.processing.has(auth.paymentId)) {
        logger.info({ paymentId: auth.paymentId }, 'Duplicate authorization — skipping');
        return;
      }
      this.processing.add(auth.paymentId);

      const shouldCapture = await this.shouldCapturePayment(auth);
      if (!shouldCapture) {
        logger.info({ paymentId: auth.paymentId }, 'Payment not ready for capture');
        return;
      }

      const result = await this.provider.capturePayment(auth.providerId, auth.amount, `capture-${auth.paymentId}`);
      if (result.status === 'failed') {
        logger.error({ paymentId: auth.paymentId, reason: result.failureReason }, 'Capture failed');
        throw new Error(`Payment capture failed: ${result.failureReason}`);
      }

      await this.recordCapture(auth.paymentId, result);

      await eventBroker.publish({
        id: `evt-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        type: 'payments.captured', producer: 'payment-reconciliation-service',
        traceId: event.traceId, occurredAt: new Date().toISOString(),
        payload: {
          paymentId: auth.paymentId, rideId: auth.rideId, packageId: auth.packageId,
          capturedAmount: result.capturedAmount, providerTransactionId: result.providerTransactionId,
          capturedAt: result.capturedAt,
        },
      });

      logger.info({ eventId: event.id, paymentId: auth.paymentId, durationMs: Date.now() - startMs }, 'Payment captured');
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Payment authorization error');
      throw err;
    } finally {
      this.processing.delete(event.payload.paymentId);
    }
  }

  private validateAuthorization(auth: PaymentAuthorizationInput) {
    if (!auth.paymentId || !auth.providerId || !auth.amount || !auth.currency) {
      throw new ValidationError('Missing required payment fields');
    }
    if (!Number.isFinite(auth.amount) || auth.amount <= 0) {
      throw new ValidationError(`Invalid amount: ${auth.amount}`);
    }
    if (auth.currency.length !== 3) {
      throw new ValidationError(`Invalid currency: ${auth.currency}`);
    }
  }

  private async shouldCapturePayment(auth: PaymentAuthorizationInput) {
    if (auth.escrowStatus === 'released') return true;
    try {
      const sql = PostgresPool.connection;
      if (auth.rideId) {
        const rows = await sql`SELECT status FROM rides WHERE id = ${auth.rideId}`;
        return rows.length > 0 && rows[0].status === 'completed';
      }
      if (auth.packageId) {
        const rows = await sql`SELECT status FROM packages WHERE id = ${auth.packageId}`;
        return rows.length > 0 && rows[0].status === 'delivered';
      }
    } catch (err) {
      logger.error({ err, paymentId: auth.paymentId }, 'Status check failed');
    }
    return false;
  }

  private async recordCapture(paymentId: string, result: { capturedAmount: number; providerTransactionId: string; capturedAt: string }) {
    try {
      const sql = PostgresPool.connection;
      await sql`
        UPDATE payments SET status = 'captured', captured_amount = ${result.capturedAmount},
          provider_transaction_id = ${result.providerTransactionId}, captured_at = ${result.capturedAt}, updated_at = NOW()
        WHERE id = ${paymentId}
      `;
      logger.info({ paymentId }, 'Capture recorded');
    } catch (err) {
      logger.error({ err, paymentId }, 'Record capture error');
      throw new DatabaseError('Payment recording failed', err instanceof Error ? err : undefined);
    }
  }

  async processRefund(paymentId: string, amount: number, reason?: string) {
    try {
      if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError(`Invalid refund amount: ${amount}`);
      const sql = PostgresPool.connection;
      const rows = await sql`SELECT provider_id FROM payments WHERE id = ${paymentId}`;
      if (rows.length === 0) {
        logger.error({ paymentId }, 'Payment not found for refund');
        return false;
      }
      const success = await this.provider.refundPayment(rows[0].provider_id, amount, reason, `refund-${paymentId}-${Date.now()}`);
      if (success) {
        await sql`UPDATE payments SET status = 'refunded', refunded_at = NOW() WHERE id = ${paymentId}`;
        logger.info({ paymentId, amount }, 'Refund processed');
      }
      return success;
    } catch (err) {
      logger.error({ err, paymentId, amount }, 'Refund error');
      return false;
    }
  }

  async healthCheck() {
    try {
      await PostgresPool.connection.sql`SELECT 1`;
      await stripe.balance.retrieve();
      return true;
    } catch {
      return false;
    }
  }
}

if (process.argv[1].includes('payment-reconciliation-service.ts')) {
  const service = new PaymentReconciliationService();
  process.on('SIGTERM', async () => {
    logger.info({ service: 'payment-reconciliation' }, 'SIGTERM received');
    await service.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });
  service.start().catch(err => {
    logger.error({ err }, 'Fatal error');
    process.exit(1);
  });
}
