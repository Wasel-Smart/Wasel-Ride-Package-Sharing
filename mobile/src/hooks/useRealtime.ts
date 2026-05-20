import { useEffect, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface RealtimeHook<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRealtimeSubscription<T>(
  table: string,
  filter?: { column: string; value: any }
): RealtimeHook<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from(table).select('*');
      
      if (filter) {
        query = query.eq(filter.column, filter.value);
      }

      const { data: fetchedData, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      setData((fetchedData as T[]) ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [table, filter]);

  useEffect(() => {
    fetchData();

    const channelName = `realtime:${table}${filter ? `:${filter.column}=${filter.value}` : ''}`;
    const realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData(prev => [...prev, payload.new as T]);
          } else if (payload.eventType === 'UPDATE') {
            setData(prev =>
              prev.map(item =>
                (item as any).id === (payload.new as any).id ? (payload.new as T) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(item => (item as any).id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [table, filter, fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}

// Hook for ride updates
export function useRideUpdates(rideId?: string) {
  return useRealtimeSubscription(
    'rides',
    rideId ? { column: 'id', value: rideId } : undefined
  );
}

// Hook for booking updates
export function useBookingUpdates(userId: string) {
  return useRealtimeSubscription('bookings', { column: 'user_id', value: userId });
}

// Hook for chat messages
export function useChatMessages(chatId: string) {
  return useRealtimeSubscription('messages', { column: 'chat_id', value: chatId });
}

// Hook for driver location tracking
export function useDriverLocation(driverId: string) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`driver:${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'driver_locations',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          const newLocation = payload.new as any;
          setLocation({
            lat: newLocation.latitude,
            lng: newLocation.longitude,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  return location;
}
