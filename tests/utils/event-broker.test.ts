import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  InMemoryEventBroker,
  type BrokerMessage,
} from '@/platform/event-broker';

describe('InMemoryEventBroker', () => {
  let broker: InMemoryEventBroker;

  beforeEach(() => {
    broker = new InMemoryEventBroker();
  });

  afterEach(() => {
    broker.stop();
  });

  it('publishes and delivers messages to subscribers', async () => {
    const received: BrokerMessage[] = [];
    const message: BrokerMessage = {
      id: 'msg-1',
      topic: 'rides.requested',
      payload: { rideId: 'ride-1' },
      producer: 'test',
      traceId: 'trace-1',
      occurredAt: new Date().toISOString(),
      attempts: 0,
    };

    broker.subscribe('rides.requested', (msg) => {
      received.push(msg);
    });

    await broker.start();
    broker.publish(message);

    // Allow async delivery to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(received.length).toBe(1);
    expect(received[0]!.id).toBe('msg-1');
    expect(received[0]!.topic).toBe('rides.requested');
  });

  it('supports subscribeAll to catch every topic', async () => {
    const received: string[] = [];
    broker.subscribeAll((msg) => {
      received.push(msg.topic);
    });

    await broker.start();
    broker.publish({ id: 'a', topic: 'topic-a', payload: {}, producer: 't', traceId: 't', occurredAt: new Date().toISOString(), attempts: 0 });
    broker.publish({ id: 'b', topic: 'topic-b', payload: {}, producer: 't', traceId: 't', occurredAt: new Date().toISOString(), attempts: 0 });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(received).toContain('topic-a');
    expect(received).toContain('topic-b');
  });

  it('unsubscribe stops delivery', async () => {
    const received: string[] = [];
    const message: BrokerMessage = {
      id: 'msg-1', topic: 'topic-x', payload: {}, producer: 't',
      traceId: 't', occurredAt: new Date().toISOString(), attempts: 0,
    };

    const unsubscribe = broker.subscribe('topic-x', (msg) => {
      received.push(msg.topic);
    });

    await broker.start();
    broker.publish(message);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(received.length).toBe(1);

    unsubscribe();
    broker.publish(message);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(received.length).toBe(1); // no new deliveries
  });

  it('getHealth reports healthy state', () => {
    const health = broker.getHealth();
    expect(health.state).toBe('healthy');
    expect(health.transport).toBe('none');
    expect(health.pendingEvents).toBe(0);
  });
});
