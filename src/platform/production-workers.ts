/**
 * Production Worker Deployment Manager
 * Bridges worker framework to actual infrastructure (Kubernetes, Cloud Functions, etc.)
 */

import { WorkerRegistry, createWorker, type QueueMessage } from './worker-framework';
import { domainEventBus, eventBroker } from './event-bus';
import { telemetry } from './telemetry';

// ============================================================================
// MATCHING WORKER
// ============================================================================

interface RideMatchRequest {
  bookingId: string;
  rideId: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  passengers: number;
  departureTime: string;
}

const matchingWorker = createWorker<RideMatchRequest>(
  {
    name: 'matching-worker',
    topics: ['rides.requested'],
    concurrency: 10,
    retryPolicy: { maxRetries: 5, backoffMs: 1000 },
    circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 60000 },
  },
  async (message) => {
    const { payload } = message;
    const startTime = Date.now();

    // Find drivers via event bus in browser, or would connect to Redis Streams in Node
    if (typeof window !== 'undefined') {
      const nearbyDrivers = [
        { id: 'driver-1', name: 'Ahmed', distance: 2.5 },
        { id: 'driver-2', name: 'Mohammed', distance: 4.1 },
      ];

      if (nearbyDrivers.length === 0) {
        throw new Error('No drivers available in area');
      }

      const bestDriver = nearbyDrivers[0];
      if (!bestDriver) {
        throw new Error('No drivers available after ranking');
      }

      domainEventBus.publish({
        id: `evt-${Date.now()}`,
        type: 'DriverAssigned',
        occurredAt: new Date().toISOString(),
        traceId: message.correlationId,
        producer: 'matching-worker',
        payload: {
          bookingId: payload.bookingId,
          rideId: payload.rideId,
          driverId: bestDriver.id,
          driverName: bestDriver.name,
        },
      });

      telemetry.recordSLO('matching-worker', 'ride-matching', Date.now() - startTime, true);
    } else {
      // Node.js environment - connect to Redis Streams
      await eventBroker.subscribe('rides.requested', async (event) => {
        const rideEvent = event.payload as { rideId: string; origin: { lat: number; lng: number }; seats: number };
        // This would be handled by the backend ride-matching service
      }, { groupName: 'matching-worker', consumerName: `worker-${process.env.HOSTNAME ?? 'local'}` });
    }
  },
);

// ============================================================================
// PACKAGE WORKER
// ============================================================================

interface PackageRequest {
  packageId: string;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  size: 'small' | 'medium' | 'large';
  urgent: boolean;
}

const packageWorker = createWorker<PackageRequest>(
  {
    name: 'package-worker',
    topics: ['packages.created', 'packages.location-updated'],
    concurrency: 15,
    retryPolicy: { maxRetries: 5, backoffMs: 1000 },
    circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 60000 },
  },
  async (message) => {
    const { payload } = message;

    if (message.topic === 'packages.created') {
      // Mock courier finding (would be real DB query in backend)
      const couriers = [{ id: 'courier-1', currentRideId: 'ride-123' }];
      const courier = couriers[0];

      if (courier) {
        domainEventBus.publish({
          id: `evt-${Date.now()}`,
          type: 'PackageAssigned',
          occurredAt: new Date().toISOString(),
          traceId: message.correlationId,
          producer: 'package-worker',
          payload: {
            packageId: payload.packageId,
            rideId: courier.currentRideId,
            driverId: courier.id,
          },
        });
      }
    } else if (message.topic === 'packages.location-updated') {
      telemetry.recordMetric('package.location_update', 1, 'count', {
        packageId: payload.packageId,
      });
    }
  },
);

// ============================================================================
// PAYMENT WORKER
// ============================================================================

interface PaymentAuthorization {
  entityId: string;
  entityType: 'ride' | 'package';
  amount: number;
  currency: string;
  paymentMethod: string;
}

const paymentWorker = createWorker<PaymentAuthorization>(
  {
    name: 'payment-worker',
    topics: ['payments.authorized'],
    concurrency: 20,
    retryPolicy: { maxRetries: 5, backoffMs: 2000 },
    circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 120000 },
  },
  async (message) => {
    const { payload } = message;
    const startTime = Date.now();

    // Simulate payment capture (would be Stripe API in backend)
    const captured = true;

    if (captured) {
      domainEventBus.publish({
        id: `evt-${Date.now()}`,
        type: 'PaymentCaptured',
        occurredAt: new Date().toISOString(),
        traceId: message.correlationId,
        producer: 'payment-worker',
        payload: {
          entityId: payload.entityId,
          entityType: payload.entityType,
          amount: payload.amount,
        },
      });

      telemetry.recordSLO('payment-worker', 'payment-capture', Date.now() - startTime, true);
    }
  },
);

// ============================================================================
// NOTIFICATION WORKER
// ============================================================================

interface NotificationDispatch {
  userId: string;
  channel: 'push' | 'sms' | 'email' | 'whatsapp';
  template: string;
  data: Record<string, unknown>;
}

const notificationWorker = createWorker<NotificationDispatch>(
  {
    name: 'notification-worker',
    topics: ['rides.assigned', 'packages.delivered', 'notifications.dispatch'],
    concurrency: 50,
    retryPolicy: { maxRetries: 8, backoffMs: 500 },
    circuitBreaker: { failureThreshold: 10, resetTimeoutMs: 60000 },
  },
  async (message) => {
    const { payload } = message;
    const startTime = Date.now();

    // Route to appropriate channel (browser simulation)
    console.log(`Notification to ${payload.userId} via ${payload.channel}: ${payload.template}`);

    const latency = Date.now() - startTime;
    telemetry.recordSLO('notification-worker', 'dispatch', latency, true);
    telemetry.recordMetric('notification.sent', 1, 'count', { channel: payload.channel });
  },
);

// ============================================================================
// OPS WORKER (Analytics & Reporting)
// ============================================================================

interface RideCompletionEvent {
  bookingId: string;
  rideId: string;
  origin: string;
  destination: string;
  revenue: number;
  duration: number;
}

const opsWorker = createWorker<RideCompletionEvent>(
  {
    name: 'ops-worker',
    topics: ['rides.completed', 'payments.captured'],
    concurrency: 5,
    retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  },
  async (message) => {
    const { payload } = message;
    telemetry.recordMetric('ops.analytics_updated', 1, 'count');
  },
);

// ============================================================================
// WORKER REGISTRY & LIFECYCLE
// ============================================================================

export const productionWorkerRegistry = new WorkerRegistry();

// Register all workers
productionWorkerRegistry.register(matchingWorker);
productionWorkerRegistry.register(packageWorker);
productionWorkerRegistry.register(paymentWorker);
productionWorkerRegistry.register(notificationWorker);
productionWorkerRegistry.register(opsWorker);

// Export individual workers for testing
export { matchingWorker, packageWorker, paymentWorker, notificationWorker, opsWorker };

// Auto-start workers in production (Node.js environment only)
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  productionWorkerRegistry
    .startAll()
    .then(() => {
      console.log('✅ All production workers started successfully');
    })
    .catch((error) => {
      console.error('❌ Failed to start workers:', error);
      process.exit(1);
    });
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('⚠️ SIGTERM received, shutting down workers...');
    await productionWorkerRegistry.stopAll();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('⚠️ SIGINT received, shutting down workers...');
    await productionWorkerRegistry.stopAll();
    process.exit(0);
  });
}