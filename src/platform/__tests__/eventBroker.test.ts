import { describe, it, expect } from 'vitest';
import { eventBroker, publishDomainEvent } from '../event-broker';
import { InMemoryEventBroker } from '../event-broker';

describe('Event Broker', () => {
  it('InMemoryEventBroker starts and stops without error', async () => {
    const broker = new InMemoryEventBroker();
    await broker.start();
    expect(broker.getHealth().state).toBe('healthy');
    await broker.stop();
  });

  it('InMemoryEventBroker processes published messages', async () => {
    const broker = new InMemoryEventBroker();
    const received: unknown[] = [];
    broker.subscribe('test', msg => { received.push(msg); });
    await broker.publish({ id: '1', topic: 'test', payload: { hello: true }, producer: 'test', traceId: 't1', occurredAt: new Date().toISOString(), attempts: 0 });
    expect(received.length).toBe(1);
    await broker.stop();
  });

  it('eventBroker singleton has valid kind', () => {
    expect(['memory', 'supabase']).toContain(eventBroker.kind);
  });

  it('publishDomainEvent does not throw for valid event', () => {
    expect(() => {
      void publishDomainEvent({
        id: 'evt-test',
        type: 'RideRequested',
        producer: 'test',
        traceId: 'trace-test',
        occurredAt: new Date().toISOString(),
        payload: { bookingId: 'b1', rideId: 'r1', origin: 'Amman', destination: 'Aqaba', routeMode: 'live_post' },
      });
    }).not.toThrow();
  });
});