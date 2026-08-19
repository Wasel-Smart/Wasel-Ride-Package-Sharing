/**
 * Worker Framework
 *
 * Base framework for async queue processing. Implements retry, dead-letter,
 * and circuit-breaker patterns. Workers subscribe to the active `EventBroker`
 * (see ./event-broker) — no Redis or external infrastructure required.
 *
 * Dead letters are persisted to the `dead_letter_messages` Supabase table when
 * a broker is available, with an in-memory log fallback otherwise.
 */

import {
  eventBroker as defaultBroker,
  type BrokerMessage,
  type BrokerMessageHandler,
  type EventBroker,
} from './event-broker';
import { isSupabaseConfigured, supabase as defaultSupabase } from '../utils/supabase/client';
import { createStructuredLogEntry } from './observability';
import { telemetry } from './telemetry';
import { sanitizeLogMessage } from '../utils/sanitization';

function resolveWorkerSecret(): string | null {
  // The worker secret is a server-side credential and must never be inlined
  // into the browser bundle (import.meta.env.VITE_*). Only a Node/edge-server
  // context may supply it via process.env.
  try {
    if (typeof window !== 'undefined' || typeof import.meta === 'undefined') {
      return typeof process !== 'undefined' ? process.env.VITE_EVENT_BROKER_WORKER_SECRET ?? null : null;
    }
    return null;
  } catch {
    return null;
  }
}

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

