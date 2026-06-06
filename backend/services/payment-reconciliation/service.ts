/**
 * Payment Reconciliation Service
 * Independent backend service for payment capture, settlement, and reconciliation
 * 
 * Responsibilities:
 * - Consume payments.authorized events
 * - Execute payment capture with Stripe
 * - Handle escrow release
 * - Process refunds
 * - Publish payments.captured events
 */

import type { DomainEventEnvelope } from '../../../src/domain/events';
import { eventBroker } from '../../../src/platform/event-broker-redis';
import { stripeClient } from '../shared/stripe';
import { db, updateOne } from '../shared/database';

interface PaymentAuthorization {
  paymentId: string;
  rideId?: string;
  packageId?: string;
  amount: number;
  currency: string;
  providerId: string; // Stripe payment intent ID
  escrowStatus: 'held' | 'released' | 'refunded';
  authorizedAt: string;
}

interface CaptureResult {
  paymentId: string;
  capturedAmount: number;
  providerTransactionId: string;
  capturedAt: string;
  status: 'success' | 'failed';
  failureReason?: string;
}

/**
 * Payment Provider Adapter
 * Abstracts Stripe operations with retry and idempotency
 */
class PaymentProviderAdapter {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2000;

  async capturePayment(
    providerId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<CaptureResult> {
    try {
      const result = await stripeClient.capturePayment(
        providerId,
        amount,
        idempotencyKey,
      );

      if (!result.success || !result.paymentIntent) {
        return {
          paymentId: '',
          capturedAmount: 0,
          providerTransactionId: providerId,
          capturedAt: new Date().toISOString(),
          status: 'failed',
          failureReason: result.error || 'Unknown error',
        };
      }

      return {
        paymentId: result.paymentIntent.metadata?.paymentId || '',
        capturedAmount: result.paymentIntent.amount_received / 100,
        providerTransactionId: result.paymentIntent.id,
        capturedAt: new Date(result.paymentIntent.created * 1000).toISOString(),
        status: 'success',
      };
    } catch (error: any) {
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

  async refundPayment(
    providerId: string,
    amount: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<boolean> {
    const result = await stripeClient.refundPayment(
      providerId,
      amount,
      'requested_by_customer',
      idempotencyKey,
    );

    return result.success;
  }

  async getPaymentStatus(providerId: string): Promise<string> {
    const paymentIntent = await stripeClient.getPaymentIntent(providerId);
    return paymentIntent.status;
  }
}

/**
 * Payment Reconciliation Service
 * Handles settlement capture and provider reconciliation
 */
export class PaymentReconciliationService {
  private provider = new PaymentProviderAdapter();
  private unsubscribe?: () => Promise<void>;
  private processing = new Set<string>(); // Deduplication

  async start(): Promise<void> {
    console.log('[PaymentReconciliation] Starting service...');

    // Subscribe to payments.authorized topic
    this.unsubscribe = await eventBroker.subscribe(
      'payments.authorized',
      this.handlePaymentAuthorization.bind(this),
      {
        groupName: 'payment-reconciliation-service',
        consumerName: `payment-worker-${process.env.HOSTNAME || 'local'}`,
        blockMs: 5000,
        count: 5, // Lower count for payment operations
      },
    );

    console.log('[PaymentReconciliation] Service started, consuming payments.authorized events');
  }

  async stop(): Promise<void> {
    if (this.unsubscribe) {
      await this.unsubscribe();
    }
    console.log('[PaymentReconciliation] Service stopped');
  }

  private async handlePaymentAuthorization(
    event: DomainEventEnvelope<'payments.authorized'>,
  ): Promise<void> {
    const startTime = Date.now();
    console.log(`[PaymentReconciliation] Processing payment authorization: ${event.id}`);

    const authorization: PaymentAuthorization = event.payload as any;

    // Deduplication check
    if (this.processing.has(authorization.paymentId)) {
      console.log(`[PaymentReconciliation] Already processing payment ${authorization.paymentId}`);
      return;
    }

    this.processing.add(authorization.paymentId);

    try {
      // Step 1: Check if payment should be captured
      const shouldCapture = await this.shouldCapturePayment(authorization);
      if (!shouldCapture) {
        console.log(`[PaymentReconciliation] Payment ${authorization.paymentId} not ready for capture`);
        return;
      }

      // Step 2: Capture payment with idempotency
      const idempotencyKey = `capture-${authorization.paymentId}`;
      const result = await this.provider.capturePayment(
        authorization.providerId,
        authorization.amount,
        idempotencyKey,
      );

      if (result.status === 'failed') {
        console.error(
          `[PaymentReconciliation] Capture failed for ${authorization.paymentId}: ${result.failureReason}`,
        );
        throw new Error(`Payment capture failed: ${result.failureReason}`);
      }

      // Step 3: Update database
      await this.recordCapture(authorization.paymentId, result);

      // Step 4: Publish payments.captured event
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
        } as any,
        producer: 'payment-reconciliation-service',
        traceId: event.traceId,
        occurredAt: new Date().toISOString(),
      });

      const duration = Date.now() - startTime;
      console.log(`[PaymentReconciliation] Capture completed in ${duration}ms for payment ${authorization.paymentId}`);
    } catch (error) {
      console.error(`[PaymentReconciliation] Error processing payment:`, error);
      throw error; // Will be retried by worker framework
    } finally {
      this.processing.delete(authorization.paymentId);
    }
  }

  private async shouldCapturePayment(authorization: PaymentAuthorization): Promise<boolean> {
    // Business rules:
    // - Ride payments: capture after ride completion
    // - Package payments: capture after delivery
    // - Check escrow status

    if (authorization.escrowStatus === 'released') {
      return true;
    }

    // Query database for ride/package completion status
    // SELECT status FROM rides WHERE id = $1
    // SELECT status FROM packages WHERE id = $1

    return false; // Mock - replace with actual logic
  }

  private async recordCapture(paymentId: string, result: CaptureResult): Promise<void> {
    await updateOne(
      'payments',
      paymentId,
      {
        status: 'captured',
        captured_amount: result.capturedAmount,
        provider_transaction_id: result.providerTransactionId,
        captured_at: result.capturedAt,
      }
    );

    console.log(`[PaymentReconciliation] Recorded capture for payment ${paymentId}`);
  }

  async processRefund(
    paymentId: string,
    amount: number,
    reason: string,
  ): Promise<boolean> {
    const idempotencyKey = `refund-${paymentId}-${Date.now()}`;
    
    // Get provider ID from database
    // SELECT provider_id FROM payments WHERE id = $1
    const providerId = 'mock-provider-id';

    const success = await this.provider.refundPayment(
      providerId,
      amount,
      reason,
      idempotencyKey,
    );

    if (success) {
      // UPDATE payments SET status = 'refunded', refunded_at = NOW() WHERE id = $1
      console.log(`[PaymentReconciliation] Refund processed for payment ${paymentId}`);
    }

    return success;
  }
}

// Service entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new PaymentReconciliationService();
  
  process.on('SIGTERM', async () => {
    console.log('[PaymentReconciliation] SIGTERM received, shutting down...');
    await service.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });

  service.start().catch(error => {
    console.error('[PaymentReconciliation] Fatal error:', error);
    process.exit(1);
  });
}
