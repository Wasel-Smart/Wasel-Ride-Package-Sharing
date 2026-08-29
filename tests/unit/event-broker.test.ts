import { describe, it, expect, beforeEach } from 'vitest';
import {
  eventBroker,
  publishDomainEvent,
  type BrokerMessage,
} from '@/platform/event-broker';
import type { DomainEventEnvelope } from '@/domain/events';

function makeMessage(topic: string, payload: unknown): BrokerMessage {
  return {
    id: `m-${Math.random()}`,
    topic,
    payload,
    producer: 'test',
    traceId: 'trace-1',
    occurredAt: new Date().toISOString(),
    attempts: 0,
  };
}

describe('InMemoryEventBroker', () => {
  beforeEach(() => {
    // Default singleton is in-memory unless VITE_EVENT_BROKER=supabase.
    expect(eventBroker.kind).toBe('memory');
  });

  it('delivers published messages to topic subscribers', () => {
    const received: unknown[] = [];
    const unsub = eventBroker.subscribe('rides.requested', m => {
      received.push(m.payload);
    });

    eventBroker.publish(makeMessage('rides.requested', { bookingId: 'b1' }));

    expect(received).toHaveLength(1);
    expect((received[0] as { bookingId: string }).bookingId).toBe('b1');
    unsub();
  });

  it('delivers to subscribeAll handlers', () => {
    const all: string[] = [];
    const unsub = eventBroker.subscribeAll(m => {
      all.push(m.topic);
    });
    eventBroker.publish(makeMessage('payments.authorized', {}));
    expect(all).toContain('payments.authorized');
    unsub();
  });
});

describe('publishDomainEvent topic mapping', () => {
  it('forwards a mapped domain event to the worker topic', () => {
    const received: BrokerMessage[] = [];
    const unsub = eventBroker.subscribe('rides.requested', m => {
      received.push(m);
    });

    const event = {
      id: 'evt-1',
      type: 'RideRequested',
      occurredAt: new Date().toISOString(),
      traceId: 'trace-x',
      producer: 'ride-matching-service',
      payload: { bookingId: 'b1', rideId: 'r1', routeMode: 'live_post', origin: 'A', destination: 'B' },
    } as unknown as DomainEventEnvelope;

    publishDomainEvent(event);

    expect(received).toHaveLength(1);
    expect((received[0] as BrokerMessage).topic).toBe('rides.requested');
    expect((received[0] as BrokerMessage).traceId).toBe('trace-x');
    unsub();
  });

  it('does not forward events without a worker topic', () => {
    const received: BrokerMessage[] = [];
    const unsub = eventBroker.subscribeAll(m => {
      received.push(m);
    });

    const event = {
      id: 'evt-2',
      type: 'DriverAvailabilityChanged',
      occurredAt: new Date().toISOString(),
      traceId: 't',
      producer: 'x',
      payload: { driverId: 'd', previousStatus: 'offline', nextStatus: 'online' },
    } as unknown as DomainEventEnvelope;

    publishDomainEvent(event);
    expect(received).toHaveLength(0);
    unsub();
  });
});
