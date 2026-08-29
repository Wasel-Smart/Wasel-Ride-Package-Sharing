/**
 * Production Worker Deployment
 *
 * Bridges the worker framework to the active event broker and implements the
 * five domain workers defined in the service topology:
 *   - matching-worker      (rides.requested)
 *   - package-worker       (packages.created, packages.location-updated)
 *   - payment-worker       (payments.authorized)
 *   - notification-worker  (rides.assigned, packages.delivered, notifications.dispatch)
 *   - ops-worker           (rides.completed, payments.captured)
 *
 * All handlers execute real Supabase operations and are resilient: when the
 * backend is unavailable they log and no-op rather than throwing, so the
 * worker pool stays healthy.
 *
 * ARCHITECTURE NOTE — in-browser workers
 * These workers currently run inside the browser bundle. This is intentional
 * for the current Jordan-market scale where Supabase Edge Functions handle the
 * critical server-side paths (matching, payments, notifications). The in-browser
 * workers act as a supplementary layer for same-session optimistic updates.
 *
 * Migration path to dedicated server-side workers:
 *   1. Extract each worker handler into a standalone Supabase Edge Function
 *      (see supabase/functions/matching-worker/ as the reference pattern).
 *   2. Replace the in-process `domainEventBus.publish()` calls with
 *      `SupabaseEventBroker.publish()` writes to the `event_outbox` table.
 *   3. Remove this file from the browser bundle once all handlers are
 *      confirmed live in the edge runtime.
 * Trigger: when ride-matching or payment-capture query latency exceeds SLO
 * targets defined in docs/reliability-slos.md.
 */

import {
  WorkerRegistry,
  createWorker,
  workerRegistry,
  type QueueMessage,
} from './worker-framework';
import { domainEventBus, createDomainEvent } from './event-bus';
import { isSupabaseConfigured, supabase } from '../utils/supabase/client';
import { notificationsAPI } from '../services/notifications';
import { trackGrowthEvent } from '../services/growthEngine';
import { telemetry } from './telemetry';
import { sanitizeLogMessage } from '../utils/sanitization';

type AnyRecord = Record<string, unknown>;

function ensureBackend(): boolean {
  if (!isSupabaseConfigured || !supabase) {
    telemetry.recordMetric('worker.backend_unavailable', 1, 'count');
    return false;
  }
  return true;
}

// ============================================================================
// MATCHING WORKER
// ============================================================================

interface RideMatchRequest {
  bookingId: string;
  rideId: string;
  routeMode: 'live_post' | 'network_inventory';
  origin: string;
  destination: string;
}

const matchingWorker = createWorker<RideMatchRequest>(
  {
    name: 'matching-worker',
    topics: ['rides.requested'],
    concurrency: 10,
    retryPolicy: { maxRetries: 5, backoffMs: 1000 },
    circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 60000 },
  },
  async (message: QueueMessage<RideMatchRequest>) => {
    if (!ensureBackend()) return;
    const client = supabase;
    if (!client) return;
    const { payload } = message;
    const startTime = Date.now();

    const { data: trip } = await client
      .from('trips')
      .select('trip_id, driver_id, trip_status, from_lat, from_lng, to_lat, to_lng')
      .eq('trip_id', payload.rideId)
      .maybeSingle();

    if (!trip) {
      console.warn('[matching-worker] trip not found', sanitizeLogMessage(payload.rideId));
      return;
    }

    const { data: driver } = await client
      .from('drivers')
      .select('driver_id, user_id')
      .eq('driver_status', 'online')
      .limit(1)
      .maybeSingle();

    if (!driver) {
      telemetry.recordMetric('matching.no_supply', 1, 'count');
      return;
    }

    await client
      .from('trips')
      .update({ driver_id: driver.driver_id, trip_status: 'booked' })
      .eq('trip_id', trip.trip_id);

    domainEventBus.publish(
      createDomainEvent(
        'DriverAssigned',
        {
          bookingId: payload.bookingId,
          rideId: payload.rideId,
          driverId: driver.driver_id,
          driverName: undefined,
        },
        'matching-worker',
        message.correlationId,
      ),
    );

    telemetry.recordSLO('matching-worker', 'ride-matching', Date.now() - startTime, true);
  },
);

