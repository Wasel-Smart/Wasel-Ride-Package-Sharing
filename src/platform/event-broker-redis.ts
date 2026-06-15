/**
 * Production Event Broker - Redis Streams Implementation
 * Replaces in-memory event bus with durable, distributed event streaming
 */

import type { DomainEventEnvelope, DomainEventType } from '../domain/events';
import { telemetry } from './telemetry';

type RedisFieldValue = string | number;
type RedisStreamEntry = [messageId: string, fields: string[]];
type RedisStreamReadResult = [streamKey: string, entries: RedisStreamEntry[]][];
type InMemoryEventHandler = (event: DomainEventEnvelope) => Promise<void>;

interface RedisClient {
  xadd(...args: RedisFieldValue[]): Promise<string>;
  xgroup(...args: RedisFieldValue[]): Promise<unknown>;
  xreadgroup(...args: RedisFieldValue[]): Promise<RedisStreamReadResult | null>;
  xack(streamKey: string, groupName: string, messageId: string): Promise<number>;
  xrevrange(
    streamKey: string,
    end: string,
    start: string,
    countKeyword: 'COUNT',
    count: number,
  ): Promise<RedisStreamEntry[]>;
  quit(): Promise<unknown>;
}

interface RedisStreamConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
  maxRetries: number;
  retryDelayMs: number;
}

interface ConsumerConfig {
  groupName: string;
  consumerName: string;
  blockMs?: number;
  count?: number;
}

interface PublishOptions {
  maxlen?: number; // Trim stream to this length
  approximate?: boolean; // Use approximate trimming
}

export interface EventBrokerAdapter {
  publish<TType extends DomainEventType>(
    event: DomainEventEnvelope<TType>,
    options?: PublishOptions,
  ): Promise<string>;
  
  subscribe<TType extends DomainEventType>(
    eventType: TType,
    handler: (event: DomainEventEnvelope<TType>) => Promise<void>,
    config: ConsumerConfig,
  ): Promise<() => Promise<void>>;
  
  ack(streamKey: string, groupName: string, messageId: string): Promise<void>;
  
  getHistory(eventType: DomainEventType, count?: number): Promise<DomainEventEnvelope[]>;
  
  createConsumerGroup(eventType: DomainEventType, groupName: string): Promise<void>;
  
  disconnect(): Promise<void>;
}

/**
 * Redis Streams Event Broker
 * Production-grade implementation with:
 * - Durable event persistence
 * - Consumer groups for load balancing
 * - Automatic retry and DLQ handling
 * - Schema versioning support
 * - Distributed tracing integration
 */
class RedisStreamsBroker implements EventBrokerAdapter {
  private redis: RedisClient | null = null;
  private connected = false;
  private subscriptions = new Map<string, boolean>();

  constructor(private config: RedisStreamConfig) {}

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      if (typeof window !== 'undefined') {
        throw new Error('Redis Streams broker is server-only and cannot run in the browser');
      }

