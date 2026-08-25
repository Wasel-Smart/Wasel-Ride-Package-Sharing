/**
 * Event Broker
 *
 * Pluggable transport for domain events. The app ships with two
 * implementations:
 *
 *  - `InMemoryEventBroker` — synchronous, in-process. Default and zero-config.
 *  - `SupabaseEventBroker` — durable outbox backed by Postgres. Events are
 *    persisted to `event_outbox`, delivered locally via Supabase Realtime, and
 *    re-processed by a polling fallback so async workers keep running even if a
 *    tab closes mid-flight. No Redis or external broker required.
 *
 * Swapping the transport is a single env flag (`VITE_EVENT_BROKER=supabase`);
 * producers and workers are unaware of which broker is active.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEventEnvelope, DomainEventType } from '../domain/events';
import { EVENT_TYPE_TO_TOPIC, type QueueTopic } from './queue-contracts';
import { isSupabaseConfigured, supabase as defaultSupabase } from '../utils/supabase/client';
import { sanitizeLogMessage } from '../utils/sanitization';

export interface BrokerMessage<T = unknown> {
  id: string;
  topic: string;
  payload: T;
  producer: string;
  traceId: string;
  occurredAt: string;
  attempts: number;
}

export type BrokerMessageHandler = (message: BrokerMessage) => void | Promise<void>;

export interface EventBroker {
  readonly kind: 'memory' | 'supabase';
  publish<T>(message: BrokerMessage<T>): void | Promise<void>;
  subscribe(topic: string, handler: BrokerMessageHandler): () => void;
  subscribeAll(handler: BrokerMessageHandler): () => void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

function createBroker(): EventBroker {
  const brokerEnv =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env.VITE_EVENT_BROKER as string | undefined)) ||
    (typeof process !== 'undefined' && process.env.VITE_EVENT_BROKER);

  if (brokerEnv === 'memory') {
    console.info('[broker] using InMemoryEventBroker (explicit override)');
    return new InMemoryEventBroker();
  }

  // In local dev, default to in-memory to avoid flooding the console with
  // 404s against event_outbox when the table hasn't been migrated yet.
  const isLocalDev =
    typeof window !== 'undefined' &&
    (() => {
      try {
        const { hostname, protocol } = new URL(window.location.origin);
        return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
      } catch {
        return false;
      }
    })();

  if (isLocalDev && brokerEnv !== 'supabase') {
    if (import.meta.env.DEV) {
      console.info(
        '[broker] local dev — using InMemoryEventBroker. ' +
        'Async workers (matching, payment, notification) are in-process only. ' +
        'Set VITE_EVENT_BROKER=supabase to test the durable pipeline.',
      );
    }
    return new InMemoryEventBroker();
  }

  if (isSupabaseConfigured && defaultSupabase) {
    console.info('[broker] using SupabaseEventBroker (default when Supabase is configured)');
    return new SupabaseEventBroker(defaultSupabase);
  }

  console.warn('[broker] Supabase not configured, falling back to InMemoryEventBroker');
  return new InMemoryEventBroker();
}

// ---------------------------------------------------------------------------
// Proxy helpers (used by SupabaseEventBroker and worker-framework)
// ---------------------------------------------------------------------------

function resolveProxyBaseUrl(): string | null {
  try {
    const direct =
      (typeof import.meta !== 'undefined' &&
        (import.meta.env.VITE_EVENT_BROKER_PROXY_URL as string | undefined)) ||
      (typeof process !== 'undefined' && process.env.VITE_EVENT_BROKER_PROXY_URL);
    if (direct && direct.trim()) return direct.trim().replace(/\/$/, '');

    const supabaseUrl =
      (typeof import.meta !== 'undefined' &&
        (import.meta.env.VITE_SUPABASE_URL as string | undefined)) ||
      (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL);
    if (supabaseUrl && supabaseUrl.trim()) {
      return `${supabaseUrl.trim().replace(/\/$/, '')}/functions/v1/event-broker-proxy`;
    }
  } catch {
    // ignore
  }
  return null;
}

function resolveWorkerSecret(): string | null {
  // The worker secret is a server-side credential. It must never be inlined
  // into the browser bundle (import.meta.env.VITE_*), so we deliberately do
  // not read it from the client. Only a Node/edge-server context may supply
  // it via process.env; in the browser this always resolves to null and the
  // event-broker falls back to the configured Supabase transport.
  try {
    if (typeof window !== 'undefined' || typeof import.meta === 'undefined') {
      return typeof process !== 'undefined' ? process.env.VITE_EVENT_BROKER_WORKER_SECRET ?? null : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function proxyFetch(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const baseUrl = resolveProxyBaseUrl();
  const secret = resolveWorkerSecret();

  if (!baseUrl || !secret) {
    return { ok: false, error: 'event-broker-proxy not configured' };
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Broker-Secret': secret,
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : {};

    if (!response.ok) {
      return {
        ok: false,
        error: (payload as Record<string, string>).error ?? `HTTP ${response.status}`,
      };
    }

    return { ok: true, data: payload };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Proxy request failed' };
  }
}

// ---------------------------------------------------------------------------
// In-memory broker (default)
// ---------------------------------------------------------------------------

class InMemoryEventBroker implements EventBroker {
  readonly kind = 'memory' as const;
  private listeners = new Map<string, Set<BrokerMessageHandler>>();
  private anyListeners = new Set<BrokerMessageHandler>();

  publish<T>(message: BrokerMessage<T>): void {
    this.deliver(message);
  }

  private deliver(message: BrokerMessage): void {
    this.listeners.get(message.topic)?.forEach(handler => {
      void Promise.resolve(handler(message)).catch(err =>
        console.error('[broker] handler error', sanitizeLogMessage(message.topic), sanitizeLogMessage(err)),
      );
    });
    this.anyListeners.forEach(handler => {
      void Promise.resolve(handler(message)).catch(err =>
        console.error('[broker] any-handler error', sanitizeLogMessage(err)),
      );
    });
  }

  subscribe(topic: string, handler: BrokerMessageHandler): () => void {
    const group = this.listeners.get(topic) ?? new Set<BrokerMessageHandler>();
    group.add(handler);
    this.listeners.set(topic, group);
    return () => {
      group.delete(handler);
    };
  }

  subscribeAll(handler: BrokerMessageHandler): () => void {
    this.anyListeners.add(handler);
    return () => {
      this.anyListeners.delete(handler);
    };
  }

  async start(): Promise<void> {}
  async stop(): Promise<void> {}
}

// ---------------------------------------------------------------------------
// Supabase-backed durable broker
// ---------------------------------------------------------------------------

const OUTBOX_TABLE = 'event_outbox';
const POLL_INTERVAL_MS = 30_000;
const PROXY_RETRY_AFTER_MS = 120_000;
const BATCH_SIZE = 50;

class SupabaseEventBroker implements EventBroker {
  readonly kind = 'supabase' as const;
  private client: SupabaseClient;
  private listeners = new Map<string, Set<BrokerMessageHandler>>();
  private anyListeners = new Set<BrokerMessageHandler>();
  private channel: ReturnType<SupabaseClient['channel']> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private processing = false;
  private stopped = false;
  private proxyAvailable = true;
  private proxyRetryAt = 0;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  publish<T>(message: BrokerMessage<T>): Promise<void> {
    return this.persist(message);
  }

  private async persist(message: BrokerMessage): Promise<void> {
    if (this.proxyAvailable) {
      const result = await proxyFetch('/publish', {
        id: message.id,
        topic: message.topic,
        payload: message.payload,
        producer: message.producer,
        traceId: message.traceId,
        occurredAt: message.occurredAt,
        attempts: message.attempts,
      });

      if (!result.ok) {
        this.proxyAvailable = false;
        this.proxyRetryAt = Date.now() + PROXY_RETRY_AFTER_MS;
        return this.persistDirect(message);
      }

      return;
    }

    return this.persistDirect(message);
  }

  private async persistDirect(message: BrokerMessage): Promise<void> {
    try {
      const { error } = await this.client.from(OUTBOX_TABLE).insert({
        id: message.id,
        topic: message.topic,
        payload: message.payload as never,
        producer: message.producer,
        trace_id: message.traceId,
        status: 'pending',
        attempts: message.attempts,
        created_at: message.occurredAt,
      });
      if (error) {
          console.error('[broker] failed to persist event', sanitizeLogMessage(message.topic), sanitizeLogMessage(error.message));
        }
    } catch (err) {
      console.error('[broker] persist threw', sanitizeLogMessage(message.topic), sanitizeLogMessage(err));
    }
  }

  subscribe(topic: string, handler: BrokerMessageHandler): () => void {
    const group = this.listeners.get(topic) ?? new Set<BrokerMessageHandler>();
    group.add(handler);
    this.listeners.set(topic, group);
    return () => {
      group.delete(handler);
    };
  }

  subscribeAll(handler: BrokerMessageHandler): () => void {
    this.anyListeners.add(handler);
    return () => {
      this.anyListeners.delete(handler);
    };
  }

  async start(): Promise<void> {
    if (this.stopped) return;

    const startPolling = () => {
      if (this.pollTimer) return;
      if (typeof setInterval === 'undefined') return;
      this.pollTimer = setInterval(() => {
        void this.processPending();
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    };

    try {
      this.channel = this.client
        .channel(`outbox:${crypto.randomUUID().split('-')[0]}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: OUTBOX_TABLE }, () => {
          void this.processPending();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            stopPolling();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            startPolling();
          }
        });
      stopPolling();
    } catch (err) {
      console.warn('[broker] realtime subscribe failed, relying on poll', sanitizeLogMessage(err));
      startPolling();
    }

    void this.processPending();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.channel) {
      try {
        this.client.removeChannel(this.channel);
      } catch {
        /* ignore */
      }
      this.channel = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async processPending(): Promise<void> {
    if (this.processing || this.stopped) return;
    this.processing = true;
    try {
      let rows: Array<Record<string, unknown>> = [];

      if (!this.proxyAvailable && Date.now() >= this.proxyRetryAt) {
        this.proxyAvailable = true;
      }

      if (this.proxyAvailable) {
        const pollResult = await proxyFetch('/poll', {});
        if (pollResult.ok && pollResult.data) {
          const pollData = pollResult.data as Record<string, unknown>;
          rows = (pollData.events as Array<Record<string, unknown>>) ?? [];
        } else {
          this.proxyAvailable = false;
          this.proxyRetryAt = Date.now() + PROXY_RETRY_AFTER_MS;
        }
      }

      if (!this.proxyAvailable) {
        const { data, error } = await this.client
          .from(OUTBOX_TABLE)
          .select('id, topic, payload, producer, trace_id, created_at, status, attempts')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(BATCH_SIZE);
        if (error) {
           const message = String(error.message ?? error);
           if (message.includes('does not exist') || message.includes('schema cache')) {
             if (import.meta.env.DEV) {
               console.warn('[broker] table missing, stopping poller', sanitizeLogMessage(message));
             }
             if (this.pollTimer) {
               clearInterval(this.pollTimer);
             }
             this.pollTimer = null;
           } else {
             console.warn('[broker] poll failed', sanitizeLogMessage(message));
           }
           return;
         }
        rows = (data as Array<Record<string, unknown>>) ?? [];
      }

      for (const row of rows) {
        const attempts = Number((row as Record<string, unknown>).attempts ?? 0);
        const message: BrokerMessage = {
          id: row.id as string,
          topic: row.topic as string,
          payload: (row.payload ?? {}) as unknown,
          producer: (row.producer as string) ?? 'unknown',
          traceId: (row.trace_id as string) ?? '',
          occurredAt: (row.created_at as string) ?? new Date().toISOString(),
          attempts,
        };

        let delivered = false;
        try {
          await this.deliverLocally(message);
          delivered = true;
        } catch (deliverErr) {
          console.error('[broker] handler error for', sanitizeLogMessage(message.topic), sanitizeLogMessage(deliverErr));
        }

        if (delivered) {
          if (this.proxyAvailable) {
            await proxyFetch('/ack', { id: message.id });
          } else {
            await this.client
              .from(OUTBOX_TABLE)
              .update({ status: 'processed', processed_at: new Date().toISOString() })
              .eq('id', message.id)
              .eq('status', 'pending')
              .then(({ error: updateErr }) => {
                if (updateErr) {
                  console.warn('[broker] failed to mark processed', sanitizeLogMessage(message.id), sanitizeLogMessage(updateErr.message));
                }
              });
          }
        } else {
          const nextAttempts = attempts + 1;
          const nextStatus = nextAttempts >= 5 ? 'failed' : 'pending';

          if (this.proxyAvailable) {
            await proxyFetch('/fail', { id: message.id, attempts: nextAttempts });
          } else {
            await this.client
              .from(OUTBOX_TABLE)
              .update({ attempts: nextAttempts, status: nextStatus })
              .eq('id', message.id)
              .then(({ error: updateErr }) => {
                if (updateErr) {
                  console.warn('[broker] failed to update attempts', sanitizeLogMessage(message.id), sanitizeLogMessage(updateErr.message));
                }
              });
          }
        }
      }
    } catch (err) {
      console.error('[broker] processPending error', sanitizeLogMessage(err));
    } finally {
      this.processing = false;
    }
  }

  private async deliverLocally(message: BrokerMessage): Promise<void> {
    const handlers = this.listeners.get(message.topic);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (err) {
          console.error('[broker] handler error', sanitizeLogMessage(message.topic), sanitizeLogMessage(err));
        }
      }
    }
    for (const handler of this.anyListeners) {
      try {
        await handler(message);
      } catch (err) {
        console.error('[broker] any-handler error', sanitizeLogMessage(err));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton selection
// ---------------------------------------------------------------------------

export const eventBroker: EventBroker = createBroker();

/**
 * Publishes a canonical domain event to the active broker (when the event has
 * a mapped worker topic). Keeps producers decoupled from the transport.
 */
export function publishDomainEvent(event: DomainEventEnvelope): void {
  const topic = EVENT_TYPE_TO_TOPIC[event.type as DomainEventType];
  if (!topic) return;
  void eventBroker.publish({
    id: event.id,
    topic: topic as QueueTopic,
    payload: event.payload,
    producer: event.producer,
    traceId: event.traceId,
    occurredAt: event.occurredAt,
    attempts: 0,
  });
}

export function startEventBroker(): Promise<void> {
  return eventBroker.start();
}

export function stopEventBroker(): Promise<void> {
  return eventBroker.stop();
}
