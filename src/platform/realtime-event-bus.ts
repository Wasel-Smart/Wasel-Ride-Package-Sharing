/**
 * Supabase Realtime Event Bus
 *
 * Augments the in-memory DomainEventBus with a persistent broadcast layer:
 *  - Events are published to a Supabase Realtime broadcast channel so they
 *    survive page refreshes and reach all open tabs / devices.
 *  - Events are also persisted to the `domain_events` table (insert-only)
 *    for an audit trail and replay on reconnect.
 *  - The in-memory bus remains the synchronous, zero-latency path for the
 *    current tab; Realtime delivers to remote subscribers.
 *
 * Usage:
 *   import { realtimeEventBus } from './realtime-event-bus';
 *   realtimeEventBus.init(supabaseClient);
 *   realtimeEventBus.publish(event);
 *   const off = realtimeEventBus.subscribe('RideRequested', handler);
 */

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { DomainEventEnvelope, DomainEventType } from '../domain/events';
import { domainEventBus } from './event-bus';

type AnyListener = (event: DomainEventEnvelope) => void;

const REALTIME_CHANNEL = 'wasel:domain-events';
const EVENTS_TABLE = 'domain_events';

class SupabaseRealtimeEventBus {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private remoteListeners = new Map<DomainEventType, Set<AnyListener>>();
  private anyRemoteListeners = new Set<AnyListener>();
  private ready = false;

  /**
   * Attach a Supabase client and start listening on the broadcast channel.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  init(client: SupabaseClient): void {
    if (this.ready) return;
    this.client = client;
    this.ready = true;
    this._subscribe();
  }

  private _subscribe(): void {
    if (!this.client) return;

    this.channel = this.client
      .channel(REALTIME_CHANNEL, { config: { broadcast: { ack: false } } })
      .on<DomainEventEnvelope>(
        'broadcast',
        { event: 'domain_event' },
        ({ payload }) => {
          if (!payload || !payload.type) return;
          const envelope = payload as DomainEventEnvelope;

          // Forward to in-memory bus (for cross-tab delivery)
          domainEventBus.publish(envelope);

          // Notify Realtime-specific subscribers
          this.remoteListeners.get(envelope.type)?.forEach(l => l(envelope));
          this.anyRemoteListeners.forEach(l => l(envelope));
        },
      )
      .subscribe();
  }

  /**
   * Publish an event locally (in-memory bus) AND broadcast it via Realtime.
   * Also persists to the `domain_events` table if the client is available.
   */
  publish<TType extends DomainEventType>(event: DomainEventEnvelope<TType>): void {
    // 1. Local dispatch — synchronous, zero latency
    domainEventBus.publish(event);

    // 2. Realtime broadcast — async, reaches other tabs / devices
    void this.channel?.send({
      type: 'broadcast',
      event: 'domain_event',
      payload: event as unknown as Record<string, unknown>,
    });

    // 3. Persist to database — insert-only audit trail
    if (this.client) {
      void this.client
        .from(EVENTS_TABLE)
        .insert({
          id: event.id,
          event_type: event.type,
          payload: event.payload as unknown as Record<string, unknown>,
          producer: event.producer,
          trace_id: event.traceId,
          occurred_at: event.occurredAt,
          channel: REALTIME_CHANNEL,
        })
        .then(({ error }) => {
          if (error && import.meta.env.DEV) {
            // Non-fatal — the table may not exist in all environments yet.
            // See docs/architecture.md for the migration that adds it.
            console.debug('[RealtimeEventBus] persist skipped:', error.message);
          }
        });
    }
  }

  /**
   * Subscribe to a specific event type arriving from OTHER tabs / devices.
   * For same-tab events use domainEventBus.subscribe instead.
   */
  subscribeRemote<TType extends DomainEventType>(
    type: TType,
    listener: (event: DomainEventEnvelope<TType>) => void,
  ): () => void {
    const group = this.remoteListeners.get(type) ?? new Set<AnyListener>();
    group.add(listener as AnyListener);
    this.remoteListeners.set(type, group);
    return () => group.delete(listener as AnyListener);
  }

  subscribeAllRemote(listener: AnyListener): () => void {
    this.anyRemoteListeners.add(listener);
    return () => this.anyRemoteListeners.delete(listener);
  }

  /**
   * Replay recent events from the database on reconnect or cold start.
   * Returns up to `limit` events in ascending chronological order.
   */
  async replayRecent(limit = 50): Promise<DomainEventEnvelope[]> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from(EVENTS_TABLE)
      .select('id, event_type, payload, producer, trace_id, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error || !Array.isArray(data)) return [];

    return (data as Array<Record<string, unknown>>)
      .map(row => ({
        id: String(row.id ?? ''),
        type: String(row.event_type ?? '') as DomainEventType,
        payload: (row.payload ?? {}) as DomainEventEnvelope['payload'],
        producer: String(row.producer ?? ''),
        traceId: String(row.trace_id ?? ''),
        occurredAt: String(row.occurred_at ?? ''),
      }))
      .reverse(); // oldest first
  }

  teardown(): void {
    this.channel?.unsubscribe();
    this.channel = null;
    this.ready = false;
    this.client = null;
  }
}

export const realtimeEventBus = new SupabaseRealtimeEventBus();
