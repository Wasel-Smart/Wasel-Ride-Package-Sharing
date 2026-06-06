/**
 * Ride Matching Service
 * Independent backend service for ride request processing and driver matching
 * 
 * Responsibilities:
 * - Consume rides.requested events
 * - Execute geospatial driver matching
 * - Publish rides.assigned events
 * - Handle retry logic and circuit breakers
 */

import type { DomainEventEnvelope } from '../../../src/domain/events';
import { eventBroker } from '../../../src/platform/event-broker-redis';

interface RideRequest {
  rideId: string;
  riderId: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  requestedAt: string;
  seats: number;
  preferredVehicleType?: string;
}

interface Driver {
  driverId: string;
  vehicleId: string;
  location: { lat: number; lng: number };
  availableSeats: number;
  rating: number;
  status: 'available' | 'busy';
}

interface MatchResult {
  rideId: string;
  driverId: string;
  vehicleId: string;
  matchScore: number;
  estimatedArrival: number;
}

/**
 * Geospatial Matching Engine
 * Uses PostGIS + Redis GEO for driver discovery
 */
class MatchingEngine {
  private readonly MAX_SEARCH_RADIUS_KM = 10;
  private readonly MIN_DRIVER_RATING = 4.0;

  async findNearbyDrivers(
    origin: { lat: number; lng: number },
    seats: number,
    radiusKm: number = 5,
  ): Promise<Driver[]> {
    // In production: Query Redis GEORADIUS or PostGIS ST_DWithin
    // SELECT driver_id, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat
    // FROM driver_availability
    // WHERE status = 'available' 
    //   AND available_seats >= $1
    //   AND ST_DWithin(
    //     location::geography,
    //     ST_MakePoint($2, $3)::geography,
    //     $4 * 1000 -- radius in meters
    //   )
    // ORDER BY ST_Distance(location::geography, ST_MakePoint($2, $3)::geography)
    // LIMIT 20

    return []; // Mock - replace with actual query
  }

  async scoreDrivers(
    drivers: Driver[],
    request: RideRequest,
  ): Promise<Array<Driver & { score: number }>> {
    return drivers.map(driver => {
      const distance = this.calculateDistance(driver.location, request.origin);
      const ratingScore = driver.rating / 5.0;
      const proximityScore = Math.max(0, 1 - distance / this.MAX_SEARCH_RADIUS_KM);
      
      // Weighted scoring: 60% proximity, 40% rating
      const score = proximityScore * 0.6 + ratingScore * 0.4;

      return { ...driver, score };
    });
  }

  async executeMatch(
    request: RideRequest,
    candidates: Array<Driver & { score: number }>,
  ): Promise<MatchResult | null> {
    if (candidates.length === 0) return null;

    // Pick highest scoring available driver
    const topDriver = candidates.sort((a, b) => b.score - a.score)[0];

    // Reserve driver (optimistic locking)
    const reserved = await this.reserveDriver(topDriver.driverId, request.rideId);
    if (!reserved) return null;

    return {
      rideId: request.rideId,
      driverId: topDriver.driverId,
      vehicleId: topDriver.vehicleId,
      matchScore: topDriver.score,
      estimatedArrival: Math.ceil(this.calculateDistance(topDriver.location, request.origin) * 3), // rough ETA
    };
  }

  private async reserveDriver(driverId: string, rideId: string): Promise<boolean> {
    // UPDATE driver_availability
    // SET status = 'reserved', reserved_for_ride_id = $1, reserved_at = NOW()
    // WHERE driver_id = $2 AND status = 'available'
    // RETURNING driver_id
    return true; // Mock
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
  ): number {
    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) *
        Math.cos(this.toRad(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

/**
 * Ride Matching Service
 * Stateless service that consumes ride requests and publishes assignments
 */
export class RideMatchingService {
  private engine = new MatchingEngine();
  private unsubscribe?: () => Promise<void>;

  async start(): Promise<void> {
    console.log('[RideMatchingService] Starting service...');

    // Subscribe to rides.requested topic
    this.unsubscribe = await eventBroker.subscribe(
      'rides.requested',
      this.handleRideRequest.bind(this),
      {
        groupName: 'ride-matching-service',
        consumerName: `matching-worker-${process.env.HOSTNAME || 'local'}`,
        blockMs: 5000,
        count: 10,
      },
    );

    console.log('[RideMatchingService] Service started, consuming rides.requested events');
  }

  async stop(): Promise<void> {
    if (this.unsubscribe) {
      await this.unsubscribe();
    }
    console.log('[RideMatchingService] Service stopped');
  }

  private async handleRideRequest(event: DomainEventEnvelope<'rides.requested'>): Promise<void> {
    const startTime = Date.now();
    console.log(`[RideMatchingService] Processing ride request: ${event.id}`);

    try {
      const request: RideRequest = event.payload as any;

      // Step 1: Find nearby drivers
      const drivers = await this.engine.findNearbyDrivers(
        request.origin,
        request.seats,
        5, // 5km initial radius
      );

      if (drivers.length === 0) {
        console.log(`[RideMatchingService] No drivers found for ride ${request.rideId}`);
        // Publish no-drivers-available event or retry with larger radius
        return;
      }

      // Step 2: Score candidates
      const scored = await this.engine.scoreDrivers(drivers, request);

      // Step 3: Execute match
      const match = await this.engine.executeMatch(request, scored);

      if (!match) {
        console.log(`[RideMatchingService] Match failed for ride ${request.rideId}`);
        return;
      }

      // Step 4: Publish rides.assigned event
      await eventBroker.publish({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'rides.assigned',
        payload: {
          rideId: match.rideId,
          driverId: match.driverId,
          vehicleId: match.vehicleId,
          matchedAt: new Date().toISOString(),
          estimatedArrival: match.estimatedArrival,
        } as any,
        producer: 'ride-matching-service',
        traceId: event.traceId,
        occurredAt: new Date().toISOString(),
      });

      const duration = Date.now() - startTime;
      console.log(`[RideMatchingService] Match completed in ${duration}ms for ride ${request.rideId}`);
    } catch (error) {
      console.error(`[RideMatchingService] Error processing ride request:`, error);
      throw error; // Will be handled by worker framework retry logic
    }
  }
}

// Service entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new RideMatchingService();
  
  process.on('SIGTERM', async () => {
    console.log('[RideMatchingService] SIGTERM received, shutting down...');
    await service.stop();
    await eventBroker.disconnect();
    process.exit(0);
  });

  service.start().catch(error => {
    console.error('[RideMatchingService] Fatal error:', error);
    process.exit(1);
  });
}
