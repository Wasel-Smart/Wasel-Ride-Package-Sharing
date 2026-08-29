import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createWorker,
  type QueueMessage,
  type WorkerConfig,
} from '@/platform/worker-framework';
import type { BrokerHealth, BrokerMessage, BrokerMessageHandler, EventBroker } from '@/platform/event-broker';

class FakeBroker implements EventBroker {
  kind = 'memory' as const;
  private subs = new Map<string, Set<BrokerMessageHandler>>();
  private all = new Set<BrokerMessageHandler>();

  publish(m: BrokerMessage): void {
    this.deliver(m);
  }

  private deliver(m: BrokerMessage): void {
    this.subs.get(m.topic)?.forEach(h => void Promise.resolve(h(m)));
    this.all.forEach(h => void Promise.resolve(h(m)));
  }

  subscribe(topic: string, handler: BrokerMessageHandler): () => void {
    const group = this.subs.get(topic) ?? new Set<BrokerMessageHandler>();
    group.add(handler);
    this.subs.set(topic, group);
    return () => {
      group.delete(handler);
    };
  }

  subscribeAll(handler: BrokerMessageHandler): () => void {
    this.all.add(handler);
    return () => {
      this.all.delete(handler);
    };
  }

  async start(): Promise<void> {}
  async stop(): Promise<void> {}

  getHealth(): BrokerHealth {
    return {
      state: 'healthy',
      transport: 'none',
      pendingEvents: 0,
      processedEvents: 0,
      failedEvents: 0,
      lastEventAt: null,
      reconnectAttempts: 0,
    };
  }
}

function msg(topic: string): BrokerMessage {
  return {
    id: `m-${Math.random()}`,
    topic,
    payload: { value: 1 },
    producer: 'test',
    traceId: 'trace-1',
    occurredAt: new Date().toISOString(),
    attempts: 0,
  };
}

const config: WorkerConfig = {
  name: 'test-worker',
  topics: ['test.topic'],
  concurrency: 1,
  retryPolicy: { maxRetries: 2, backoffMs: 10 },
};

describe('worker-framework retry + dead letter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('processes a successful message once', async () => {
    const broker = new FakeBroker();
    const processor = vi.fn(async (_m: QueueMessage) => undefined);
    const worker = createWorker(config, processor, broker);
    await worker.start();

    broker.publish(msg('test.topic'));
    await vi.advanceTimersByTimeAsync(50);

    expect(processor).toHaveBeenCalledTimes(1);
    await worker.stop();
  });

  it('retries failed messages up to maxRetries then dead-letters', async () => {
    const broker = new FakeBroker();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const processor = vi.fn(async () => {
      throw new Error('boom');
    });
    const worker = createWorker(config, processor, broker);
    await worker.start();

    broker.publish(msg('test.topic'));
    await vi.advanceTimersByTimeAsync(2000);

    // initial attempt + 2 retries = 3
    expect(processor).toHaveBeenCalledTimes(3);

    const dlqCall = errorSpy.mock.calls.find(c =>
      c.some(arg =>
        typeof arg === 'string'
          ? arg.includes('dead letter')
          : JSON.stringify(arg).includes('dead letter'),
      ),
    );
    expect(dlqCall).toBeDefined();
    await worker.stop();
  });
});

describe('worker-framework topic routing', () => {
  it('ignores messages for topics it does not own', async () => {
    const broker = new FakeBroker();
    const processor = vi.fn(async () => undefined);
    const worker = createWorker(config, processor, broker);
    await worker.start();

    broker.publish(msg('other.topic'));
    await Promise.resolve();

    expect(processor).not.toHaveBeenCalled();
    await worker.stop();
  });
});
