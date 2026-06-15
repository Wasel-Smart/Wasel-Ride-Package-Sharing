/**
 * Payment Reconciliation Service - PRODUCTION IMPLEMENTATION
 * Real Stripe SDK integration with idempotency and retry logic
 */
import postgres from 'postgres';
import Stripe from 'stripe';
import { eventBroker } from '../../../src/platform/event-broker-redis-production.js';
import { startRuntimeHealthServer } from '../runtime/http-health.ts';

const sql = postgres(process.env.DATABASE_URL || '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  maxNetworkRetries: 3,
  timeout: 30000,
});

class PaymentProviderAdapter {
  MAX_RETRIES = 3;

  async capturePayment(providerId, amount, idempotencyKey) {
    try {
      const paymentIntent = await stripe.paymentIntents.capture(providerId, {
        amount_to_capture: amount,
      }, {
        idempotencyKey,
      });
      return {
        paymentId: paymentIntent.metadata.paymentId || '',
        capturedAmount: paymentIntent.amount_received,
        providerTransactionId: paymentIntent.id,
        capturedAt: new Date(paymentIntent.created * 1000).toISOString(),
        status: 'success',
      };
    } catch (error) {
      console.error('[PaymentProvider] Capture failed:', error);
      return {
        paymentId: '',
        capturedAmount: 0,
        providerTransactionId: providerId,
        capturedAt: new Date().toISOString(),
        status: 'failed',
        failureReason: error.message,
      };
    }
  }

  async refundPayment(providerId, amount, reason, idempotencyKey) {
    try {
      await stripe.refunds.create({
        payment_intent: providerId,
        amount,
        reason: 'requested_by_customer',
        metadata: { reason },
      }, {
        idempotencyKey,
      });
      return true;
    } catch (error) {
      console.error('[PaymentProvider] Refund failed:', error);
      return false;
    }
  }

  async getPaymentStatus(providerId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(providerId);
      return paymentIntent.status;
    } catch (error) {
      console.error('[PaymentProvider] Status check failed:', error);
      return 'unknown';
    }
  }
}

export class PaymentReconciliationService {
  provider = new PaymentProviderAdapter();
  unsubscribe;
  processing = new Set();
  healthServer;
  ready = false;

  async start() {
    console.log('[PaymentReconciliation] Starting service...');
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
    console.log('[PaymentReconciliation] Service started');
  }

  async stop() {
    this.ready = false;
    if (this.unsubscribe) {
      await this.unsubscribe();
    }
    if (this.healthServer) {
      await this.healthServer.close();
    }
    await sql.end();
    console.log('[PaymentReconciliation] Service stopped');
  }

  async handlePaymentAuthorization(event) {
    const startTime = Date.now();
    console.log(`[PaymentReconciliation] Processing: ${event.id}`);
    const authorization = event.payload;
    if (this.processing.has(authorization.paymentId)) {
      console.log(`[PaymentReconciliation] Already processing ${authorization.paymentId}`);
      return;
    }
    this.processing.add(authorization.paymentId);
    try {
      const shouldCapture = await this.shouldCapturePayment(authorization);
      if (!shouldCapture) {
        console.log(`[PaymentReconciliation] Payment ${authorization.paymentId} not ready`);
        return;
      }
      const idempotencyKey = `capture-${authorization.paymentId}`;
      const result = await this.provider.capturePayment(
        authorization.providerId,
        authorization.amount,
        idempotencyKey,
      );
      if (result.status === 'failed') {
        console.error(`[PaymentReconciliation] Capture failed: ${result.failureReason}`);
        throw new Error(`Payment capture failed: ${result.failureReason}`);
      }
      await this.recordCapture(authorization.paymentId, result);
      await eventBroker.publish({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
      const duration = Date.now() - startTime;
      console.log(`[PaymentReconciliation] Captured in ${duration}ms: ${authorization.paymentId}`);
    } catch (error) {
      console.error(`[PaymentReconciliation] Error:`, error);
      throw error;
    } finally {
      this.processing.delete(authorization.paymentId);
    }
  }

  async shouldCapturePayment(authorization) {
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
    } catch (error) {
      console.error('[PaymentReconciliation] Status check error:', error);
    }
    return false;
  }

  async recordCapture(paymentId, result) {
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
      console.log(`[PaymentReconciliation] Recorded capture: ${paymentId}`);
    } catch (error) {
      console.error('[PaymentReconciliation] Record capture error:', error);
      throw error;
    }
  }

  async processRefund(paymentId, amount, reason) {
    try {
      const payment = await sql`
        SELECT provider_id FROM payments WHERE id = ${paymentId}
      `;
      if (payment.length === 0) {
        console.error(`[PaymentReconciliation] Payment not found: ${paymentId}`);
        return false;
      }
      const providerId = payment[0].provider_id;
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
        console.log(`[PaymentReconciliation] Refund processed: ${paymentId}`);
      }
      return success;
    } catch (error) {
      console.error('[PaymentReconciliation] Refund error:', error);
      return false;
    }
  }

  async healthCheck() {
    try {
      await sql`SELECT 1`;
      await stripe.balance.retrieve();
      return true;
    } catch {
      return false;
    }
  }
}

if (process.argv[1].endsWith('service-production.ts')) {
  const service = new PaymentReconciliationService();
  process.on('SIGTERM', async () => {
    console.log('[PaymentReconciliation] SIGTERM received');
    await service.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });
  service.start().catch(error => {
    console.error('[PaymentReconciliation] Fatal error:', error);
    process.exit(1);
  });
}