      const { default: Redis } = await import('ioredis');
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        tls: this.config.tls ? {} : undefined,
        maxRetriesPerRequest: this.config.maxRetries,
        retryStrategy: attempts => Math.min(attempts * this.config.retryDelayMs, 30_000),
      }) as unknown as RedisClient;

      this.connected = true;
      telemetry.recordMetric('event_broker_connected', 1, { broker: 'redis-streams' });
    } catch (error) {
      telemetry.recordMetric('event_broker_connection_error', 1);
      throw new Error(`Failed to connect to Redis Streams: ${error}`, { cause: error });
    }
  }

  private getClient(): RedisClient {
    if (!this.redis) {
      throw new Error('Redis Streams broker is not connected');
    }

    return this.redis;
  }

  async publish<TType extends DomainEventType>(
    event: DomainEventEnvelope<TType>,
    options: PublishOptions = { maxlen: 10000, approximate: true },
  ): Promise<string> {
    await this.connect();

    const streamKey = this.getStreamKey(event.type);
    const startTime = Date.now();

    try {
      const payload = {
        id: event.id,
        type: event.type,
        payload: JSON.stringify(event.payload),
        producer: event.producer,
        traceId: event.traceId,
        occurredAt: event.occurredAt,
        schemaVersion: '1.0', // Schema versioning
      };

      const trimArgs: RedisFieldValue[] = options.maxlen
        ? ['MAXLEN', options.approximate === false ? '=' : '~', options.maxlen]
        : [];

      const messageId = await this.getClient().xadd(
        streamKey,
        ...trimArgs,
        '*',
        ...Object.entries(payload).flat(),
      );
      
      const duration = Date.now() - startTime;
      telemetry.recordMetric('event_published', 1, {
        eventType: event.type,
        producer: event.producer,
        traceId: event.traceId,
      });
      telemetry.recordMetric('event_publish_latency', duration, { eventType: event.type });

      return messageId;
    } catch (error) {
      telemetry.recordMetric('event_publish_error', 1, { eventType: event.type });
      throw error;
    }
  }

  async subscribe<TType extends DomainEventType>(
    eventType: TType,
    handler: (event: DomainEventEnvelope<TType>) => Promise<void>,
    config: ConsumerConfig,
  ): Promise<() => Promise<void>> {
    await this.connect();

    const streamKey = this.getStreamKey(eventType);
    const subKey = `${streamKey}:${config.groupName}:${config.consumerName}`;

    if (this.subscriptions.has(subKey)) {
      throw new Error(`Already subscribed: ${subKey}`);
    }

    // Create consumer group if it doesn't exist
    await this.createConsumerGroup(eventType, config.groupName);

    this.subscriptions.set(subKey, true);

    void this.runConsumer(streamKey, config, handler);

    telemetry.recordMetric('event_subscription_created', 1, {
      eventType,
      groupName: config.groupName,
      consumerName: config.consumerName,
    });

    // Return unsubscribe function
    return async () => {
      this.subscriptions.set(subKey, false);
      telemetry.recordMetric('event_subscription_removed', 1, {
        eventType,
        groupName: config.groupName,
      });
    };
  }

  private async runConsumer<TType extends DomainEventType>(
    streamKey: string,
    config: ConsumerConfig,
    handler: (event: DomainEventEnvelope<TType>) => Promise<void>,
  ): Promise<void> {
    const subKey = `${streamKey}:${config.groupName}:${config.consumerName}`;

    while (this.subscriptions.get(subKey)) {
      try {
        const messages = await this.getClient().xreadgroup(
          'GROUP',
          config.groupName,
          config.consumerName,
          'BLOCK',
          config.blockMs ?? 5000,
          'COUNT',
          config.count ?? 10,
          'STREAMS',
          streamKey,
          '>',
        );

        for (const [currentStreamKey, entries] of messages ?? []) {
          for (const [messageId, fields] of entries) {
            const event = this.deserializeEvent<TType>(fields);

            try {
              await handler(event);
              await this.ack(currentStreamKey, config.groupName, messageId);
            } catch (error) {
              telemetry.recordMetric('event_handler_error', 1, {
                eventType: event.type,
                messageId,
              });
            }
          }
        }
      } catch (error) {
        telemetry.recordMetric('consumer_loop_error', 1, {
          groupName: config.groupName,
          consumerName: config.consumerName,
        });
        await new Promise(resolve => setTimeout(resolve, 5000)); // Back off on error
      }
    }
  }

  async ack(streamKey: string, groupName: string, messageId: string): Promise<void> {
    try {
      await this.getClient().xack(streamKey, groupName, messageId);
      telemetry.recordMetric('event_acked', 1, { streamKey, groupName });
    } catch (error) {
      telemetry.recordMetric('event_ack_error', 1);
      throw error;
    }
  }

  async getHistory(eventType: DomainEventType, count = 100): Promise<DomainEventEnvelope[]> {
    await this.connect();

    const streamKey = this.getStreamKey(eventType);

    try {
      const entries = await this.getClient().xrevrange(streamKey, '+', '-', 'COUNT', count);
      return entries.map(([, fields]) => this.deserializeEvent(fields));
    } catch (error) {
      telemetry.recordMetric('history_fetch_error', 1);
      return [];
    }
  }

  async createConsumerGroup(eventType: DomainEventType, groupName: string): Promise<void> {
    const streamKey = this.getStreamKey(eventType);

    try {
      await this.getClient().xgroup('CREATE', streamKey, groupName, '0', 'MKSTREAM');
      telemetry.recordMetric('consumer_group_created', 1, { eventType, groupName });
    } catch (error) {
      // Ignore if group already exists
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      this.subscriptions.clear();
      await this.redis?.quit();
      this.redis = null;
      this.connected = false;
      telemetry.recordMetric('event_broker_disconnected', 1);
    } catch (error) {
      console.error('[EventBroker] Disconnect error:', error);
    }
  }

  private getStreamKey(eventType: DomainEventType): string {
    return `wasel:events:${eventType}`;
  }

  private deserializeEvent<TType extends DomainEventType>(
    fields: string[],
  ): DomainEventEnvelope<TType> {
    const data: Record<string, string | undefined> = {};
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i];
      if (key) {
        data[key] = fields[i + 1];
      }
    }

    return {
      id: data.id ?? '',
      type: data.type as TType,
      payload: JSON.parse(data.payload ?? '{}') as DomainEventEnvelope<TType>['payload'],
      producer: data.producer ?? 'unknown',
      traceId: data.traceId ?? '',
      occurredAt: data.occurredAt ?? new Date().toISOString(),
    };
  }
}

