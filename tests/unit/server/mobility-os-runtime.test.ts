import { describe, expect, it } from 'vitest';
import {
  advanceCorridorAfterBooking,
  buildMobilitySnapshot,
  getDemandPressure,
  getDynamicPrice,
  getSeatAvailability,
  getCargoAvailability,
  getUtilization,
  projectCorridor,
  type MobilityCorridorRow,
} from '../../../supabase/functions/make-server-0b1f4071/_shared/mobility-os-runtime';

const corridor: MobilityCorridorRow = {
  id: 'amman-irbid',
  origin: 'Amman',
  destination: 'Irbid',
  distance_km: 104,
  travel_time_min: 90,
  seats_total: 44,
  seats_booked: 29,
  cargo_total_kg: 160,
  cargo_booked_kg: 104,
  base_price_seat: 4.8,
  base_price_kg: 0.42,
  demand_index: 0.93,
  demand_history: [0.74, 0.82, 0.88, 0.91, 0.93],
  price_history: [5.12, 5.34, 5.62, 5.89, 6.02],
  updated_at: '2026-05-03T08:15:00.000Z',
};

describe('mobility os server runtime helpers', () => {
  it('uses the exact mandatory formulas', () => {
    expect(getSeatAvailability(corridor)).toBe(15);
    expect(getCargoAvailability(corridor)).toBe(56);

    const utilization = getUtilization(corridor);
    const demandPressure = getDemandPressure(corridor);
    const seatPrice = getDynamicPrice(corridor.base_price_seat, corridor);

    expect(utilization).toBe((29 + 104) / (44 + 160));
    expect(demandPressure).toBe(corridor.demand_index * (1 + utilization));
    expect(seatPrice).toBe(corridor.base_price_seat * (1 + demandPressure * utilization));
  });

  it('advances corridor state after a booking and appends history', () => {
    const updated = advanceCorridorAfterBooking({
      corridor,
      type: 'seat',
      quantity: 2,
      timestamp: '2026-05-03T08:16:00.000Z',
    });

    expect(updated.seats_booked).toBe(31);
    expect(updated.updated_at).toBe('2026-05-03T08:16:00.000Z');
    expect(updated.demand_history.at(-1)).toBe(updated.demand_index);
    expect(updated.price_history.length).toBeGreaterThan(corridor.price_history.length - 1);
  });

  it('builds a sorted projection snapshot', () => {
    const hotter = projectCorridor(corridor);
    const colder = projectCorridor({
      ...corridor,
      id: 'madaba-amman',
      origin: 'Madaba',
      destination: 'Amman',
      demand_index: 0.3,
      seats_booked: 3,
      cargo_booked_kg: 10,
    });

    const snapshot = buildMobilitySnapshot([colder.corridor, hotter.corridor], []);
    expect(snapshot.corridors[0].corridor.id).toBe('amman-irbid');
    expect(snapshot.metrics.hottest_corridor).toBe('Amman -> Irbid');
  });
});