// ============================================================================
// PACKAGE WORKER
// ============================================================================

const packageWorker = createWorker<AnyRecord>(
  {
    name: 'package-worker',
    topics: ['packages.created', 'packages.location-updated', 'packages.delivered'],
    concurrency: 15,
    retryPolicy: { maxRetries: 5, backoffMs: 1000 },
    circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 60000 },
  },
  async (message: QueueMessage<AnyRecord>) => {
    if (!ensureBackend()) return;
    const client = supabase;
    if (!client) return;
    const { topic, payload } = message;

    if (topic === 'packages.created') {
      const packageId = (payload.packageId as string) ?? (payload.id as string);
      if (!packageId) return;

      const { data: trip } = await client
        .from('trips')
        .select('id, trip_id, driver_id, allows_packages, trip_status')
        .eq('allows_packages', true)
        .eq('trip_status', 'open')
        .limit(1)
        .maybeSingle();

      if (!trip) {
        telemetry.recordMetric('package.no_trip', 1, 'count');
        return;
      }

      await client
        .from('packages')
        .update({
          trip_id: trip.trip_id ?? trip.id,
          carrier_id: trip.driver_id,
          package_status: 'assigned',
        })
        .eq('package_id', packageId);

      await client.from('package_events').insert({
        package_id: packageId,
        event_type: 'assignment',
        event_status: 'assigned',
        notes: JSON.stringify({ trip_id: trip.trip_id, driver_id: trip.driver_id }),
      });

      domainEventBus.publish(
        createDomainEvent(
          'PackageAssigned',
          {
            packageId,
            rideId: (trip.trip_id ?? trip.id) as string,
            driverId: trip.driver_id as string,
          },
          'package-worker',
          message.correlationId,
        ),
      );
    } else if (topic === 'packages.location-updated') {
      const packageId = payload.packageId as string;
      if (!packageId) return;

      await client.from('package_events').insert({
        package_id: packageId,
        event_type: 'location_update',
        event_status: 'ok',
        notes: JSON.stringify({
          latitude: payload.latitude,
          longitude: payload.longitude,
        }),
      });

      telemetry.recordMetric('package.location_update', 1, 'count', { packageId });
    } else if (topic === 'packages.delivered') {
      const packageId = payload.packageId as string;
      if (!packageId) return;

      await client
        .from('packages')
        .update({
          package_status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('package_id', packageId);

      await client.from('package_events').insert({
        package_id: packageId,
        event_type: 'delivery',
        event_status: 'delivered',
        notes: JSON.stringify({ deliveredAt: new Date().toISOString() }),
      });
    }
  },
);
    } else if (topic === 'packages.location-updated') {
      const packageId = payload.packageId as string;
      if (!packageId) return;

      await client.from('package_events').insert({
        package_id: packageId,
        event_type: 'location_update',
        event_status: 'ok',
        notes: JSON.stringify({
          latitude: payload.latitude,
          longitude: payload.longitude,
        }),
      });

      telemetry.recordMetric('package.location_update', 1, 'count', { packageId });
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
}

