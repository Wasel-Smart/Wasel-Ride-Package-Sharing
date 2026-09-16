import { describe, it, expect } from 'vitest';
import { createDomainEvent, InMemoryDomainEventBus, domainEventBus } from '../event-bus';

describe('Event Bus', () => {
  it('creates an event envelope with all required fields', () => {
    const event = createDomainEvent(
      'RideRequested',
      { bookingId: 'b1', rideId: 'r1', origin: 'Amman', destination: 'Aqaba', routeMode: 'live_post' },
      'test-producer',
    );
    expect(event.id).toMatch(/^evt-/);
    expect(event.type).toBe('RideRequested');
    expect(event.producer).toBe('test-producer');
    expect(event.traceId).toMatch(/^trace-/);
    expect(event.occurredAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('publishes and delivers messages', async () => {
    const bus = new InMemoryDomainEventBus();
    const received: unknown[] = [];
    bus.subscribe('RideRequested', () => { received.push(1); });
    const event = createDomainEvent(
      'RideRequested',
      { bookingId: 'b1', rideId: 'r1', origin: 'Amman', destination: 'Aqaba', routeMode: 'live_post' },
      'test',
    );
    bus.publish(event);
    expect(received.length).toBe(1);
  });

  it('domainEventBus is a singleton', () => {
    expect(domainEventBus).toBeDefined();
    expect(typeof domainEventBus.subscribe).toBe('function');
    expect(typeof domainEventBus.publish).toBe('function');
  });

  it('stores event history', () => {
    const bus = new InMemoryDomainEventBus();
    bus.publish(createDomainEvent('RideRequested', { bookingId: 'b', rideId: 'r', origin: 'A', destination: 'B', routeMode: 'live_post' }, 't'));
    bus.publish(createDomainEvent('RideCompleted', { bookingId: 'b', rideId: 'r' }, 't'));
    const history = bus.getRecentEvents();
    expect(history.length).toBe(2);
  });
});