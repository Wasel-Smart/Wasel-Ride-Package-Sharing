/**
 * Base worker framework for async queue processing
 * Implements retry, dead-letter, and circuit breaker patterns
 */

import { createStructuredLogEntry } from './observability';
import { telemetry } from './telemetry';

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
  protected isRunning: boolean = false;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;

  constructor(config: WorkerConfig) {
    this.config = config;
  }

  abstract process(message: QueueMessage<T>): Promise<void>;

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(
      createStructuredLogEntry(
        'info',
        `Worker ${this.config.name} started`,
        this.config.name,
        { topics: this.config.topics },
      ),
    );

    // Subscribe to topics
    for (const topic of this.config.topics) {
      this.subscribe(topic);
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log(
      createStructuredLogEntry('info', `Worker ${this.config.name} stopped`, this.config.name),
    );
  }

  protected async handleMessage(message: QueueMessage<T>): Promise<void> {
    const spanId = telemetry.startSpan(`worker.${this.config.name}.process`, {
      topic: message.topic,
      messageId: message.id,
    });

    const startTime = Date.now();

    try {
      // Check circuit breaker
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

      // Record success
      telemetry.recordSLO(this.config.name, 'process', Date.now() - startTime, true);
      telemetry.endSpan(spanId, 'ok');

      // Reset circuit breaker on success
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
          `Worker ${this.config.name} failed to process message`,
          this.config.name,
          {
            error: error instanceof Error ? error.message : String(error),
            messageId: message.id,
            topic: message.topic,
            retryCount: message.retryCount,
          },
          message.correlationId,
        ),
      );

      // Handle circuit breaker
      if (this.config.circuitBreaker) {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.config.circuitBreaker.failureThreshold) {
          this.circuitBreakerState = 'open';
          console.error(
            createStructuredLogEntry(
              'error',
              `Circuit breaker opened for ${this.config.name}`,
              this.config.name,
            ),
          );
        }
      }

      // Retry logic
      if (message.retryCount < message.maxRetries) {
        await this.scheduleRetry(message);
      } else {
        await this.sendToDeadLetter(message, error);
      }
    }
  }

  protected abstract subscribe(topic: string): void;

  protected async scheduleRetry(message: QueueMessage<T>): Promise<void> {
    const retryDelay =
      this.config.retryPolicy.backoffMs * Math.pow(2, message.retryCount); // Exponential backoff

    setTimeout(() => {
      this.handleMessage({
        ...message,
        retryCount: message.retryCount + 1,
      });
    }, retryDelay);
  }

  protected async sendToDeadLetter(message: QueueMessage<T>, error: unknown): Promise<void> {
    console.error(
      createStructuredLogEntry(
        'error',
        `Message sent to dead letter queue`,
        this.config.name,
        {
          messageId: message.id,
          topic: message.topic,
          error: error instanceof Error ? error.message : String(error),
        },
        message.correlationId,
      ),
    );

    telemetry.recordMetric('worker.dead_letter', 1, 'count', {
      worker: this.config.name,
      topic: message.topic,
    });

    // TODO: Send to actual dead-letter storage (Supabase table, S3, etc.)
  }
}

/**
 * In-memory worker implementation (development/staging)
 */
export class InMemoryWorker<T = unknown> extends BaseWorker<T> {
  private subscriptions: Map<string, Set<(message: QueueMessage<T>) => void>> = new Map();

  async process(message: QueueMessage<T>): Promise<void> {
    void message;
    // Override in subclass
    throw new Error('process() must be implemented');
  }

  protected subscribe(topic: string): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }

    const handler = (message: QueueMessage<T>) => {
      if (this.isRunning) {
        this.handleMessage(message);
      }
    };

    this.subscriptions.get(topic)!.add(handler);

    // Register with global event bus
    if (typeof window !== 'undefined') {
      (window as any).__WASEL_EVENT_BUS__?.subscribe(topic, handler);
    }
  }
}

/**
 * Factory for creating workers
 */
export function createWorker<T>(
  config: WorkerConfig,
  processor: (message: QueueMessage<T>) => Promise<void>,
): BaseWorker<T> {
  return new (class extends InMemoryWorker<T> {
    async process(message: QueueMessage<T>): Promise<void> {
      await processor(message);
    }
  })(config);
}

/**
 * Worker registry for managing multiple workers
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
}

export const workerRegistry = new WorkerRegistry();
