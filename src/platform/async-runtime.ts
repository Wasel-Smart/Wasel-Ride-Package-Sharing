/**
 * Async Runtime
 *
 * Provides lightweight client-side utilities for cross-component communication
 * and server-side RPC calls. Production async workflows (matching, payments,
 * notifications) are handled server-side by the edge function; this module no
 * longer starts in-browser worker pools.
 */

import { eventBroker, type BrokerMessage } from './event-broker';
import { supabase } from '../utils/supabase/client';
import { sanitizeLogMessage } from '../utils/sanitization';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export interface TripMatchInput {
  alertId: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  requestedDate: string;
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
    throw new Error(`Failed to match trip: ${sanitizeLogMessage(error.message)}`);
  }

  return data as unknown as TripMatchResult;
}
