import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BusRoute } from '@/modules/bus/bus.types';
import { getRouteStatus, getScheduleTimes, isExactRoute } from '@/features/bus/busPage.utils';

const route: BusRoute = {
  id: 'route-1',
  company: 'Wasel Transit',
  from: 'Amman',
  to: 'Aqaba',
  dep: '08:00',
  arr: '11:30',
  price: 12,
  seats: 4,
  duration: '3h 30m',
  pickupPoint: 'Amman station',
  dropoffPoint: 'Aqaba station',
  features: [],
  color: '#00aaff',
};

const colors = {
  cyan: '#00aaff',
  gold: '#ffcc00',
  green: '#00cc88',
};

describe('busPage.utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prefers an explicit departure schedule when available', () => {
    expect(getScheduleTimes({ ...route, departureTimes: ['07:30', '10:00'] })).toEqual([
      '07:30',
      '10:00',
    ]);
    expect(getScheduleTimes(route)).toEqual(['08:00']);
  });

  it('matches only the direct origin and destination pair', () => {
    expect(isExactRoute(route, 'Amman', 'Aqaba')).toBe(true);
    expect(isExactRoute(route, 'Aqaba', 'Amman')).toBe(false);
  });

  it('returns a scheduled state for future travel dates', () => {
    vi.setSystemTime(new Date(2026, 3, 27, 7, 50));

    expect(getRouteStatus(route, '2026-04-28', '2026-04-27', colors)).toEqual({
      label: 'Scheduled',
      detail: 'Published schedule',
      color: colors.cyan,
    });
  });

  it('returns a boarding status when a departure is close', () => {
    vi.setSystemTime(new Date(2026, 3, 27, 7, 50));

    expect(getRouteStatus(route, '2026-04-27', '2026-04-27', colors)).toEqual({
      label: 'Boarding soon',
      detail: '10 min to departure',
      color: colors.green,
    });
  });

  it('returns a closed state after the last departure', () => {
    vi.setSystemTime(new Date(2026, 3, 27, 22, 10));

    expect(getRouteStatus(route, '2026-04-27', '2026-04-27', colors)).toEqual({
      label: 'Closed today',
      detail: 'No more departures left today',
      color: colors.gold,
    });
  });
});
