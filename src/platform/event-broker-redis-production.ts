/**
 * Production Event Broker - Redis Streams Implementation
 * Real ioredis integration with durable event streaming
 */

import type { DomainEventEnvelope, DomainEventType } from '../domain/events';
import { telemetry } from './telemetry';
import Redis from 'ioredis';

type RedisCommandValue = string | number;
type RedisStreamEntry = [messageId: string, fields: string[]];
type RedisStreamReadResult = [streamKey: string, entries: RedisStreamEntry[]][];
type InMemoryEventHandler = (event: DomainEventEnvelope) => Promise<void>;

const MAX_DELIVERY_ATTEMPTS = Number(process.env.REDIS_STREAM_MAX_DELIVERY_ATTEMPTS ?? 5);
const PENDING_IDLE_MS = Number(process.env.REDIS_STREAM_PENDING_IDLE_MS ?? 60_000);

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
  maxlen?: number;
  approximate?: boolean;
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

class RedisStreamsBroker implements EventBrokerAdapter {
  private redis: Redis;
  private connected = false;
  private subscriptions = new Map<string, boolean>();

  constructor(private config: RedisStreamConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      tls: config.tls ? {} : undefined,
      maxRetriesPerRequest: config.maxRetries,
      retryStrategy: (times: number) => {
        if (times > config.maxRetries) return null;
        return Math.min(times * config.retryDelayMs, 5000);
      },
      enableReadyCheck: true,
      enableOfflineQueue: false,
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await this.redis.ping();
      this.connected = true;
      
      console.log('[EventBroker] Redis Streams connected:', {
        host: this.config.host,
        port: this.config.port,
      });
      
      telemetry.recordMetric('event_broker_connected', 1, { broker: 'redis-streams' });
    } catch (error) {
      telemetry.recordMetric('event_broker_connection_error', 1);
      throw new Error(`Failed to connect to Redis Streams: ${error}`, { cause: error });
    }
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
        schemaVersion: '1.0',
      };

      const args: RedisCommandValue[] = [streamKey];
      if (options.maxlen) {
        args.push('MAXLEN', options.approximate ? '~' : '=', options.maxlen);
      }
      args.push('*');
      
      for (const [key, value] of Object.entries(payload)) {
        args.push(key, String(value));
      }

      const xadd = this.redis.xadd.bind(this.redis) as (
        ...values: RedisCommandValue[]
      ) => Promise<string | null>;
      const messageId = await xadd(...args);
      
      const duration = Date.now() - startTime;
      telemetry.recordMetric('event_published', 1, {
        eventType: event.type,
        producer: event.producer,
        traceId: event.traceId,
      });
      telemetry.recordMetric('event_publish_latency', duration, { eventType: event.type });

      if (!messageId) {
        throw new Error(`Redis Streams did not return a message id for ${streamKey}`);
      }

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

    await this.createConsumerGroup(eventType, config.groupName);

    this.subscriptions.set(subKey, true);

    void this.runConsumer(streamKey, config, handler);

    telemetry.recordMetric('event_subscription_created', 1, {
      eventType,
      groupName: config.groupName,
      consumerName: config.consumerName,
    });

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
        await this.recoverPending(streamKey, config, handler);

        const xreadgroup = this.redis.xreadgroup.bind(this.redis) as (
          ...values: RedisCommandValue[]
        ) => Promise<RedisStreamReadResult | null>;
        const messages = await xreadgroup(
          'GROUP', config.groupName, config.consumerName,
          'BLOCK', config.blockMs || 5000,
          'COUNT', config.count || 10,
          'STREAMS', streamKey, '>'
        );

        if (messages && messages.length > 0) {
          for (const [, entries] of messages) {
            for (const [messageId, fields] of entries) {
              const event = this.deserializeEvent<TType>(fields);
              
              try {
                await handler(event);
                await this.ack(streamKey, config.groupName, messageId);
                
                telemetry.recordMetric('event_consumed', 1, {
                  eventType: event.type,
                  groupName: config.groupName,
                });
              } catch (error) {
                telemetry.recordMetric('event_handler_error', 1, {
                  eventType: event.type,
                  messageId,
                });
                await this.handleFailedMessage(streamKey, config.groupName, messageId, fields, error);
              }
            }
          }
        }
      } catch (error) {
        telemetry.recordMetric('consumer_loop_error', 1, {
          groupName: config.groupName,
          consumerName: config.consumerName,
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async recoverPending<TType extends DomainEventType>(
    streamKey: string,
    config: ConsumerConfig,
    handler: (event: DomainEventEnvelope<TType>) => Promise<void>,
  ): Promise<void> {
    const xpending = this.redis.xpending.bind(this.redis) as unknown as (
      ...values: RedisCommandValue[]
    ) => Promise<Array<[string, string, number, number]>>;
    const pending = await xpending(
      streamKey,
      config.groupName,
      'IDLE',
      PENDING_IDLE_MS,
      '-',
      '+',
      config.count ?? 10,
    );

    if (pending.length === 0) return;

    const messageIds = pending.map(([messageId]) => messageId);
    const xclaim = this.redis.xclaim.bind(this.redis) as (
      ...values: RedisCommandValue[]
    ) => Promise<RedisStreamEntry[]>;
    const claimed = await xclaim(
      streamKey,
      config.groupName,
      config.consumerName,
      PENDING_IDLE_MS,
      ...messageIds,
    );

    for (const [messageId, fields] of claimed) {
      const event = this.deserializeEvent<TType>(fields);

      try {
        await handler(event);
        await this.ack(streamKey, config.groupName, messageId);
        telemetry.recordMetric('event_pending_recovered', 1, {
          eventType: event.type,
          groupName: config.groupName,
        });
      } catch (error) {
        await this.handleFailedMessage(streamKey, config.groupName, messageId, fields, error);
      }
    }
  }

  private async handleFailedMessage(
    streamKey: string,
    groupName: string,
    messageId: string,
    fields: string[],
    error: unknown,
  ): Promise<void> {
    const event = this.deserializeEvent(fields);
    const deliveryCount = await this.getDeliveryCount(streamKey, groupName, messageId);

    if (deliveryCount < MAX_DELIVERY_ATTEMPTS) {
      telemetry.recordMetric('event_retry_scheduled', 1, {
        eventType: event.type,
        streamKey,
        groupName,
      });
      return;
    }

    const dlqKey = `${streamKey}:dlq`;
    const xadd = this.redis.xadd.bind(this.redis) as (
      ...values: RedisCommandValue[]
    ) => Promise<string | null>;
    await xadd(
      dlqKey,
      '*',
      'originalMessageId',
      messageId,
      'originalStream',
      streamKey,
      'groupName',
      groupName,
      'event',
      JSON.stringify(event),
      'error',
      error instanceof Error ? error.message : String(error),
      'failedAt',
      new Date().toISOString(),
    );
    await this.ack(streamKey, groupName, messageId);
    telemetry.recordMetric('event_moved_to_dlq', 1, {
      eventType: event.type,
      streamKey,
      groupName,
    });
  }

  private async getDeliveryCount(
    streamKey: string,
    groupName: string,
    messageId: string,
  ): Promise<number> {
    const xpending = this.redis.xpending.bind(this.redis) as unknown as (
      ...values: RedisCommandValue[]
    ) => Promise<Array<[string, string, number, number]>>;
    const rows = await xpending(streamKey, groupName, messageId, messageId, 1);
    return rows[0]?.[3] ?? 1;
  }

  async ack(streamKey: string, groupName: string, messageId: string): Promise<void> {
    try {
      await this.redis.xack(streamKey, groupName, messageId);
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
      const entries = await this.redis.xrevrange(streamKey, '+', '-', 'COUNT', count);
      return entries.map(([, fields]) => this.deserializeEvent(fields));
    } catch (error) {
      telemetry.recordMetric('history_fetch_error', 1);
      console.error('[EventBroker] History fetch error:', error);
      return [];
    }
  }

  async createConsumerGroup(eventType: DomainEventType, groupName: string): Promise<void> {
    const streamKey = this.getStreamKey(eventType);

    try {
      await this.redis.xgroup('CREATE', streamKey, groupName, '0', 'MKSTREAM');
      telemetry.recordMetric('consumer_group_created', 1, { eventType, groupName });
    } catch (error) {
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
      await this.redis.quit();
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

function createInMemoryBroker(): EventBrokerAdapter {
  const streams = new Map<string, DomainEventEnvelope[]>();
  const subscriptions = new Map<string, Set<InMemoryEventHandler>>();

  return {
    async publish(event, options) {
      const streamKey = `wasel:events:${event.type}`;
      const events = streams.get(streamKey) || [];
      events.unshift(event);
      
      if (options?.maxlen && events.length > options.maxlen) {
        events.length = options.maxlen;
      }
      
      streams.set(streamKey, events);

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

    async ack() {},

    async getHistory(eventType, count = 100) {
      const streamKey = `wasel:events:${eventType}`;
      const events = streams.get(streamKey) || [];
      return events.slice(0, count);
    },

    async createConsumerGroup() {},

    async disconnect() {
      streams.clear();
      subscriptions.clear();
    },
  };
}

export function createEventBroker(mode: 'production' | 'development'): EventBrokerAdapter {
  if (mode === 'production') {
    const config: RedisStreamConfig = {
      host: process.env.VITE_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.VITE_REDIS_PORT || process.env.REDIS_PORT || '6379'),
      password: process.env.VITE_REDIS_PASSWORD || process.env.REDIS_PASSWORD,
      tls: process.env.VITE_REDIS_TLS === 'true' || process.env.REDIS_TLS === 'true',
      maxRetries: 10,
      retryDelayMs: 1000,
    };

    return new RedisStreamsBroker(config);
  }

  return createInMemoryBroker();
}

export const eventBroker = createEventBroker(
  process.env.NODE_ENV === 'production' ? 'production' : 'development'
);
