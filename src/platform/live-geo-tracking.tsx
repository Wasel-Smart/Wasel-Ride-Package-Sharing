/**
 * Live Geo-Streaming Integration
 * Production-ready driver location tracking with WebSocket real-time updates
 */

import { geoStream, type DriverLocation } from './geo-stream-realtime';
import { telemetry } from './telemetry';
import { productionMetricsCollector } from './production-metrics';
import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// DRIVER LOCATION MANAGER
// ============================================================================

class DriverLocationManager {
  private activeDrivers: Map<string, DriverLocation> = new Map();
  private locationHistory: Map<string, DriverLocation[]> = new Map();
  private readonly MAX_HISTORY = 50;

  updateDriverLocation(location: DriverLocation): void {
    // Store current location
    this.activeDrivers.set(location.driverId, location);

    // Update history
    if (!this.locationHistory.has(location.driverId)) {
      this.locationHistory.set(location.driverId, []);
    }

    const history = this.locationHistory.get(location.driverId)!;
    history.push(location);

    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }

    // Track metrics
    productionMetricsCollector.recordMetric('driver.location_update', 1);
    telemetry.recordMetric('driver.location_update', 1, 'count', {
      driverId: location.driverId,
      status: location.status,
    });
  }

  getDriverLocation(driverId: string): DriverLocation | undefined {
    return this.activeDrivers.get(driverId);
  }

  getDriverHistory(driverId: string): DriverLocation[] {
    return this.locationHistory.get(driverId) || [];
  }

  getNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm: number,
    status?: 'available' | 'on_trip' | 'offline',
  ): DriverLocation[] {
    const nearby: DriverLocation[] = [];

    for (const location of this.activeDrivers.values()) {
      if (status && location.status !== status) continue;

      const distance = this.calculateDistance(lat, lng, location.lat, location.lng);
      if (distance <= radiusKm) {
        nearby.push(location);
      }
    }

    return nearby.sort((a, b) => {
      const distA = this.calculateDistance(lat, lng, a.lat, a.lng);
      const distB = this.calculateDistance(lat, lng, b.lat, b.lng);
      return distA - distB;
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  getActiveDriverCount(): number {
    return this.activeDrivers.size;
  }

  getAvailableDriverCount(): number {
    return Array.from(this.activeDrivers.values()).filter((d) => d.status === 'available').length;
  }
}

export const driverLocationManager = new DriverLocationManager();

// ============================================================================
// REACT HOOKS FOR LIVE TRACKING
// ============================================================================

/**
 * Hook to track drivers in a specific area
 */
export function useLiveDriverTracking(
  lat: number,
  lng: number,
  radiusKm: number,
): {
  drivers: DriverLocation[];
  isConnected: boolean;
  error: Error | null;
} {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsConnected(true);

    const unsubscribe = geoStream.subscribeToArea(lat, lng, radiusKm, (updatedDrivers) => {
      setDrivers(updatedDrivers);

      // Update local manager
      updatedDrivers.forEach((driver) => {
        driverLocationManager.updateDriverLocation(driver);
      });
    });

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [lat, lng, radiusKm]);

  return { drivers, isConnected, error };
}

/**
 * Hook to track a specific driver
 */
export function useDriverTracking(driverId: string): {
  location: DriverLocation | null;
  history: DriverLocation[];
  isConnected: boolean;
} {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [history, setHistory] = useState<DriverLocation[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!driverId) return;

    setIsConnected(true);

    const unsubscribe = geoStream.subscribeToDriver(driverId, (updatedLocation) => {
      setLocation(updatedLocation);
      driverLocationManager.updateDriverLocation(updatedLocation);
      setHistory(driverLocationManager.getDriverHistory(driverId));
    });

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [driverId]);

  return { location, history, isConnected };
}

// ============================================================================
// LIVE DRIVER MAP COMPONENT
// ============================================================================

interface LiveDriverMapProps {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  onDriverSelect?: (driver: DriverLocation) => void;
}

