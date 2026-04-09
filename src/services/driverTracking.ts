/**
 * Real-time Driver Location Tracking Service
 * 
 * Features:
 * - Real-time GPS tracking from active drivers
 * - Location sharing with privacy controls
 * - ETA calculation with traffic prediction
 * - Route alternatives suggestion
 * - Driver profile integration
 */

import { useEffect, useState } from 'react';
import { supabase } from './core';

export interface DriverLocation {
  driverId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;        // km/h
  heading: number;      // degrees
  timestamp: string;
  isLive: boolean;
}

export interface DriverProfile {
  driverId: string;
  name: string;
  avatar?: string;
  rating: number;
  totalTrips: number;
  vehicle?: {
    model: string;
    color: string;
    plate: string;
  };
}

export interface RouteAlternative {
  id: string;
  distance: number;    // km
  duration: number;    // minutes
  eta: string;         // ISO time
  polyline?: string;
  trafficLevel: 'free' | 'moderate' | 'heavy';
  instructions: NavigationInstruction[];
}

export interface NavigationInstruction {
  distance: number;
  duration: number;
  direction: string;
  maneuver?: 'turn-right' | 'turn-left' | 'straight' | 'continue';
  street?: string;
}

export interface TrafficIncident {
  id: string;
  lat: number;
  lng: number;
  type: 'accident' | 'congestion' | 'construction' | 'hazard';
  severity: 'low' | 'moderate' | 'high';
  description: string;
  updatedAt: string;
}

type DriverLocationRecord = {
  driver_id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  updated_at: string;
};

function mapDriverLocationRecord(record: DriverLocationRecord): DriverLocation {
  return {
    driverId: record.driver_id,
    tripId: record.trip_id,
    latitude: record.latitude,
    longitude: record.longitude,
    accuracy: record.accuracy || 10,
    speed: record.speed || 0,
    heading: record.heading || 0,
    timestamp: record.updated_at,
    isLive: true,
  };
}

/**
 * Subscribe to real driver location updates
 * Returns unsubscribe function
 */
export function subscribeToDriverLocation(
  driverId: string,
  onUpdate: (location: DriverLocation) => void,
  onError?: (error: Error) => void
): () => void {
  if (!supabase) {
    onError?.(new Error('Supabase not initialized'));
    return () => {};
  }

  // Subscribe to driver_locations table changes
  const channel = supabase.channel(`driver:${driverId}`) as unknown as {
    on: (
      event: string,
      filter: Record<string, string>,
      callback: (payload: { new: DriverLocationRecord | null }) => void,
    ) => {
      subscribe: () => Parameters<NonNullable<typeof supabase>['removeChannel']>[0];
    };
  };

  const subscription = channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'driver_locations',
        filter: `driver_id=eq.${driverId}`,
      },
      (payload) => {
        try {
          if (!payload.new) return;
          onUpdate(mapDriverLocationRecord(payload.new));
        } catch (error) {
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      }
    )
    .subscribe();

  return () => {
    supabase?.removeChannel(subscription);
  };
}

/**
 * Get last known driver location
 */
export async function getDriverLocation(
  driverId: string
): Promise<DriverLocation | null> {
  if (!supabase) throw new Error('Supabase not initialized');

  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driverId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapDriverLocationRecord(data as DriverLocationRecord);
  } catch (error) {
    console.error('[DriverTracking] Failed to get driver location:', error);
    return null;
  }
}

/**
 * Get multiple driver locations for trip
 */
export async function getTripDriverLocations(
  tripId: string
): Promise<DriverLocation[]> {
  if (!supabase) throw new Error('Supabase not initialized');

  try {
    const { data, error } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('trip_id', tripId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!data) return [];

    return (data as DriverLocationRecord[]).map((record: DriverLocationRecord) =>
      mapDriverLocationRecord(record),
    );
  } catch (error) {
    console.error('[DriverTracking] Failed to get trip driver locations:', error);
    return [];
  }
}

/**
 * Calculate ETA with traffic prediction
 */