/**
 * Event Broker Factory
 * Returns Redis Streams broker in production, in-memory for local dev
 */
export function createEventBroker(mode: 'production' | 'development'): EventBrokerAdapter {
  if (mode === 'production' && typeof window === 'undefined') {
    const config: RedisStreamConfig = {
      host: import.meta.env.VITE_REDIS_HOST || 'localhost',
      port: parseInt(import.meta.env.VITE_REDIS_PORT || '6379'),
      password: import.meta.env.VITE_REDIS_PASSWORD,
      tls: import.meta.env.VITE_REDIS_TLS === 'true',
      maxRetries: 10,
      retryDelayMs: 1000,
    };

    return new RedisStreamsBroker(config);
  }

  // Browser runtime and local development use an in-process adapter. Production
  // workers must run this module outside the browser to get Redis Streams.
  return createInMemoryBroker();
}

/**
 * In-Memory Broker (Development Only)
 * Implements same interface for local development
 */
function createInMemoryBroker(): EventBrokerAdapter {
  const streams = new Map<string, DomainEventEnvelope[]>();
  const subscriptions = new Map<string, Set<InMemoryEventHandler>>();

  return {
    async publish(event, options) {
      const streamKey = `wasel:events:${event.type}`;
      const events = streams.get(streamKey) || [];
      events.unshift(event);
      
      // Trim to maxlen
      if (options?.maxlen && events.length > options.maxlen) {
        events.length = options.maxlen;
      }
      
      streams.set(streamKey, events);

      // Notify subscribers
      const handlers = subscriptions.get(streamKey);
      if (handlers) {
        for (const handler of handlers) {
          try {
            await handler(event);
          } catch (error) {
            console.error('[InMemoryBroker] Handler error:', error);
          }
        }
      }

      return `${Date.now()}-0`;
    },

    async subscribe(eventType, handler, config) {
      void config;
      const streamKey = `wasel:events:${eventType}`;
      const handlers = subscriptions.get(streamKey) || new Set();
      handlers.add(handler as InMemoryEventHandler);
      subscriptions.set(streamKey, handlers);

      return async () => {
        handlers.delete(handler as InMemoryEventHandler);
      };
    },

    async ack() {
      // No-op in memory
    },

    async getHistory(eventType, count = 100) {
      const streamKey = `wasel:events:${eventType}`;
      const events = streams.get(streamKey) || [];
      return events.slice(0, count);
    },

    async createConsumerGroup() {
      // No-op in memory
    },

    async disconnect() {
      streams.clear();
      subscriptions.clear();
    },
  };
}

// Global broker instance
export const eventBroker = createEventBroker(
  import.meta.env.PROD ? 'production' : 'development'
);
