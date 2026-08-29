/**
 * Event Broker — Optimized Realtime Transport
 *
 * Improvements over v1:
 * - Adaptive polling: only activates when Realtime connection drops
 * - Batch processing: processes events in configurable batches
 * - Backpressure handling: prevents overwhelming slow consumers
 * - Connection health monitoring: tracks Realtime connection state
 * - Graceful degradation: seamless fallback from Realtime → polling
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEventEnvelope, DomainEventType } from '../domain/events';
import { EVENT_TYPE_TO_TOPIC, type QueueTopic } from './queue-contracts';
import { isSupabaseConfigured, supabase as defaultSupabase } from '../utils/supabase/client';
import { sanitizeLogMessage } from '../utils/sanitization';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  getHealth(): BrokerHealth;
}

export interface BrokerHealth {
  state: 'healthy' | 'degraded' | 'offline';
  transport: 'realtime' | 'polling' | 'none';
  pendingEvents: number;
  processedEvents: number;
  failedEvents: number;
  lastEventAt: string | null;
  reconnectAttempts: number;
}

// ─── Configuration ────────────────────────────────────────────────────────────

const CONFIG: {
  OUTBOX_TABLE: string;
  POLL_INTERVAL_MS: number;
  FAST_POLL_INTERVAL_MS: number;
  PROXY_RETRY_AFTER_MS: number;
  BATCH_SIZE: number;
  MAX_BATCH_SIZE: number;
  MAX_CONSECUTIVE_ERRORS: number;
  BACKPRESSURE_DELAY_MS: number;
  RECONNECT_BACKOFF_MS: number;
  MAX_RECONNECT_BACKOFF_MS: number;
} = {
  OUTBOX_TABLE: 'event_outbox',
  POLL_INTERVAL_MS: 30_000,
  FAST_POLL_INTERVAL_MS: 5_000,
  PROXY_RETRY_AFTER_MS: 120_000,
  BATCH_SIZE: 50,
  MAX_BATCH_SIZE: 100,
  MAX_CONSECUTIVE_ERRORS: 5,
  BACKPRESSURE_DELAY_MS: 100,
  RECONNECT_BACKOFF_MS: 1000,
  MAX_RECONNECT_BACKOFF_MS: 30_000,
};

// ─── Factory ─────────────────────────────────────────────────────────────────

function createBroker(): EventBroker {
  const brokerEnv =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env.VITE_EVENT_BROKER as string | undefined)) ||
    (typeof process !== 'undefined' && process.env.VITE_EVENT_BROKER);

  if (brokerEnv === 'memory') {
    console.info('[broker] using InMemoryEventBroker (explicit override)');
    return new InMemoryEventBroker();
  }

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
        'Set VITE_EVENT_BROKER=supabase to test the durable pipeline.',
      );
    }
    return new InMemoryEventBroker();
  }

  if (isSupabaseConfigured && defaultSupabase) {
    console.info('[broker] using SupabaseEventBroker (optimized)');
    return new OptimizedSupabaseEventBroker(defaultSupabase);
  }

  console.warn('[broker] Supabase not configured, falling back to InMemoryEventBroker');
  return new InMemoryEventBroker();
}

// ─── Proxy helpers ───────────────────────────────────────────────────────────

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

// ─── In-memory broker (default) ──────────────────────────────────────────────

class InMemoryEventBroker implements EventBroker {
  readonly kind = 'memory' as const;
  private listeners = new Map<string, Set<BrokerMessageHandler>>();
  private anyListeners = new Set<BrokerMessageHandler>();
  private processedCount = 0;

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
    this.processedCount++;
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

  getHealth(): BrokerHealth {
    return {
      state: 'healthy',
      transport: 'none',
      pendingEvents: 0,
      processedEvents: this.processedCount,
      failedEvents: 0,
      lastEventAt: null,
      reconnectAttempts: 0,
    };
  }
}

// ─── Optimized Supabase-backed durable broker ────────────────────────────────

class OptimizedSupabaseEventBroker implements EventBroker {
  readonly kind = 'supabase' as const;
  private client: SupabaseClient;
  private listeners = new Map<string, Set<BrokerMessageHandler>>();
  private anyListeners = new Set<BrokerMessageHandler>();
  private channel: ReturnType<SupabaseClient['channel']> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private processing = false;
  private stopped = false;
  private proxyAvailable = true;

  // Health tracking
  private health: BrokerHealth = {
    state: 'healthy',
    transport: 'polling',
    pendingEvents: 0,
    processedEvents: 0,
    failedEvents: 0,
    lastEventAt: null,
    reconnectAttempts: 0,
  };

  // Adaptive polling state
  private consecutiveErrors = 0;
  private currentPollInterval = CONFIG.POLL_INTERVAL_MS;
  private reconnectBackoff = CONFIG.RECONNECT_BACKOFF_MS;

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
        this.queueForRetry(message);
        return;
      }

      return;
    }

    this.queueForRetry(message);
  }

  private pendingRetries: BrokerMessage[] = [];

  private queueForRetry(message: BrokerMessage): void {
    this.pendingRetries.push(message);
    if (this.pendingRetries.length === 1) {
      this.scheduleRetryDrain();
    }
  }

  private scheduleRetryDrain(): void {
    setTimeout(() => {
      if (this.stopped) return;
      const batch = this.pendingRetries.splice(0, CONFIG.BATCH_SIZE);
      if (batch.length > 0) {
        void this.drainRetryQueue(batch).finally(() => {
          if (this.pendingRetries.length > 0) {
            this.scheduleRetryDrain();
          }
        });
      }
    }, CONFIG.PROXY_RETRY_AFTER_MS);
  }

  private async drainRetryQueue(messages: BrokerMessage[]): Promise<void> {
    for (const message of messages) {
      if (!this.proxyAvailable) {
        const result = await proxyFetch('/publish', {
          id: message.id,
          topic: message.topic,
          payload: message.payload,
          producer: message.producer,
          traceId: message.traceId,
          occurredAt: message.occurredAt,
          attempts: message.attempts,
        });
        if (result.ok) {
          this.proxyAvailable = true;
          continue;
        }
      }
      this.pendingRetries.push(message);
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

    // Start with polling as baseline, then upgrade to Realtime
    this.startPolling();
    await this.connectRealtime();
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
    this.stopPolling();
  }

  getHealth(): BrokerHealth {
    return { ...this.health };
  }

  // ── Realtime connection ───────────────────────────────────────────────────

  private async connectRealtime(): Promise<void> {
    if (this.stopped) return;

    try {
      const channelName = `outbox:${crypto.randomUUID().split('-')[0]}`;
      this.channel = this.client
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: CONFIG.OUTBOX_TABLE }, () => {
          void this.processPending();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.health.transport = 'realtime';
            this.health.state = 'healthy';
            this.health.reconnectAttempts = 0;
            this.reconnectBackoff = CONFIG.RECONNECT_BACKOFF_MS;
            this.stopPolling();
            if (import.meta.env.DEV) {
              console.info('[broker] Realtime connected — polling suspended');
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            this.handleRealtimeDrop();
          }
        });
    } catch (err) {
      console.warn('[broker] realtime subscribe failed, relying on polling', sanitizeLogMessage(err));
      this.handleRealtimeDrop();
    }
  }

  private handleRealtimeDrop(): void {
    this.health.transport = 'polling';
    this.health.state = 'degraded';
    this.health.reconnectAttempts++;
    this.startPolling();

    // Exponential backoff for reconnection attempts
    const backoff = Math.min(this.reconnectBackoff * this.health.reconnectAttempts, CONFIG.MAX_RECONNECT_BACKOFF_MS);
    setTimeout(() => {
      if (!this.stopped) {
        void this.connectRealtime();
      }
    }, backoff);
  }

  // ── Adaptive polling ─────────────────────────────────────────────────────

  private startPolling(): void {
    if (this.pollTimer) return;
    if (typeof setInterval === 'undefined') return;

    this.pollTimer = setInterval(() => {
      void this.processPending();
    }, this.currentPollInterval);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private adjustPollingRate(hasWork: boolean): void {
    if (hasWork && this.currentPollInterval > CONFIG.FAST_POLL_INTERVAL_MS) {
      // Speed up polling when there's work
      this.currentPollInterval = CONFIG.FAST_POLL_INTERVAL_MS;
      this.stopPolling();
      this.startPolling();
    } else if (!hasWork && this.currentPollInterval < CONFIG.POLL_INTERVAL_MS) {
      // Slow down polling when idle
      this.currentPollInterval = CONFIG.POLL_INTERVAL_MS;
      this.stopPolling();
      this.startPolling();
    }
  }

  // ── Event processing ─────────────────────────────────────────────────────

  private async processPending(): Promise<void> {
    if (this.processing || this.stopped) return;
    this.processing = true;

    try {
      if (!this.proxyAvailable) {
        this.consecutiveErrors++;
        this.checkHealth();
        return;
      }

      const pollResult = await proxyFetch('/poll', { limit: this.getBatchSize() });
      if (!pollResult.ok) {
        this.proxyAvailable = false;
        this.consecutiveErrors++;
        this.checkHealth();
        return;
      }

      const pollData = pollResult.data as Record<string, unknown> | undefined;
      if (!pollData) {
        this.consecutiveErrors++;
        this.checkHealth();
        return;
      }

      const rows = (pollData.events as Array<Record<string, unknown>>) ?? [];

      this.adjustPollingRate(rows.length > 0);

      // Process events
      for (const row of rows) {
        if (this.stopped) break;

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

        // Acknowledge or fail
        await this.acknowledgeEvent(message, delivered, attempts);

        if (delivered) {
          this.health.processedEvents++;
          this.health.lastEventAt = new Date().toISOString();
          this.consecutiveErrors = 0;
        } else {
          this.health.failedEvents++;
          this.consecutiveErrors++;
        }

        this.checkHealth();

        // Backpressure: yield to event loop between batches
        if (rows.length > 10) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.BACKPRESSURE_DELAY_MS));
        }
      }
    } catch (err) {
      console.error('[broker] processPending error', sanitizeLogMessage(err));
      this.consecutiveErrors++;
      this.checkHealth();
    } finally {
      this.processing = false;
    }
  }

  private getBatchSize(): number {
    // Scale batch size based on error rate
    if (this.consecutiveErrors > 2) {
      return Math.max(5, Math.floor(CONFIG.BATCH_SIZE / 2));
    }
    return CONFIG.BATCH_SIZE;
  }

  private async acknowledgeEvent(message: BrokerMessage, delivered: boolean, attempts: number): Promise<void> {
    if (!this.proxyAvailable) return;
    if (delivered) {
      await proxyFetch('/ack', { id: message.id });
    } else {
      const nextAttempts = attempts + 1;
      await proxyFetch('/fail', { id: message.id, attempts: nextAttempts });
    }
  }

  private async deliverLocally(message: BrokerMessage): Promise<void> {
    const handlers = this.listeners.get(message.topic);
    if (handlers) {
      for (const handler of handlers) {
        await handler(message);
      }
    }
    for (const handler of this.anyListeners) {
      await handler(message);
    }
  }

  private checkHealth(): void {
    if (this.consecutiveErrors >= CONFIG.MAX_CONSECUTIVE_ERRORS) {
      this.health.state = 'offline';
    } else if (this.consecutiveErrors > 0) {
      this.health.state = 'degraded';
    } else {
      this.health.state = this.health.transport === 'realtime' ? 'healthy' : 'degraded';
    }
  }
}

// ─── Singleton selection ──────────────────────────────────────────────────────

export const eventBroker: EventBroker = createBroker();

/**
 * Publishes a canonical domain event to the active broker.
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

export function getBrokerHealth(): BrokerHealth {
  return eventBroker.getHealth();
}
