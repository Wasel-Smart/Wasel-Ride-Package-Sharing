/**
 * Payment Reconciliation Service - Production Implementation
 * Stripe idempotency, structured logging, env-driven config, Input validation
 */
import postgres from 'postgres';
import Stripe from 'stripe';
import Redis from 'ioredis';
import { loadConfig } from '../shared/src/config/app.config.js';
import { logger } from '../shared/src/logging/logger.js';
import { ValidationError, DatabaseError, ExternalServiceError } from '../shared/src/errors/app-errors.js';
import type { PaymentAuthorizationInput, PaymentRefundInput } from '../shared/src/validation/schemas.js';
import { eventBroker } from '../../../src/platform/event-broker-redis-production.js';
import { startRuntimeHealthServer } from '../runtime/http-health.js';

const config = loadConfig();
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
        retryStrategy: (times: number) => {
          if (times > config.redis.maxRetries) return null;
          return Math.min(times * config.redis.retryDelayMs, 5000);
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
      const paymentIntent = await stripe.paymentIntents.capture(providerId, {
        amount_to_capture: amount,
      }, { idempotencyKey });
      return {
        paymentId: paymentIntent.metadata.paymentId ?? '',
        capturedAmount: paymentIntent.amount_received,
        providerTransactionId: paymentIntent.id,
        capturedAt: new Date(paymentIntent.created * 1000).toISOString(),
        status: 'success',
      };
    } catch (error) {
      logger.error({ err: error, providerId, amount, idempotencyKey }, 'Stripe capture failed');
      return {
        paymentId: '',
        capturedAmount: 0,
        providerTransactionId: providerId,
        capturedAt: new Date().toISOString(),
        status: 'failed',
        failureReason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async refundPayment(providerId: string, amount: number, reason?: string, idempotencyKey?: string) {
    try {
      await stripe.refunds.create({
        payment_intent: providerId,
        amount,
        reason: 'requested_by_customer',
        metadata: { reason },
      }, { idempotencyKey });
      return true;
    } catch (error) {
      logger.error({ err: error, providerId, amount }, 'Stripe refund failed');
      return false;
    }
  }

  async getPaymentStatus(providerId: string) {
    try {
      const pi = await stripe.paymentIntents.retrieve(providerId);
      return pi.status;
    } catch (error) {
      logger.error({ err: error, providerId }, 'Stripe status check failed');
      return 'unknown';
    }
  }
}

export class PaymentReconciliationService {
  private readonly provider: PaymentProviderAdapter;
  private readonly processing = new Set<string>();
  private unsubscribe: (() => Promise<void>) | null = null;
  private healthServer: { close: () => Promise<void> } | null = null;
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
      {
        groupName: 'payment-reconciliation-service',
        consumerName: `payment-worker-${process.env.HOSTNAME ?? 'local'}`,
        blockMs: 5000,
        count: 5,
      },
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
    const startTimeMs = Date.now();
    logger.info({ eventId: event.id }, 'Processing payment authorization');
    try {
      const authorization = event.payload;
      this.validatePaymentAuthorization(authorization);

      if (this.processing.has(authorization.paymentId)) {
        logger.info({ paymentId: authorization.paymentId }, 'Duplicate authorization — skipping');
        return;
      }
      this.processing.add(authorization.paymentId);

      const shouldCapture = await this.shouldCapturePayment(authorization);
      if (!shouldCapture) {
        logger.info({ paymentId: authorization.paymentId }, 'Payment not ready for capture');
        return;
      }

      const idempotencyKey = `capture-${authorization.paymentId}`;
      const result = await this.provider.capturePayment(
        authorization.providerId,
        authorization.amount,
        idempotencyKey,
      );

      if (result.status === 'failed') {
        logger.error({ paymentId: authorization.paymentId, reason: result.failureReason }, 'Capture failed');
        throw new Error(`Payment capture failed: ${result.failureReason}`);
      }

      await this.recordCapture(authorization.paymentId, result);

      await eventBroker.publish({
        id: `evt-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        type: 'payments.captured',
        payload: {
          paymentId: authorization.paymentId,
          rideId: authorization.rideId,
          packageId: authorization.packageId,
          capturedAmount: result.capturedAmount,
          providerTransactionId: result.providerTransactionId,
          capturedAt: result.capturedAt,
        },
        producer: 'payment-reconciliation-service',
        traceId: event.traceId,
        occurredAt: new Date().toISOString(),
      });

      logger.info({ eventId: event.id, paymentId: authorization.paymentId, durationMs: Date.now() - startTimeMs }, 'Payment captured');
    } catch (error) {
      logger.error({ err: error, eventId: event.id }, 'Payment authorization error');
      throw error;
    } finally {
      this.processing.delete(event.payload.paymentId);
    }
  }

  private validatePaymentAuthorization(auth: PaymentAuthorizationInput) {
    if (!auth.paymentId || !auth.providerId || !auth.amount || !auth.currency) {
      throw new ValidationError('Missing required payment fields');
    }
    if (auth.amount <= 0 || !Number.isFinite(auth.amount)) {
      throw new ValidationError(`Invalid payment amount: ${auth.amount}`);
    }
    if (auth.currency.length !== 3) {
      throw new ValidationError(`Invalid currency code: ${auth.currency}`);
    }
  }

  private async shouldCapturePayment(authorization: PaymentAuthorizationInput) {
    if (authorization.escrowStatus === 'released') return true;
    try {
      const sql = PostgresPool.connection;
      if (authorization.rideId) {
        const ride = await sql`
          SELECT status FROM rides WHERE id = ${authorization.rideId}
        `;
        return ride.length > 0 && ride[0].status === 'completed';
      }
      if (authorization.packageId) {
        const pkg = await sql`
          SELECT status FROM packages WHERE id = ${authorization.packageId}
        `;
        return pkg.length > 0 && pkg[0].status === 'delivered';
      }
    } catch (error) {
      logger.error({ err: error, paymentId: authorization.paymentId }, 'Status check error');
    }
    return false;
  }

  private async recordCapture(paymentId: string, result: { capturedAmount: number; providerTransactionId: string; capturedAt: string }) {
    try {
      const sql = PostgresPool.connection;
      await sql`
        UPDATE payments
        SET status = 'captured',
          captured_amount = ${result.capturedAmount},
          provider_transaction_id = ${result.providerTransactionId},
          captured_at = ${result.capturedAt},
          updated_at = NOW()
        WHERE id = ${paymentId}
      `;
      logger.info({ paymentId }, 'Capture recorded');
    } catch (error) {
      logger.error({ err: error, paymentId }, 'Record capture error');
      throw new DatabaseError('Failed to record payment capture', error instanceof Error ? error : undefined);
    }
  }

  async processRefund(paymentId: string, amount: number, reason?: string) {
    try {
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new ValidationError(`Invalid refund amount: ${amount}`);
      }
      const sql = PostgresPool.connection;
      const payment = await sql`
        SELECT provider_id FROM payments WHERE id = ${paymentId}
      `;
      if (payment.length === 0) {
        logger.error({ paymentId }, 'Payment not found for refund');
        return false;
      }

      const providerId = payment[0].provider_id;
      const idempotencyKey = `refund-${paymentId}-${Date.now()}`;
      const success = await this.provider.refundPayment(providerId, amount, reason, idempotencyKey);

      if (success) {
        await sql`
          UPDATE payments SET status = 'refunded', refunded_at = NOW() WHERE id = ${paymentId}
        `;
        logger.info({ paymentId, amount }, 'Refund processed');
      }
      return success;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ err: error, paymentId, amount }, 'Refund error');
      return false;
    }
  }

  async healthCheck() {
    try {
      await PostgresPool.connection.sql<[{ now: string }]>`SELECT 1`;
      await stripe.balance.retrieve();
      return true;
    } catch (error) {
      logger.warn({ err: error }, 'Health check failed');
      return false;
    }
  }
}

if (process.argv[1].endsWith('payment-reconciliation-service.ts')) {
  const service = new PaymentReconciliationService();
  process.on('SIGTERM', async () => {
    logger.info({ service: 'payment-reconciliation' }, 'SIGTERM received');
    await service.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });
  service.start().catch(error => {
    logger.error({ err: error }, 'Fatal startup error');
    process.exit(1);
  });
}
