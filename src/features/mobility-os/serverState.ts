import { useEffect, useState } from 'react';
import { requestEdgeJson, runBackendWorkflow } from '../../services/backendWorkflow';
import { supabase } from '../../services/core';
import type { BookingRequest, MobilitySystemSnapshot } from './model';
import { mobilityOSRuntime } from './runtime';

type ServerBookingResponse = {
  booking_id: string;
  status: 'accepted';
  trace_id: string;
  queued_events: string[];
};

const MOBILITY_OS_BASE = '/mobility-os';

async function fetchMobilityServerSnapshot(): Promise<MobilitySystemSnapshot> {
  const payload = await requestEdgeJson<MobilitySystemSnapshot>({
    path: `${MOBILITY_OS_BASE}/snapshot`,
    operation: 'Load Mobility OS snapshot',
    authMode: 'required',
  });

  return {
    ...payload,
    narrative: {
      platform_statement: 'Mobility OS is a capacity exchange where corridors are market instruments and every screen is a projection of backend state.',
      business_model: [
        'Monetize seats and parcel kilos on the same corridor book.',
        'Price corridors dynamically as utilization and demand pressure rise.',
        'Harden route ownership with recurring enterprise and consumer movement on the same lanes.',
      ],
    },
  };
}

async function createMobilityServerBooking(request: BookingRequest): Promise<ServerBookingResponse> {
  return requestEdgeJson<ServerBookingResponse>({
    path: `${MOBILITY_OS_BASE}/booking/create`,
    operation: 'Create Mobility OS booking',
    authMode: 'required',
    method: 'POST',
    body: request,
  });
}

async function fetchFallbackSnapshot(): Promise<MobilitySystemSnapshot> {
  return mobilityOSRuntime.getSnapshot();
}

async function createFallbackBooking(request: BookingRequest): Promise<ServerBookingResponse> {
  const bookingId = mobilityOSRuntime.createBooking(request);
  return {
    booking_id: bookingId,
    status: 'accepted',
    trace_id: `local-${bookingId}`,
    queued_events: ['BookingCreated', 'CapacityUpdated', 'DemandUpdated', 'PriceRecalculated', 'CorridorUpdated'],
  };
}

function isMobilityFallbackEligible(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message === 'Not authenticated' ||
    error.message === 'Supabase client is not initialised'
  );
}

export function useMobilityOSServerState() {
  const [snapshot, setSnapshot] = useState<MobilitySystemSnapshot>(() => mobilityOSRuntime.getSnapshot());
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'server' | 'fallback'>('fallback');

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        let usedFallback = false;
        const next = await runBackendWorkflow<MobilitySystemSnapshot>({
          operation: 'Load Mobility OS snapshot',
          authMode: 'required',
          fallbackPolicy: 'always',
          edge: async () => fetchMobilityServerSnapshot(),
          fallback: async () => {
            usedFallback = true;
            return fetchFallbackSnapshot();
          },
        });

        if (!active) return;
        setSnapshot(next);
        setSource(usedFallback ? 'fallback' : 'server');
      } catch {
        if (!active) return;
        setSnapshot(mobilityOSRuntime.getSnapshot());
        setSource('fallback');
      } finally {
        if (active) setLoading(false);
      }
    };

    void refresh();

    if (!supabase) {
      return () => {
        active = false;
      };
    }

    const channel = supabase
      .channel('mobility-os-server-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mobility_corridors' }, () => {
        void refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mobility_event_outbox' }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const createBooking = async (request: BookingRequest) => {
    let response: ServerBookingResponse;

    try {
      response = await runBackendWorkflow<ServerBookingResponse>({
        operation: 'Create Mobility OS booking',
        authMode: 'required',
        fallbackPolicy: 'always',
        edge: async () => createMobilityServerBooking(request),
        fallback: async () => createFallbackBooking(request),
      });
    } catch (error) {
      if (!isMobilityFallbackEligible(error)) {
        throw error;
      }

      response = await createFallbackBooking(request);
    }

    let nextSnapshot: MobilitySystemSnapshot;
    try {
      nextSnapshot = await runBackendWorkflow<MobilitySystemSnapshot>({
        operation: 'Reload Mobility OS snapshot',
        authMode: 'required',
        fallbackPolicy: 'always',
        edge: async () => fetchMobilityServerSnapshot(),
        fallback: async () => fetchFallbackSnapshot(),
      });
    } catch (error) {
      if (!isMobilityFallbackEligible(error)) {
        throw error;
      }

      nextSnapshot = await fetchFallbackSnapshot();
    }

    setSnapshot(nextSnapshot);
    setSource(response.trace_id.startsWith('local-') ? 'fallback' : 'server');

    return response;
  };

  return {
    snapshot,
    loading,
    source,
    createBooking,
  };
}
