/**
 * Ride Tracking Feature Module
 * Provides hooks and state management for ride tracking
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';

export interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface LiveRide {
  id: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  vehicleModel: string;
  licensePlate: string;
  status: 'matching' | 'driver_en_route' | 'driver_arrived' | 'in_progress';
  eta: string;
  distance: string;
  fare: string;
  driverLocation?: DriverLocation;
}

export function useLiveRide(rideId: string, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['live-ride', rideId],
    queryFn: async () => {
      const response = await apiClient.get<LiveRide>(`rides/${rideId}/live`);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['live-ride', rideId] });

  return {
    ...query,
    ride: query.data,
    refresh,
  };
}