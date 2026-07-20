import { useMemo, useState } from 'react';

export type RideSortOption = 'price' | 'time' | 'rating';

export interface RideListItem {
  id: string;
  pricePerSeat: number;
  time: string;
  driver?: {
    rating?: number;
  };
}

export function useRideFilters<T extends RideListItem>(rides: T[]) {
  const [sort, setSort] = useState<RideSortOption>('rating');

  const sortedRides = useMemo(() => {
    const next = [...rides];

    return next.sort((left, right) => {
      if (sort === 'price') {
        return left.pricePerSeat - right.pricePerSeat;
      }

      if (sort === 'time') {
        return left.time.localeCompare(right.time);
      }

      return (right.driver?.rating ?? 0) - (left.driver?.rating ?? 0);
    });
  }, [rides, sort]);

  return { sort, setSort, sortedRides };
}
