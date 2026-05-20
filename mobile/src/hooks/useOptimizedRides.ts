import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

export interface OptimizedRide {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  price_jod: number;
  seats_available: number;
  driver_name: string;
  driver_rating: number;
  driver_verified: boolean;
  car_model: string;
  gender_pref: 'any' | 'male' | 'female';
  prayer_stops: boolean;
  accepts_packages: boolean;
  status: 'active' | 'full' | 'cancelled' | 'completed';
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
}

const RIDES_QUERY_KEY = 'rides';

export function useOptimizedRides(filters?: {
  from?: string;
  to?: string;
  date?: string;
}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [RIDES_QUERY_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from('rides')
        .select('*')
        .eq('status', 'active')
        .gt('seats_available', 0)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(50);

      if (filters?.from) query = query.ilike('from', `%${filters.from}%`);
      if (filters?.to) query = query.ilike('to', `%${filters.to}%`);
      if (filters?.date) query = query.eq('date', filters.date);

      const { data, error } = await query;
      if (error) throw error;
      return (data as OptimizedRide[]) ?? [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('rides-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: [RIDES_QUERY_KEY] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    rides: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

export function useRideDetail(rideId: string) {
  return useQuery({
    queryKey: [RIDES_QUERY_KEY, rideId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .single();

      if (error) throw error;
      return data as OptimizedRide;
    },
    enabled: !!rideId,
  });
}

export function useBookRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rideId, seats }: { rideId: string; seats: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          ride_id: rideId,
          user_id: user.id,
          seats_booked: seats,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RIDES_QUERY_KEY] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RIDES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
