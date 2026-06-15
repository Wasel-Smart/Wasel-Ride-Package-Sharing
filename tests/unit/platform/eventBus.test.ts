import { describe, expect, it, vi } from 'vitest';
import { createDomainEvent, domainEventBus } from '../../../src/platform/event-bus';

describe('domain event bus', () => {
  it('publishes events to scoped subscribers and history', () => {
    const listener = vi.fn();
    const unsubscribe = domainEventBus.subscribe('RideRequested', listener);

    const event = createDomainEvent(
      'RideRequested',
      {
        bookingId: 'booking-1',
        rideId: 'ride-1',
        routeMode: 'live_post',
        origin: 'Amman',
        destination: 'Irbid',
      },
      'test-suite',
      'trace-test',
    );

    domainEventBus.publish(event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(domainEventBus.getRecentEvents()[0]?.type).toBe('RideRequested');

    unsubscribe();
  });
});
