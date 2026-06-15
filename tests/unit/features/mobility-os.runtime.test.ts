import { describe, expect, it } from 'vitest';
import { buildSeedCorridors, MobilityOSRuntime, PricingEngine } from '../../../src/features/mobility-os/runtime';

describe('Mobility OS runtime', () => {
  it('implements the mandatory pricing equations exactly', () => {
    const pricing = new PricingEngine();
    const corridor = buildSeedCorridors()[0]!;

    const seatsAvailable = pricing.getSeatAvailability(corridor);
    const cargoAvailable = pricing.getCargoAvailability(corridor);
    const utilization = pricing.getUtilization(corridor);
    const demandPressure = pricing.getDemandPressure(corridor);
    const dynamicSeatPrice = pricing.getDynamicPrice(corridor.base_price_seat, corridor);

    expect(seatsAvailable).toBe(corridor.seats_total - corridor.seats_booked);
    expect(cargoAvailable).toBe(corridor.cargo_total_kg - corridor.cargo_booked_kg);
    expect(utilization).toBe(
      (corridor.seats_booked + corridor.cargo_booked_kg) /
      (corridor.seats_total + corridor.cargo_total_kg),
    );
    expect(demandPressure).toBe(corridor.demand_index * (1 + utilization));
    expect(dynamicSeatPrice).toBe(corridor.base_price_seat * (1 + demandPressure * utilization));
  });

  it('processes a booking through the required event chain', () => {
    const runtime = new MobilityOSRuntime({
      seedCorridors: [buildSeedCorridors()[0]!],
    });

    const bookingId = runtime.createBooking({
      corridor_id: 'amman-irbid',
      type: 'seat',
      quantity: 2,
      timestamp: '2026-05-03T08:15:00.000Z',
    });

    const snapshot = runtime.getSnapshot();
    const internalSnapshot = runtime.getInternalSnapshot();
    const corridor = snapshot.corridors[0]!;
    const eventTypes = internalSnapshot.recent_events.map((event) => event.type);

    expect(bookingId).toMatch(/^booking-/);
    expect(corridor.corridor.seats_booked).toBe(31);
    expect(corridor.seats_available).toBe(13);
    expect('recent_events' in snapshot).toBe(false);
    expect(eventTypes).toEqual([
      'CorridorUpdated',
      'PriceRecalculated',
      'DemandUpdated',
      'CapacityUpdated',
      'BookingCreated',
    ]);
  });

  it('fails closed when capacity does not exist', () => {
    const runtime = new MobilityOSRuntime({
      seedCorridors: [buildSeedCorridors()[0]!],
    });

    expect(() =>
      runtime.createBooking({
        corridor_id: 'amman-irbid',
        type: 'seat',
        quantity: 999,
        timestamp: '2026-05-03T08:15:00.000Z',
      }),
    ).toThrow('Not enough seats remain on this corridor.');
  });
});
