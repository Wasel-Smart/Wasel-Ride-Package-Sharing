/**
 * MapWrapper — canonical map entry-point for Wasel
 *
 * All modes ('google', 'static', 'live') now render WaselMap.
 * This preserves the MapWrapper API used across 40+ components
 * while giving every caller a real, live Google Map.
 */

import { Suspense } from 'react';
import { MapPin } from 'lucide-react';
import { WaselMap, type WaselMapRoute } from './WaselMap';

export type MapMode = 'google' | 'static' | 'live';

interface LatLng {
  lat: number;
  lng: number;
}

interface MapWrapperProps {
  mode?: MapMode;
  center?: LatLng;
  zoom?: number;
  markers?: LatLng[];
  height?: string | number;
  className?: string;
  tripId?: string;
  driverLocation?: LatLng;
  pickupLocation?: LatLng;
  dropoffLocation?: LatLng;
  onNavigate?: (page: string) => void;
  showTraffic?: boolean;
  showMosques?: boolean;
  showRadars?: boolean;
  compact?: boolean;
}

function MapLoader({ height }: { height?: string | number }) {
  return (
    <div
      className="flex flex-col items-center justify-center bg-[#0c1520] rounded-2xl gap-3 text-[#8590a2]"
      style={{ height: typeof height === 'number' ? `${height}px` : (height ?? '400px') }}
    >
      <MapPin className="w-8 h-8 animate-pulse text-[#16C7F2]" />
      <p className="text-sm">Loading map…</p>
    </div>
  );
}

export function MapWrapper({
  mode = 'google',
  center,
  zoom,
  markers = [],
  height = 400,
  className,
  pickupLocation,
  dropoffLocation,
  driverLocation,
  showTraffic = true,
  showMosques = true,
  showRadars = true,
  compact,
}: MapWrapperProps) {
  const isCompact = compact ?? mode === 'static';

  // Build route from location props (live mode)
  const route: WaselMapRoute[] = [];
  if (pickupLocation)  route.push({ ...pickupLocation,  label: 'Pickup' });
  if (driverLocation)  route.push({ ...driverLocation,  label: 'Driver' });
  if (dropoffLocation) route.push({ ...dropoffLocation, label: 'Dropoff' });

  // Convert generic markers to WaselMap markers
  const waselMarkers = markers.map(m => ({ lat: m.lat, lng: m.lng }));

  return (
    <Suspense fallback={<MapLoader height={height} />}>
      <WaselMap
        center={center}
        zoom={zoom}
        height={height}
        className={className}
        route={route.length >= 2 ? route : undefined}
        markers={waselMarkers.length > 0 ? waselMarkers : undefined}
        showTraffic={showTraffic}
        showMosques={showMosques}
        showRadars={showRadars}
        autoTrack={mode === 'live'}
        compact={isCompact}
      />
    </Suspense>
  );
}