const paymentWorker = createWorker<PaymentAuthorization>(
  {
    name: 'payment-worker',
    topics: ['payments.authorized'],
    concurrency: 20,
    retryPolicy: { maxRetries: 5, backoffMs: 2000 },
    circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 120000 },
  },
  async (message: QueueMessage<PaymentAuthorization>) => {
    if (!ensureBackend()) return;
    const client = supabase;
    if (!client) return;
    const { payload } = message;
    const startTime = Date.now();

    // Capture/settle the authorized amount. The transaction row carries the
    // entity reference; mark it posted (released from hold).
    const { error } = await client
      .from('transactions')
      .update({ transaction_status: 'posted' })
      .eq('reference_id', payload.entityId)
      .eq('transaction_status', 'authorized');

    if (error) {
      throw new Error(`payment capture failed: ${error.message}`);
    }

    domainEventBus.publish(
      createDomainEvent(
        'PaymentCaptured',
        {
          entityId: payload.entityId,
          entityType: payload.entityType,
          amount: payload.amount,
        },
        'payment-worker',
        message.correlationId,
      ),
    );

    telemetry.recordSLO('payment-worker', 'payment-capture', Date.now() - startTime, true);
  },
);

// ============================================================================
// NOTIFICATION WORKER
// ============================================================================

interface NotificationDispatch {
  userId?: string;
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
}