export function LiveDriverMap({
  centerLat,
  centerLng,
  radiusKm,
  onDriverSelect,
}: LiveDriverMapProps) {
  const { drivers, isConnected } = useLiveDriverTracking(centerLat, centerLng, radiusKm);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const handleDriverClick = useCallback(
    (driver: DriverLocation) => {
      setSelectedDriver(driver.driverId);
      onDriverSelect?.(driver);
    },
    [onDriverSelect],
  );

  return (
    <div className="relative h-full w-full">
      {/* Connection Status */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-lg">
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        <span className="text-sm font-medium">
          {isConnected ? 'Live Tracking' : 'Disconnected'}
        </span>
      </div>

      {/* Driver Count */}
      <div className="absolute left-4 top-4 z-10 rounded-lg bg-white px-3 py-2 shadow-lg">
        <div className="text-sm text-gray-600">Available Drivers</div>
        <div className="text-2xl font-bold">
          {drivers.filter((d) => d.status === 'available').length}
        </div>
      </div>

      {/* Map Container */}
      <div className="h-full w-full">
        {/* In production, this would be Leaflet or Google Maps */}
        <MapPlaceholder
          drivers={drivers}
          selectedDriver={selectedDriver}
          onDriverClick={handleDriverClick}
        />
      </div>

      {/* Driver List */}
      <div className="absolute bottom-4 left-4 right-4 z-10 max-h-48 overflow-y-auto rounded-lg bg-white p-4 shadow-lg">
        <h3 className="mb-2 font-semibold">Nearby Drivers ({drivers.length})</h3>
        <div className="space-y-2">
          {drivers.map((driver) => (
            <DriverCard
              key={driver.driverId}
              driver={driver}
              isSelected={selectedDriver === driver.driverId}
              onClick={() => handleDriverClick(driver)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MapPlaceholder({
  drivers,
  selectedDriver,
  onDriverClick,
}: {
  drivers: DriverLocation[];
  selectedDriver: string | null;
  onDriverClick: (driver: DriverLocation) => void;
}) {
  return (
    <div className="flex h-full items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-4xl">🗺️</div>
        <div className="mt-2 text-gray-600">Live Driver Map</div>
        <div className="mt-1 text-sm text-gray-500">{drivers.length} drivers tracked</div>
      </div>
    </div>
  );
}

function DriverCard({
  driver,
  isSelected,
  onClick,
}: {
  driver: DriverLocation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColor = {
    available: 'bg-green-100 text-green-800',
    on_trip: 'bg-blue-100 text-blue-800',
    offline: 'bg-gray-100 text-gray-800',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border-2 p-2 text-left transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Driver {driver.driverId.slice(-6)}</div>
          <div className="text-xs text-gray-500">
            {driver.speed ? `${Math.round(driver.speed)} km/h` : 'Stationary'}
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor[driver.status]}`}
        >
          {driver.status}
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// DRIVER TRACKING COMPONENT (for active trips)
// ============================================================================

interface DriverTrackingProps {
  driverId: string;
  showHistory?: boolean;
}

export function DriverTracking({ driverId, showHistory = false }: DriverTrackingProps) {
  const { location, history, isConnected } = useDriverTracking(driverId);

  if (!location) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-4xl">📍</div>
          <div className="mt-2 text-gray-600">Waiting for driver location...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Location */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Driver Location</h3>
          <div
            className={`flex items-center gap-1 text-sm ${
              isConnected ? 'text-green-600' : 'text-red-600'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Latitude</div>
            <div className="font-mono">{location.lat.toFixed(6)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Longitude</div>
            <div className="font-mono">{location.lng.toFixed(6)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Speed</div>
            <div>{location.speed ? `${Math.round(location.speed)} km/h` : 'Stationary'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Heading</div>
            <div>{location.heading ? `${Math.round(location.heading)}°` : 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Location History */}
      {showHistory && history.length > 0 && (
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-2 font-semibold">Location History</h3>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {history.reverse().map((loc, index) => (
              <div key={index} className="flex justify-between border-b py-2 text-sm">
                <span className="font-mono text-gray-600">
                  {new Date(loc.timestamp).toLocaleTimeString()}
                </span>
                <span>
                  {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </span>
                <span className="text-gray-500">
                  {loc.speed ? `${Math.round(loc.speed)} km/h` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AUTO-START GEO STREAMING IN PRODUCTION
// ============================================================================

if (typeof window !== 'undefined' && import.meta.env.MODE === 'production') {
  geoStream.connect().then(() => {
    console.log('✅ Live geo-streaming connected');
    
    // Track connection metrics
    telemetry.recordMetric('geo_stream.connected', 1, 'count');
  }).catch((error) => {
    console.error('❌ Failed to connect geo-streaming:', error);
    telemetry.recordMetric('geo_stream.connection_error', 1, 'count');
  });
}
