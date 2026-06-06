import { useCallback, useEffect, useRef, useState } from 'react';
import { requestEdgeJson } from '../../services/backendWorkflow';
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
      const next = await fetchMobilityServerSnapshot();

      if (!activeRef.current) return;
      setSnapshot(next);
      setSource('server');
    } catch {
      if (!activeRef.current) return;
      setSource('server');
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
    const response = await createMobilityServerBooking(request);

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