const notificationWorker = createWorker<AnyRecord>(
  {
    name: 'notification-worker',
    topics: ['rides.assigned', 'rides.completed', 'packages.delivered', 'packages.cancelled', 'notifications.dispatch'],
    concurrency: 50,
    retryPolicy: { maxRetries: 8, backoffMs: 500 },
    circuitBreaker: { failureThreshold: 10, resetTimeoutMs: 60000 },
  },
  async (message: QueueMessage<AnyRecord>) => {
    const { topic, payload } = message;
    const startTime = Date.now();
    const client = supabase;

    if (topic === 'notifications.dispatch') {
      const dispatch = payload as unknown as NotificationDispatch;
      if (!dispatch.userId) return;
      await notificationsAPI.createNotification({
        title: dispatch.title,
        message: dispatch.message,
        type: dispatch.type,
        priority: dispatch.priority,
        action_url: dispatch.actionUrl,
      } as never);
    } else if (topic === 'rides.assigned') {
      if (!ensureBackend() || !client) return;
      const { data: booking } = await client
        .from('bookings')
        .select('passenger_id')
        .eq('booking_id', payload.bookingId as string)
        .maybeSingle();

      const userId = (booking?.passenger_id as string) ?? (payload.driverId as string);
      if (userId) {
        const { data: existing } = await client
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'booking')
          .eq('title', 'Driver assigned')
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
          .maybeSingle();
        if (existing) return;

        await notificationsAPI.createNotification({
          title: 'Driver assigned',
          message: `A driver has been assigned to your ride.`,
          type: 'booking',
          priority: 'high',
          action_url: '/app/my-trips?tab=rides',
        } as never);
      }
    } else if (topic === 'rides.completed') {
      if (!ensureBackend() || !client) return;
      const { data: booking } = await client
        .from('bookings')
        .select('passenger_id')
        .eq('booking_id', payload.bookingId as string)
        .maybeSingle();

      const userId = (booking?.passenger_id as string) ?? (payload.driverId as string);
      if (userId) {
        const { data: existing } = await client
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'booking')
          .eq('title', 'Ride Completed')
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
          .maybeSingle();
        if (existing) return;

        await notificationsAPI.createNotification({
          title: 'Ride Completed',
          message: 'Please rate your experience.',
          type: 'booking',
          priority: 'medium',
          action_url: '/app/my-trips?tab=rides',
        } as never);
      }
    } else if (topic === 'packages.delivered') {
      if (!ensureBackend() || !client) return;
      const { data: pkg } = await client
        .from('packages')
        .select('sender_id, receiver_id')
        .eq('package_id', payload.packageId as string)
        .maybeSingle();

      const recipients = [pkg?.sender_id, pkg?.receiver_id].filter(Boolean) as string[];
      const { data: existing } = await client
        .from('notifications')
        .select('id, user_id')
        .eq('type', 'booking')
        .eq('title', 'Package Delivered')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .maybeSingle();
      const existingUserIds = new Set([existing?.user_id].filter(Boolean) as string[]);

      await Promise.all(
        recipients.map(userId =>
          existingUserIds.has(userId)
            ? Promise.resolve()
            : notificationsAPI.createNotification({
                title: 'Package Delivered',
                message: 'Your package has been delivered successfully.',
                type: 'booking',
                priority: 'high',
              } as never),
        ),
      );
    } else if (topic === 'packages.cancelled') {
      if (!ensureBackend() || !client) return;
      const { data: pkg } = await client
        .from('packages')
        .select('sender_id, receiver_id')
        .eq('package_id', payload.packageId as string)
        .maybeSingle();

      const recipients = [pkg?.sender_id, pkg?.receiver_id].filter(Boolean) as string[];
      const reason = (payload as { reason?: string } | undefined)?.reason;
      const { data: existing } = await client
        .from('notifications')
        .select('id, user_id')
        .eq('type', 'booking')
        .eq('title', 'Package Cancelled')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .maybeSingle();
      const existingUserIds = new Set([existing?.user_id].filter(Boolean) as string[]);

      await Promise.all(
        recipients.map(userId =>
          existingUserIds.has(userId)
            ? Promise.resolve()
            : notificationsAPI.createNotification({
                title: 'Package Cancelled',
                message: `Your package has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
                type: 'booking',
                priority: 'medium',
              } as never),
        ),
      );
    }

    const latency = Date.now() - startTime;
    telemetry.recordSLO('notification-worker', 'dispatch', latency, true);
    telemetry.recordMetric('notification.sent', 1, 'count', { topic });
  },
);

// ============================================================================
// OPS WORKER (Analytics & Reporting)
// ============================================================================

const opsWorker = createWorker<AnyRecord>(
  {
    name: 'ops-worker',
    topics: ['rides.completed', 'payments.captured'],
    concurrency: 5,
    retryPolicy: { maxRetries: 3, backoffMs: 5000 },
  },
  async (message: QueueMessage<AnyRecord>) => {
    const { topic, payload } = message;

    if (topic === 'rides.completed') {
      await trackGrowthEvent({
        eventName: 'ride_completed',
        funnelStage: 'completed',
        serviceType: 'ride',
        metadata: payload as AnyRecord,
      });
    } else if (topic === 'payments.captured') {
      if (ensureBackend()) {
        const client = supabase;
        if (!client) return;
        const metricDate = new Date().toISOString().slice(0, 10);
        const amount = Number((payload as AnyRecord).amount ?? 0);
        const dimension = String((payload as AnyRecord).entityType ?? 'unknown');
        await client.rpc('increment_ops_aggregate', {
          p_metric_date: metricDate,
          p_metric_name: 'revenue_captured',
          p_dimension: dimension,
          p_delta_value: amount,
          p_delta_samples: 1,
        }).catch(() => {
          // Non-fatal: analytics aggregation failure should not block the worker.
        });
      }
    }

    telemetry.recordMetric('ops.analytics_updated', 1, 'count', { topic });
  },
);

// ============================================================================
// WORKER REGISTRY & LIFECYCLE
// ============================================================================

export const productionWorkerRegistry = new WorkerRegistry();

productionWorkerRegistry.register(matchingWorker);
productionWorkerRegistry.register(packageWorker);
productionWorkerRegistry.register(paymentWorker);
productionWorkerRegistry.register(notificationWorker);
productionWorkerRegistry.register(opsWorker);

export { matchingWorker, packageWorker, paymentWorker, notificationWorker, opsWorker };

export async function startProductionWorkers(): Promise<void> {
  await productionWorkerRegistry.startAll();
}

export async function stopProductionWorkers(): Promise<void> {
  await productionWorkerRegistry.stopAll();
}

// Keep the default registry in sync for callers that import `workerRegistry`.
for (const name of productionWorkerRegistry.list()) {
  const worker = productionWorkerRegistry.getWorker(name);
  if (worker) workerRegistry.register(worker);
}
