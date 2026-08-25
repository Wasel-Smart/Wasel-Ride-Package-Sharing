/**
 * MapWrapper — canonical map entry-point for Wasel
 *
 * Static mode renders a lightweight StaticMapPreview instead of loading
 * Leaflet/Google Maps, keeping the 180px preview snappy.
 */

import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import type { WaselMapProps, WaselMapRoute } from './WaselMap';
import { tx } from '../locales/tx';

const WaselMap = lazy(async () => {
  const mod = await import('./WaselMap');
  return { default: mod.WaselMap };
});

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

function StaticMapPreview({ height, route }: { height?: string | number; route?: WaselMapRoute[] }) {
  const hasRoute = route && route.length >= 2;
  return (
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{
        height: typeof height === 'number' ? `${height}px` : (height ?? '400px'),
        background: 'linear-gradient(180deg, #0a1f3d 0%, #081d39 100%)',
        border: '1px solid rgba(103,232,255,0.15)',
      }}
    >
      <div className="flex flex-col items-center gap-2 text-[#95b2c9]">
        <MapPin className="w-6 h-6 text-[#00E5FF]" />
        <p className="text-xs font-medium">{tx('mapWrapper.static_preview')}</p>
        {hasRoute && route && route.length >= 2 && (
          <p className="text-[0.65rem] opacity-80">
            {route[0]!.label} → {route[route.length - 1]!.label}
          </p>
        )}
      </div>
    </div>
  );
}

function MapLoader({ height }: { height?: string | number }) {
  return (
    <div
      className="flex flex-col items-center justify-center bg-[#081d39] rounded-2xl gap-3 text-[#95b2c9]"
      style={{ height: typeof height === 'number' ? `${height}px` : (height ?? '400px') }}
    >
      <MapPin className="w-8 h-8 animate-pulse text-[#00E5FF]" />
      <p className="text-sm">{tx('mapWrapper.loading_map')}</p>
    </div>
  );
}

/**
 * Maps depend on browser APIs, third-party tiles, and geolocation.  A map
 * failure must never make a booking, bus, or tracking screen unusable.
 */
class MapErrorBoundary extends Component<
  { children: ReactNode; height?: string | number },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: true } {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Intentionally contained: the surrounding service flow remains usable.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="img"
          aria-label={tx('mapWrapper.map_unavailable')}
          className="flex flex-col items-center justify-center bg-[#081d39] rounded-2xl gap-2 text-[#95b2c9]"
          style={{
            height:
              typeof this.props.height === 'number'
                ? `${this.props.height}px`
                : (this.props.height ?? '400px'),
          }}
        >
          <MapPin className="w-7 h-7 text-[#00E5FF]" aria-hidden="true" />
          <p className="text-sm">{tx('mapWrapper.map_unavailable')}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

function LazyWaselMap(props: WaselMapProps) {
  return <WaselMap {...props} />;
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

  if (mode === 'static') {
    const route: WaselMapRoute[] = [];
    if (pickupLocation) route.push({ ...pickupLocation, label: 'Pickup' });
    if (driverLocation) route.push({ ...driverLocation, label: 'Driver' });
    if (dropoffLocation) route.push({ ...dropoffLocation, label: 'Dropoff' });
    return <StaticMapPreview height={height} route={route.length >= 2 ? route : undefined} />;
  }

  // Build route from location props (live mode)
  const route: WaselMapRoute[] = [];
  if (pickupLocation) route.push({ ...pickupLocation, label: 'Pickup' });
  if (driverLocation) route.push({ ...driverLocation, label: 'Driver' });
  if (dropoffLocation) route.push({ ...dropoffLocation, label: 'Dropoff' });

  // Convert generic markers to WaselMap markers
  const waselMarkers = markers.map(m => ({ lat: m.lat, lng: m.lng }));

  return (
    <MapErrorBoundary height={height}>
      <Suspense fallback={<MapLoader height={height} />}>
        <LazyWaselMap
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
    </MapErrorBoundary>
  );
}
