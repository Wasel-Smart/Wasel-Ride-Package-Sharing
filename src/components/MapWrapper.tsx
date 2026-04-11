/**
 * MapWrapper â€” canonical map entry-point for Wasel
 *
 * All modes ('google', 'static', 'live') now render WaselMap.
 * This preserves the MapWrapper API used across 40+ components
 * while giving every caller a real, live Google Map.
 */

import { Suspense } from 'react';
import { MapPin } from 'lucide-react';
import { WaselMap, type WaselMapMarker, type WaselMapRoute } from './WaselMap';
import { omitUndefined } from '../utils/object';

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
      <MapPin className="w-8 h-8 animate-pulse text-[#F4C651]" />
      <p className="text-sm">Loading mapâ€¦</p>
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

  const routePoints: WaselMapRoute[] = [];
  if (pickupLocation) routePoints.push({ ...pickupLocation, label: 'Pickup' });
  if (driverLocation) routePoints.push({ ...driverLocation, label: 'Driver' });
  if (dropoffLocation) routePoints.push({ ...dropoffLocation, label: 'Dropoff' });

  const contextualMarkers: WaselMapMarker[] = [
    ...(pickupLocation ? [{ ...pickupLocation, label: 'Pickup', type: 'pickup' as const }] : []),
    ...(driverLocation ? [{ ...driverLocation, label: 'Driver', type: 'waypoint' as const }] : []),
    ...(dropoffLocation ? [{ ...dropoffLocation, label: 'Dropoff', type: 'dropoff' as const }] : []),
  ];
  const waselMarkers: WaselMapMarker[] = [
    ...contextualMarkers,
    ...markers.map((m) => ({ lat: m.lat, lng: m.lng, type: 'default' as const })),
  ];

  return (
    <Suspense fallback={<MapLoader height={height} />}>
      <WaselMap
        {...omitUndefined({
          center,
          zoom,
          height,
          className,
          route: routePoints.length >= 2 ? routePoints : undefined,
          markers: waselMarkers.length > 0 ? waselMarkers : undefined,
          showTraffic,
          showMosques,
          showRadars,
          autoTrack: mode === 'live',
          compact: isCompact,
        })}
      />
    </Suspense>
  );
}