async function proxyWriteDeadLetter(dlqPayload: Record<string, unknown>): Promise<boolean> {
  const baseUrl = resolveProxyBaseUrl();
  const secret = resolveWorkerSecret();

  if (!baseUrl || !secret) return false;

  try {
    const response = await fetch(`${baseUrl}/dead-letter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Broker-Secret': secret,
      },
      body: JSON.stringify(dlqPayload),
    });

    if (!response.ok) {
      console.warn('[dlq] proxy write failed', sanitizeLogMessage(await response.text().catch(() => 'unknown')));
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[dlq] proxy write threw', sanitizeLogMessage(err));
    return false;
  }
}

export interface QueueMessage<T = unknown> {
  id: string;
  topic: string;
  payload: T;
  timestamp: number;
  correlationId: string;
  retryCount: number;
  maxRetries: number;
}

export interface WorkerConfig {
  name: string;
  topics: string[];
  concurrency: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeoutMs: number;
  };
}

export abstract class BaseWorker<T = unknown> {
  protected config: WorkerConfig;
  protected isRunning = false;
  protected broker: EventBroker;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private unsubscribers: Array<() => void> = [];

  constructor(config: WorkerConfig, broker: EventBroker = defaultBroker) {
    this.config = config;
    this.broker = broker;
  }

  abstract process(message: QueueMessage<T>): Promise<void>;

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

      console.log(
        createStructuredLogEntry('info', `Worker ${sanitizeLogMessage(this.config.name)} started`, sanitizeLogMessage(this.config.name), {
          topics: this.config.topics,
          broker: this.broker.kind,
        }),
      );

    const handler: BrokerMessageHandler = message => {
      if (!this.isRunning) return;
      void this.handleMessage(this.toQueueMessage(message));
    };

    for (const topic of this.config.topics) {
      this.unsubscribers.push(this.broker.subscribe(topic, handler));
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    console.log(
      createStructuredLogEntry('info', `Worker ${sanitizeLogMessage(this.config.name)} stopped`, sanitizeLogMessage(this.config.name)),
    );
  }

  private toQueueMessage(message: BrokerMessage): QueueMessage<T> {
    return {
      id: message.id,
      topic: message.topic,
      payload: message.payload as T,
      timestamp: Date.parse(message.occurredAt) || Date.now(),
      correlationId: message.traceId,
      retryCount: message.attempts,
      maxRetries: this.config.retryPolicy.maxRetries,
    };
  }

  protected async handleMessage(message: QueueMessage<T>): Promise<void> {
    const spanId = telemetry.startSpan(`worker.${this.config.name}.process`, {
      topic: message.topic,
      messageId: message.id,
    });

    const startTime = Date.now();

    try {
      if (this.circuitBreakerState === 'open') {
        if (
          this.config.circuitBreaker &&
          Date.now() - this.lastFailureTime > this.config.circuitBreaker.resetTimeoutMs
        ) {
          this.circuitBreakerState = 'half-open';
        } else {
          throw new Error('Circuit breaker is open');
        }
      }

      await this.process(message);

      telemetry.recordSLO(this.config.name, 'process', Date.now() - startTime, true);
      telemetry.endSpan(spanId, 'ok');

      if (this.circuitBreakerState === 'half-open') {
        this.circuitBreakerState = 'closed';
        this.failureCount = 0;
      }
    } catch (error) {
      telemetry.endSpan(spanId, 'error');
      telemetry.recordSLO(this.config.name, 'process', Date.now() - startTime, false);

      console.error(
        createStructuredLogEntry(
          'error',
          `Worker ${sanitizeLogMessage(this.config.name)} failed to process message`,
          sanitizeLogMessage(this.config.name),
          {
            error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
            messageId: message.id,
            topic: message.topic,
            retryCount: message.retryCount,
          },
          message.correlationId,
        ),
      );

      if (this.config.circuitBreaker) {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.config.circuitBreaker.failureThreshold) {
          this.circuitBreakerState = 'open';
          console.error(
            createStructuredLogEntry(
              'error',
              `Circuit breaker opened for ${sanitizeLogMessage(this.config.name)}`,
              sanitizeLogMessage(this.config.name),
            ),
          );
        }
      }

      if (message.retryCount < message.maxRetries) {
        this.scheduleRetry(message);
      } else {
        await this.sendToDeadLetter(message, error);
      }
    }
  }

  protected scheduleRetry(message: QueueMessage<T>): void {
    const retryDelay = this.config.retryPolicy.backoffMs * Math.pow(2, message.retryCount);

    setTimeout(() => {
      void this.handleMessage({
        ...message,
        retryCount: message.retryCount + 1,
      });
    }, retryDelay);
  }

  protected async sendToDeadLetter(message: QueueMessage<T>, error: unknown): Promise<void> {
    const dlqPayload = {
      original_id: message.id,
      original_topic: message.topic,
      payload: message.payload as never,
      error: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
      retry_count: message.retryCount,
      trace_id: message.correlationId,
      worker: this.config.name,
    };

    console.error(
      createStructuredLogEntry(
        'error',
        'Message sent to dead letter queue',
        sanitizeLogMessage(this.config.name),
        {
          messageId: message.id,
          topic: message.topic,
          error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
        },
        message.correlationId,
      ),
    );

    telemetry.recordMetric('worker.dead_letter', 1, 'count', {
      worker: this.config.name,
      topic: message.topic,
    });

    const proxyOk = await proxyWriteDeadLetter(dlqPayload);
    if (proxyOk) return;

    if (isSupabaseConfigured && defaultSupabase) {
      void Promise.resolve(defaultSupabase.from('dead_letter_messages').insert(dlqPayload))
        .then(({ error: insertError }) => {
          if (insertError) {
            console.error('[dlq] failed to persist dead letter', sanitizeLogMessage(insertError.message));
          }
        })
        .catch((dlqError: unknown) => {
          console.error('[dlq] persist threw', sanitizeLogMessage(dlqError));
        });
    }
  }
}

/**
 * Factory for creating broker-aware workers.
 */
export function createWorker<T>(
  config: WorkerConfig,
  processor: (message: QueueMessage<T>) => Promise<void>,
  broker: EventBroker = defaultBroker,
): BaseWorker<T> {
  return new (class extends BaseWorker<T> {
    async process(message: QueueMessage<T>): Promise<void> {
      await processor(message);
    }
  })(config, broker);
}

/**
 * Worker registry for managing multiple workers.
 */
export class WorkerRegistry {
  private workers: Map<string, BaseWorker> = new Map();

  register(worker: BaseWorker): void {
    this.workers.set(worker['config'].name, worker);
  }

  async startAll(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.start();
    }
  }

  async stopAll(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.stop();
    }
  }

  getWorker(name: string): BaseWorker | undefined {
    return this.workers.get(name);
  }

  list(): string[] {
    return Array.from(this.workers.keys());
  }
}

export const workerRegistry = new WorkerRegistry();