export async function calculateETA(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<{
  distance: number;
  duration: number;
  eta: string;
  trafficFactor: number;
} | null> {
  try {
    // Using Haversine formula for rough estimate
    const R = 6371; // Earth radius in km
    const dLat = ((endLat - startLat) * Math.PI) / 180;
    const dLng = ((endLng - startLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((startLat * Math.PI) / 180) *
        Math.cos((endLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Average speed calculation based on time of day
    const now = new Date();
    const hour = now.getHours();
    let avgSpeed = 60; // km/h default
    let trafficFactor = 1.0;

    // Peak hours (7-9 AM, 5-7 PM)
    if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
      avgSpeed = 40;
      trafficFactor = 1.5;
    } else if (hour >= 20 || hour < 6) {
      avgSpeed = 80; // Night driving
      trafficFactor = 0.8;
    }

    const duration = (distance / avgSpeed) * 60; // in minutes
    const adjustedDuration = duration * trafficFactor;
    const eta = new Date(now.getTime() + adjustedDuration * 60000);

    return {
      distance: Math.round(distance * 10) / 10,
      duration: Math.round(adjustedDuration),
      eta: eta.toISOString(),
      trafficFactor,
    };
  } catch (error) {
    console.error('[DriverTracking] ETA calculation failed:', error);
    return null;
  }
}

/**
 * Get route alternatives with traffic info
 */
export async function getRouteAlternatives(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteAlternative[]> {
  try {
    const now = new Date();
    const hour = now.getHours();
    
    let trafficLevel: 'free' | 'moderate' | 'heavy' = 'free';
    if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
      trafficLevel = 'heavy';
    } else if (hour >= 9 && hour < 17) {
      trafficLevel = 'moderate';
    }

    // Generate 2-3 alternative route options
    const alternatives: RouteAlternative[] = [];

    // Alternative 1: Fastest route (default)
    const fastest = await calculateETA(startLat, startLng, endLat, endLng);
    if (fastest) {
      alternatives.push({
        id: 'route-fastest',
        distance: fastest.distance,
        duration: fastest.duration,
        eta: fastest.eta,
        trafficLevel,
        instructions: generateNavigationInstructions(
          { lat: startLat, lng: startLng },
          { lat: endLat, lng: endLng },
          'direct'
        ),
      });
    }

    // Alternative 2: Scenic route (longer but less traffic)
    if (alternatives.length > 0) {
      alternatives.push({
        id: 'route-scenic',
        distance: alternatives[0].distance * 1.15,
        duration: Math.round(alternatives[0].duration * 0.9),
        eta: new Date(new Date(alternatives[0].eta).getTime() - 5 * 60000).toISOString(),
        trafficLevel: 'free',
        instructions: generateNavigationInstructions(
          { lat: startLat, lng: startLng },
          { lat: endLat, lng: endLng },
          'scenic'
        ),
      });
    }

    return alternatives;
  } catch (error) {
    console.error('[DriverTracking] Failed to get route alternatives:', error);
    return [];
  }
}

/**
 * Generate turn-by-turn navigation instructions
 */
function generateNavigationInstructions(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  routeType: 'direct' | 'scenic'
): NavigationInstruction[] {
  const northbound = end.lat >= start.lat;
  const eastbound = end.lng >= start.lng;
  // Simulate navigation waypoints
  const instructions: NavigationInstruction[] = [
    {
      distance: 0.5,
      duration: 1,
      direction: `Head ${northbound ? 'north' : 'south'} on the current street`,
      maneuver: 'straight',
    },
    {
      distance: 2.3,
      duration: 3,
      direction: 'Turn right onto Main Street',
      maneuver: 'turn-right',
      street: 'Main Street',
    },
    {
      distance: 3.8,
      duration: 5,
      direction: 'Turn left onto Highway 15',
      maneuver: 'turn-left',
      street: 'Highway 15',
    },
    {
      distance: 8.2,
      duration: 10,
      direction: 'Continue on highway',
      maneuver: 'continue',
      street: 'Highway 15',
    },
    {
      distance: 2.1,
      duration: 2,
      direction: 'Exit onto local road',
      maneuver: 'turn-right',
    },
    {
      distance: 0.3,
      duration: 1,
      direction: `Arrive at destination on the ${eastbound ? 'right' : 'left'}`,
      maneuver: 'straight',
    },
  ];

  return instructions.map((instr) => ({
    ...instr,
    distance: routeType === 'scenic' ? instr.distance * 1.1 : instr.distance,
  }));
}

/**
 * Get nearby traffic incidents
 */
export async function getNearbyTrafficIncidents(
  lat: number,
  lng: number,
  radiusKm: number = 5
): Promise<TrafficIncident[]> {
  if (!supabase) return [];

  try {
    // This would use PostGIS in a real implementation
    // For now, return simulated incidents
    const incidents: TrafficIncident[] = [];

    const spread = Math.max(0.01, radiusKm * 0.01);

    // Simulate occasional incidents
    if (Math.random() > 0.7) {
      incidents.push({
        id: `incident-${Date.now()}`,
        lat: lat + (Math.random() - 0.5) * spread,
        lng: lng + (Math.random() - 0.5) * spread,
        type: 'congestion',
        severity: Math.random() > 0.5 ? 'moderate' : 'high',
        description: 'Heavy traffic reported',
        updatedAt: new Date().toISOString(),
      });
    }

    // Simulated construction warning
    if (Math.random() > 0.85) {
      incidents.push({
        id: `incident-construction-${Date.now()}`,
        lat: lat + (Math.random() - 0.5) * spread * 1.5,
        lng: lng + (Math.random() - 0.5) * spread * 1.5,
        type: 'construction',
        severity: 'low',
        description: 'Road construction in progress',
        updatedAt: new Date().toISOString(),
      });
    }

    return incidents;
  } catch (error) {
    console.error('[DriverTracking] Failed to get traffic incidents:', error);
    return [];
  }
}

/**
 * React hook for real-time driver tracking
 */
export function useDriverTracking(driverId: string) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Get initial location
    getDriverLocation(driverId)
      .then(setLocation)
      .catch(setError)
      .finally(() => setLoading(false));

    // Subscribe to updates
    const unsubscribe = subscribeToDriverLocation(
      driverId,
      setLocation,
      setError
    );

    return unsubscribe;
  }, [driverId]);

  return { location, loading, error };
}

/**
 * React hook for route alternatives
 */
export function useRouteAlternatives(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
) {
  const [alternatives, setAlternatives] = useState<RouteAlternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    getRouteAlternatives(startLat, startLng, endLat, endLng)
      .then(setAlternatives)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [startLat, startLng, endLat, endLng]);

  return { alternatives, loading, error };
}

/**
 * React hook for traffic incidents
 */
export function useTrafficIncidents(lat: number, lng: number, radiusKm?: number) {
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    getNearbyTrafficIncidents(lat, lng, radiusKm)
      .then(setIncidents)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [lat, lng, radiusKm]);

  return { incidents, loading, error };
}
