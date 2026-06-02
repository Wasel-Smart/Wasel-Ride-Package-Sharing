import { useCallback, useEffect, useRef, useState } from 'react';
import { requestEdgeJson, runBackendWorkflow } from '../../services/backendWorkflow';
import type { BookingRequest, MobilitySystemSnapshot } from './model';
import { subscribeToMobilityCorridorChanges } from './mobilityRealtime';
import { mobilityOSRuntime } from './runtime';

type ServerBookingResponse = {
  booking_id: string;
  status: 'accepted';
  trace_id: string;
};

const MOBILITY_OS_BASE = '/mobility-os';

async function fetchMobilityServerSnapshot(): Promise<MobilitySystemSnapshot> {
  return requestEdgeJson<MobilitySystemSnapshot>({
    path: `${MOBILITY_OS_BASE}/snapshot`,
    operation: 'Load Mobility OS snapshot',
    authMode: 'required',
  });
}

async function createMobilityServerBooking(
  request: BookingRequest,
): Promise<ServerBookingResponse> {
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
  };
}

function isMobilityFallbackEligible(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message === 'Not authenticated' || error.message === 'Supabase client is not initialised'
  );
}

export function useMobilityOSServerState() {
  const [snapshot, setSnapshot] = useState<MobilitySystemSnapshot>(() =>
    mobilityOSRuntime.getSnapshot(),
  );
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'server' | 'fallback'>('fallback');
  const activeRef = useRef(true);
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReconcileTimer = useCallback(() => {
    if (!reconcileTimerRef.current) {
      return;
    }

    clearTimeout(reconcileTimerRef.current);
    reconcileTimerRef.current = null;
  }, []);

  const loadSnapshot = useCallback(async () => {
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

      if (!activeRef.current) return;
      setSnapshot(next);
      setSource(usedFallback ? 'fallback' : 'server');
    } catch {
      if (!activeRef.current) return;
      setSnapshot(mobilityOSRuntime.getSnapshot());
      setSource('fallback');
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void loadSnapshot();

    const unsubscribe = subscribeToMobilityCorridorChanges(() => {
      setSource('server');
      clearReconcileTimer();
      void loadSnapshot();
    });

    return () => {
      activeRef.current = false;
      clearReconcileTimer();
      unsubscribe();
    };
  }, [clearReconcileTimer, loadSnapshot]);

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

    if (response.trace_id.startsWith('local-')) {
      setSnapshot(await fetchFallbackSnapshot());
      setSource('fallback');
      clearReconcileTimer();
      return response;
    }

    setSource('server');
    clearReconcileTimer();
    reconcileTimerRef.current = setTimeout(() => {
      reconcileTimerRef.current = null;
      void loadSnapshot();
    }, 1500);

    return response;
  };

  return {
    snapshot,
    loading,
    source,
    createBooking,
  };
}
