/**
 * Async Runtime
 *
 * Single entry point that starts the durable event broker and the production
 * worker pool. Call `startAsyncRuntime()` once from the app bootstrap (browser
 * only) so domain events flow into the broker and are processed by workers.
 */

import { eventBroker, startEventBroker, stopEventBroker, type BrokerMessage } from './event-broker';
import { supabase } from '../utils/supabase/client';
import { sanitizeLogMessage } from '../utils/sanitization';
import { productionWorkerRegistry } from './production-workers';

let started = false;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export interface TripMatchInput {
  alertId: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  requestedDate: string; // YYYY-MM-DD
  seatsNeeded: number;
}

export interface TripMatchResult {
  matched: boolean;
  reason?: 'lock_not_acquired' | 'already_processed' | 'no_trip_found';
  trip_id?: string;
}

export interface NotificationDispatchInput {
  userId: string;
  title: string;
  message: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
}

/**
 * Publishes a notification dispatch to the broker. The notification-worker
 * consumes `notifications.dispatch` and persists the notification, so callers
 * fire-and-forget without blocking the request path.
 */
export function dispatchNotification(input: NotificationDispatchInput): void {
  const message: BrokerMessage = {
    id: makeId('ntf'),
    topic: 'notifications.dispatch',
    payload: input,
    producer: 'app',
    traceId: makeId('trace'),
    occurredAt: new Date().toISOString(),
    attempts: 0,
  };
  void eventBroker.publish(message);
}

/**
 * Finds a matching trip by calling the atomic PostgreSQL function `match_alert_atomic`.
 * This function represents a production-ready backend architecture for trip matching.
 * @param input The criteria for finding a matching trip.
 * @returns A Promise that resolves to a `TripMatchResult` indicating if a match was found and details.
 * @throws An error if the Supabase client is not configured or if the RPC call fails.
 */
/**
 * Finds a matching trip by calling the hardened, atomic PostgreSQL function.
 * This replaces the previous mock implementation and represents the new,
 * production-ready backend architecture.
 *
 * @returns A TripMatchResult indicating if a match was found.
 */
export async function findMatchingTrip(input: TripMatchInput): Promise<TripMatchResult> {
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  const { data, error } = await supabase.rpc('match_alert_atomic', {
    p_alert_id: input.alertId,
    p_origin_lat: input.originLat,
    p_origin_lng: input.originLng,
    p_destination_lat: input.destinationLat,
    p_destination_lng: input.destinationLng,
    p_requested_date: input.requestedDate,
    p_seats_needed: input.seatsNeeded,
  });

  if (error) {
    // error details are not logged to console in production
    throw new Error(`Failed to match trip: ${sanitizeLogMessage(error.message)}`);
  }

  return data as unknown as TripMatchResult;
}

export async function startAsyncRuntime(): Promise<void> {
  if (started || typeof window === 'undefined') return;
  started = true;
  try {
    await startEventBroker();
    await productionWorkerRegistry.startAll();
  } catch (error) {
    started = false;
    throw error;
  }
}

export async function stopAsyncRuntime(): Promise<void> {
  if (!started) return;
  started = false;
  try {
    await productionWorkerRegistry.stopAll();
    await stopEventBroker();
  } catch {
    // best-effort shutdown
  }
}
