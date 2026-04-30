import { describe, expect, it } from 'vitest';
import { parseFindRideParams } from '../../../src/pages/waselCorePageHelpers';

function localFutureDate(days = 1) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() + days);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function localPastDate(days = 1) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - days);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

describe('parseFindRideParams', () => {
  it('preserves schedule mode, ride type, and a valid future date', () => {
    const futureDate = localFutureDate();
    const result = parseFindRideParams(
      `?from=Amman&to=Aqaba&search=1&mode=schedule&rideType=family&date=${futureDate}`,
    );

    expect(result).toEqual({
      initialFrom: 'Amman',
      initialTo: 'Aqaba',
      initialDate: futureDate,
      initialMode: 'schedule',
      initialRideType: 'family',
      initialSearched: true,
    });
  });

  it('drops stale dates and falls back to now mode', () => {
    const result = parseFindRideParams(
      `?from=Amman&to=Irbid&mode=schedule&rideType=comfort&date=${localPastDate()}`,
    );

    expect(result.initialDate).toBe('');
    expect(result.initialMode).toBe('now');
    expect(result.initialRideType).toBe('comfort');
  });

  it('ignores date when the search mode is now', () => {
    const result = parseFindRideParams(
      `?from=Amman&to=Zarqa&mode=now&rideType=economy&date=${localFutureDate()}`,
    );

    expect(result.initialMode).toBe('now');
    expect(result.initialDate).toBe('');
    expect(result.initialRideType).toBe('economy');
  });

  it('defaults unsupported ride types to any', () => {
    const result = parseFindRideParams('?rideType=luxury');
    expect(result.initialRideType).toBe('any');
  });
});
