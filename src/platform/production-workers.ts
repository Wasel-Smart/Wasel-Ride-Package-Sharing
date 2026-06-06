/**
 * Production Worker Deployment Manager
 * Bridges worker framework to actual infrastructure (Kubernetes, Cloud Functions, etc.)
 */

import { BaseWorker, WorkerRegistry, createWorker } from './worker-framework';
import { domainEventBus } from './event-bus';
import { telemetry } from './telemetry';
import { createStructuredLogEntry } from './observability';

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

    console.log(
      createStructuredLogEntry(
        'info',
        'Processing ride match request',
        'matching-worker',
        { bookingId: payload.bookingId, rideId: payload.rideId },
        message.correlationId,
      ),
    );

    // Simulate driver matching logic
    // In production, this would query PostGIS for nearby drivers
    const nearbyDrivers = await findNearbyDrivers(
      payload.origin.lat,
      payload.origin.lng,
      10, // 10km radius
    );

    if (nearbyDrivers.length === 0) {
      throw new Error('No drivers available in area');
    }

    // Score and rank drivers
    const bestDriver = nearbyDrivers[0];

    // Publish driver assignment event
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

    const latency = Date.now() - startTime;
    telemetry.recordSLO('matching-worker', 'ride-matching', latency, true);

    console.log(
      createStructuredLogEntry(
        'info',
        'Ride matched successfully',
        'matching-worker',
        {
          bookingId: payload.bookingId,
          driverId: bestDriver.id,
          latencyMs: latency,
        },
        message.correlationId,
      ),
    );
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
      // Assign package to available courier
      const couriers = await findAvailableCouriers(payload.pickup.lat, payload.pickup.lng, 15);

      if (couriers.length > 0) {
        domainEventBus.publish({
          id: `evt-${Date.now()}`,
          type: 'PackageAssigned',
          occurredAt: new Date().toISOString(),
          traceId: message.correlationId,
          producer: 'package-worker',
          payload: {
            packageId: payload.packageId,
            rideId: couriers[0].currentRideId,
            driverId: couriers[0].id,
          },
        });
      }
    } else if (message.topic === 'packages.location-updated') {
      // Track package location in real-time
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

    // Simulate payment capture (Stripe API call)
    const captured = await capturePayment(payload.entityId, payload.amount);

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

      const latency = Date.now() - startTime;
      telemetry.recordSLO('payment-worker', 'payment-capture', latency, true);
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

    // Route to appropriate channel
    switch (payload.channel) {
      case 'push':
        await sendPushNotification(payload.userId, payload.template, payload.data);
        break;
      case 'sms':
        await sendSMS(payload.userId, payload.template, payload.data);
        break;
      case 'email':
        await sendEmail(payload.userId, payload.template, payload.data);
        break;
      case 'whatsapp':
        await sendWhatsApp(payload.userId, payload.template, payload.data);
        break;
    }

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

    // Aggregate metrics for dashboards
    await updateCorridorAnalytics(payload.origin, payload.destination, payload.revenue);
    await updateRevenueMetrics(payload.revenue);

    telemetry.recordMetric('ops.analytics_updated', 1, 'count');
  },
);

// ============================================================================
// HELPER FUNCTIONS (Mock implementations)
// ============================================================================

async function findNearbyDrivers(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<Array<{ id: string; name: string; distance: number }>> {
  // In production: PostGIS query
  // SELECT * FROM drivers WHERE status = 'available' 
  // AND ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3 * 1000)
  return [
    { id: 'driver-1', name: 'Ahmed', distance: 2.5 },
    { id: 'driver-2', name: 'Mohammed', distance: 4.1 },
  ];
}

async function findAvailableCouriers(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<Array<{ id: string; currentRideId: string }>> {
  return [{ id: 'courier-1', currentRideId: 'ride-123' }];
}

async function capturePayment(entityId: string, amount: number): Promise<boolean> {
  // In production: Stripe API call
  // await stripe.paymentIntents.capture(paymentIntentId);
  return true;
}

async function sendPushNotification(
  userId: string,
  template: string,
  data: Record<string, unknown>,
): Promise<void> {
  console.log(`📱 Push notification to ${userId}: ${template}`);
}

async function sendSMS(
  userId: string,
  template: string,
  data: Record<string, unknown>,
): Promise<void> {
  console.log(`📨 SMS to ${userId}: ${template}`);
}

async function sendEmail(
  userId: string,
  template: string,
  data: Record<string, unknown>,
): Promise<void> {
  console.log(`📧 Email to ${userId}: ${template}`);
}

async function sendWhatsApp(
  userId: string,
  template: string,
  data: Record<string, unknown>,
): Promise<void> {
  console.log(`💬 WhatsApp to ${userId}: ${template}`);
}

async function updateCorridorAnalytics(
  origin: string,
  destination: string,
  revenue: number,
): Promise<void> {
  // Update analytics database
}

async function updateRevenueMetrics(revenue: number): Promise<void> {
  // Update revenue tracking
}

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

// Auto-start workers in production
if (import.meta.env.MODE === 'production' && typeof window === 'undefined') {
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
