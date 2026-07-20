import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRideFilters } from './useRideFilters';

describe('useRideFilters', () => {
  it('sorts rides by price when requested', () => {
    const rides = [
      { id: 'ride-1', pricePerSeat: 8, time: '10:00', driver: { rating: 4.5 } },
      { id: 'ride-2', pricePerSeat: 3, time: '08:00', driver: { rating: 4.9 } },
      { id: 'ride-3', pricePerSeat: 5, time: '09:00', driver: { rating: 4.2 } },
    ];

    const { result } = renderHook(() => useRideFilters(rides));

    act(() => {
      result.current.setSort('price');
    });

    expect(result.current.sortedRides.map((ride: { id: string }) => ride.id)).toEqual([
      'ride-2',
      'ride-3',
      'ride-1',
    ]);
  });
});
