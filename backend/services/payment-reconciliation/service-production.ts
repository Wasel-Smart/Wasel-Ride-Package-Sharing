import postgres from 'postgres';
import Stripe from 'stripe';
import { fileURLToPath } from 'node:url';
import type { DomainEventEnvelope, DomainEventPayloadMap } from '../../../src/domain/events';
import { eventBroker } from '../../../src/platform/event-broker-redis-production';
import { startRuntimeHealthServer, type RuntimeHealthServer } from '../runtime/http-health';
import { getActiveSpan } from '../shared/opentelemetry';
import { getLogger } from '../shared/structured-logger';
import { SpanStatusCode } from '@opentelemetry/api';

const sql = postgres(process.env.DATABASE_URL || '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  maxNetworkRetries: 3,
  timeout: 30000,
});

const logger = getLogger('payment-reconciliation');

type PaymentsAuthorizedPayload = DomainEventPayloadMap['payments.authorized'];
type PaymentsCapturedPayload = DomainEventPayloadMap['payments.captured'];

class PaymentProviderAdapter {
  async capturePayment(
    providerId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<CaptureResult> {
    const span = getActiveSpan();
    span?.setAttribute('stripe.provider_id', providerId);
    span?.setAttribute('payment.amount', amount);

    try {
      const paymentIntent = await stripe.paymentIntents.capture(
        providerId,
        {
          amount_to_capture: amount,
        },
        {
          idempotencyKey,
        },
      );

      return {
        paymentId: paymentIntent.metadata.paymentId ?? '',
        capturedAmount: paymentIntent.amount_received,
        providerTransactionId: paymentIntent.id,
        capturedAt: new Date(paymentIntent.created * 1000).toISOString(),
        status: 'success',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message }, 'Payment capture failed');
      if (span) {
        span.setStatus({ code: SpanStatusCode.ERROR, message });
        if (error instanceof Error) span.recordException(error);
      }

      return {
        paymentId: '',
        capturedAmount: 0,
        providerTransactionId: providerId,
        capturedAt: new Date().toISOString(),
        status: 'failed',
        failureReason: message,
      };
    }
  }

  async refundPayment(
    providerId: string,
    amount: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<boolean> {
    try {
      await stripe.refunds.create(
        {
          payment_intent: providerId,
          amount,
          reason: 'requested_by_customer',
          metadata: { reason },
        },
        {
          idempotencyKey,
        },
      );

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message, providerId }, 'Refund failed');
      return false;
    }
  }

  async getPaymentStatus(providerId: string): Promise<string> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(providerId);
      return paymentIntent.status;
    } catch (error: unknown) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Status check failed');
      return 'unknown';
    }
  }
}

interface CaptureResult {
  paymentId: string;
  capturedAmount: number;
  providerTransactionId: string;
  capturedAt: string;
  status: 'success' | 'failed';
  failureReason?: string;
}

export class PaymentReconciliationService {
  private provider = new PaymentProviderAdapter();
  private unsubscribe?: () => Promise<void>;
  private processing = new Set<string>();
  private healthServer?: RuntimeHealthServer;
  private ready = false;

  async start(): Promise<void> {
    logger.info('Starting payment-reconciliation service...');

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
        consumerName: `payment-worker-${process.env.HOSTNAME || 'local'}`,
        blockMs: 5000,
        count: 5,
      },
    );

    this.ready = true;
    logger.info('Payment-reconciliation service started');
  }

  async stop(): Promise<void> {
    this.ready = false;
    if (this.unsubscribe) {
      await this.unsubscribe();
    }
    if (this.healthServer) {
      await this.healthServer.close();
    }
    await sql.end();
    logger.info('Payment-reconciliation service stopped');
  }

  private async handlePaymentAuthorization(
    event: DomainEventEnvelope<'payments.authorized'>,
  ): Promise<void> {
    const span = getActiveSpan();
    span?.setAttribute('event.id', event.id);

    const authorization: PaymentsAuthorizedPayload = event.payload;

    if (this.processing.has(authorization.paymentId)) {
      logger.info({ paymentId: authorization.paymentId }, 'Already processing payment');
      return;
    }

    this.processing.add(authorization.paymentId);

    try {
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
        throw new Error(`Payment capture failed: ${result.failureReason}`);
      }

      await this.recordCapture(authorization.paymentId, result);

      const capturedPayload: PaymentsCapturedPayload = {
        paymentId: authorization.paymentId,
        rideId: authorization.rideId,
        packageId: authorization.packageId,
        capturedAmount: result.capturedAmount,
        providerTransactionId: result.providerTransactionId,
        capturedAt: result.capturedAt,
      };

      await eventBroker.publish({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'payments.captured',
        payload: capturedPayload,
        producer: 'payment-reconciliation-service',
        traceId: event.traceId,
        occurredAt: new Date().toISOString(),
      });

      logger.info({ paymentId: authorization.paymentId }, 'Payment captured successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message, paymentId: authorization.paymentId }, 'Payment processing error');
      throw error;
    } finally {
      this.processing.delete(authorization.paymentId);
    }
  }

  private async shouldCapturePayment(authorization: PaymentsAuthorizedPayload): Promise<boolean> {
    if (authorization.escrowStatus === 'released') {
      return true;
    }

    try {
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
    } catch (error: unknown) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Status check error');
    }

    return false;
  }

  private async recordCapture(paymentId: string, result: CaptureResult): Promise<void> {
    try {
      await sql`
        UPDATE payments
        SET 
          status = 'captured',
          captured_amount = ${result.capturedAmount},
          provider_transaction_id = ${result.providerTransactionId},
          captured_at = ${result.capturedAt},
          updated_at = NOW()
        WHERE id = ${paymentId}
      `;

      logger.info({ paymentId }, 'Recorded capture');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message, paymentId }, 'Record capture error');
      throw error;
    }
  }

  async processRefund(
    paymentId: string,
    amount: number,
    reason: string,
  ): Promise<boolean> {
    try {
      const payment = await sql`
        SELECT provider_id FROM payments WHERE id = ${paymentId}
      `;

      if (payment.length === 0) {
        logger.error({ paymentId }, 'Payment not found');
        return false;
      }

      const providerId = payment[0].provider_id as string;
      const idempotencyKey = `refund-${paymentId}-${Date.now()}`;

      const success = await this.provider.refundPayment(
        providerId,
        amount,
        reason,
        idempotencyKey,
      );

      if (success) {
        await sql`
          UPDATE payments 
          SET status = 'refunded', refunded_at = NOW() 
          WHERE id = ${paymentId}
        `;

        logger.info({ paymentId }, 'Refund processed');
      }

      return success;
    } catch (error: unknown) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Refund error');
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await sql`SELECT 1`;
      await stripe.balance.retrieve();
      return true;
    } catch {
      return false;
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const service = new PaymentReconciliationService();

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received');
    await service.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });

  service.start().catch(error => {
    logger.error({ error }, 'Fatal error');
    process.exit(1);
  });
}