/**
 * Enhanced Wasel Map with Real Driver Tracking
 * 
 * Features:
 * - Real-time driver location updates
 * - Route alternatives with traffic info
 * - Turn-by-turn navigation guidance
 * - Traffic incidents overlay
 * - ETA with traffic prediction
 * - Driver profile integration
 */

import { useEffect, useState } from 'react';
import { WaselMap, type WaselMapProps } from './WaselMap';
import {
  useDriverTracking,
  useRouteAlternatives,
  useTrafficIncidents,
  calculateETA,
  type RouteAlternative,
} from '../services/driverTracking';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { omitUndefined } from '../utils/object';

export interface EnhancedWaselMapProps extends WaselMapProps {
  driverId?: string;
  onETAUpdate?: (eta: string) => void;
  showTrafficIncidents?: boolean;
  showRouteAlternatives?: boolean;
  showNavigation?: boolean;
}

export interface NavigationGuidance {
  currentInstruction: string;
  nextInstruction: string;
  distance: number;
  eta: string;
  trafficLevel: 'free' | 'moderate' | 'heavy';
}

/**
 * Real Driver Location Tracker Component
 */
export function DriverLocationTracker({ driverId }: { driverId: string }) {
  const { location, loading, error } = useDriverTracking(driverId);

  useEffect(() => {
    if (!location?.isLive) return;
  }, [location]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400 mt-2">Tracking driver...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-xs text-red-400">
        Error tracking driver: {error.message}
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-4 text-xs text-gray-400">
        Waiting for driver location...
      </div>
    );
  }

  const accuracy = Math.round(location.accuracy);
  const speed = Math.round(location.speed * 3.6); // Convert to km/h

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-2"
    >
      <div className="flex items-center justifybetween text-sm">
        <span className="text-gray-400">Driver Position:</span>
        <span className="font-mono text-xs">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Speed:</span>
        <span className="font-semibold">{speed} km/h</span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Accuracy:</span>
        <span className="text-xs">±{accuracy}m</span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Status:</span>
        <motion.span
          animate={{ opacity: [0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-green-400 inline-block"
        />
        <span className="text-green-400 text-xs">Live</span>
      </div>
    </motion.div>
  );
}

/**
 * Navigation Guidance Panel Component
 */
export function NavigationPanel({
  startLat,
  startLng,
  endLat,
  endLng,
}: {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}) {
  const { alternatives, loading } = useRouteAlternatives(startLat, startLng, endLat, endLng);
  const [selectedRoute, setSelectedRoute] = useState<RouteAlternative | null>(null);

  useEffect(() => {
    if (alternatives.length > 0 && !selectedRoute) {
      setSelectedRoute(alternatives[0]);
    }
  }, [alternatives, selectedRoute]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400 mt-2">Calculating routes...</p>
      </div>
    );
  }

  if (alternatives.length === 0) {
    return (
      <div className="p-4 text-xs text-gray-400">
        No route alternatives available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-cyan-400">Route Options</h3>

      <AnimatePresence>
        {alternatives.map((route, idx) => (
          <motion.button
            key={route.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedRoute(route)}
            className={`w-full p-3 rounded-lg border transition-all ${
              selectedRoute?.id === route.id
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-left flex-1">
                <p className="text-xs font-semibold text-gray-300">
                  {idx === 0 ? '⚡ Fastest' : idx === 1 ? '🌳 Scenic' : '📍 Alternative'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {route.distance.toFixed(1)} km
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-cyan-400">
                  {route.duration} min
                </p>
                <p className={`text-xs mt-1 ${
                  route.trafficLevel === 'free'
                    ? 'text-green-400'
                    : route.trafficLevel === 'moderate'
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {route.trafficLevel === 'free'
                    ? '✓ Clear'
                    : route.trafficLevel === 'moderate'
                    ? '⚠ Moderate'
                    : '🚫 Heavy'}
                </p>
              </div>
            </div>

            {selectedRoute?.id === route.id && route.instructions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-gray-700 space-y-2"
              >
                <p className="text-xs text-gray-400">Direction:</p>
                <p className="text-xs text-cyan-300">{route.instructions[0]?.direction}</p>
              </motion.div>
            )}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Traffic Incidents Overlay Component
 */
export function TrafficIncidentsPanel({
  lat,
  lng,
  radius,
}: {
  lat: number;
  lng: number;
  radius?: number;
}) {
  const { incidents, loading } = useTrafficIncidents(lat, lng, radius);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400 mt-2">Scanning traffic...</p>
      </div>
    );
  }

  if (incidents.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-2"
    >
      <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
        <AlertTriangle size={14} />
        Traffic Alerts
      </h3>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {incidents.map((incident) => (
          <div key={incident.id} className="text-xs p-2 bg-black/30 rounded">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                incident.severity === 'high'
                  ? 'bg-red-500/20 text-red-400'
                  : incident.severity === 'moderate'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {incident.type.replace('-', ' ').toUpperCase()}
              </span>
            </div>
            <p className="text-gray-300">{incident.description}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * ETA Widget Component
 */
export function ETAWidget({
  startLat,
  startLng,
  endLat,
  endLng,
  onETAUpdate,
}: {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  onETAUpdate?: (eta: string) => void;
}) {
  const [etaData, setEtaData] = useState<{
    distance: number;
    duration: number;
    eta: string;
    trafficFactor: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    calculateETA(startLat, startLng, endLat, endLng)
      .then(setEtaData)
      .finally(() => setLoading(false));
  }, [startLat, startLng, endLat, endLng]);

  useEffect(() => {
    if (etaData?.eta) {
      onETAUpdate?.(etaData.eta);
    }
  }, [etaData?.eta, onETAUpdate]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!etaData) return null;

  const etaTime = new Date(etaData.eta);
  const etaHours = etaTime.getHours();
  const etaMinutes = etaTime.getMinutes().toString().padStart(2, '0');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-3 gap-3"
    >
      <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
        <p className="text-xs text-gray-400">Distance</p>
        <p className="text-lg font-semibold text-cyan-400 mt-1">{etaData.distance.toFixed(1)} km</p>
      </div>

      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
        <p className="text-xs text-gray-400">Duration</p>
        <p className="text-lg font-semibold text-blue-400 mt-1">{etaData.duration} min</p>
      </div>

      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
        <p className="text-xs text-gray-400">ETA</p>
        <p className="text-lg font-semibold text-green-400 mt-1">
          {etaHours}:{etaMinutes}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Complete Enhanced Map Wrapper Component
 */
export function EnhancedWaselMapWrapper({
  driverId,
  startLat,
  startLng,
  endLat,
  endLng,
  onETAUpdate,
  showTrafficIncidents = true,
  showRouteAlternatives = true,
  showNavigation = true,
  ...mapProps
}: EnhancedWaselMapProps & {
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
}) {
  return (
    <div className="space-y-4">
      <WaselMap {...mapProps} />

      {/* Details Panel */}
      {(showTrafficIncidents || showRouteAlternatives || driverId) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-gray-900 border border-gray-800 space-y-4 max-h-96 overflow-y-auto"
        >
          {driverId && (
            <DriverLocationTracker driverId={driverId} />
          )}

          {showRouteAlternatives && showNavigation && startLat !== undefined && startLng !== undefined && endLat !== undefined && endLng !== undefined && (
            <>
              <NavigationPanel
                startLat={startLat}
                startLng={startLng}
                endLat={endLat}
                endLng={endLng}
              />

              <ETAWidget
                startLat={startLat}
                startLng={startLng}
                endLat={endLat}
                endLng={endLng}
                {...omitUndefined({ onETAUpdate })}
              />
            </>
          )}

          {showTrafficIncidents && startLat !== undefined && startLng !== undefined && (
            <TrafficIncidentsPanel
              lat={startLat}
              lng={startLng}
              radius={5}
            />
          )}
        </motion.div>
      )}
    </div>
  );
}

export default EnhancedWaselMapWrapper;
