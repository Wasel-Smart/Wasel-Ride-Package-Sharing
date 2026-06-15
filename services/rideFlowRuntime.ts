import { getConnectedRides, type PostedRide } from './journeyLogistics';
import { getRideBookings, type RideBookingRecord } from './rideLifecycle';
import { getGrowthEventFeed } from './growthEngine';
import { getTripDriverLocations, type DriverLocation } from './driverTracking';
import {
  optimizeRideFlow,
  type ActiveRideRequest,
  type HistoricalDemandDatum,
  type OptimizeRideFlowOptions,
  type OptimizeRideFlowOutput,
  type RealTimeDriverLocation,
  type SystemHealthMetric,
} from './rideOptimization';
import { performanceMonitor } from '../platform/observability/performanceMonitor';
import { serviceHealthMonitor } from '../platform/microservices/healthMonitor';
import { resolveJordanLocationCoord } from '../utils/jordanLocations';

export interface RideFlowRuntimeOptions extends OptimizeRideFlowOptions {
  refreshHealth?: boolean;
}

export interface RideFlowRuntimeSnapshot {
  generatedAt: string;
  input: {
    real_time_driver_locations: RealTimeDriverLocation[];
    active_ride_requests: ActiveRideRequest[];
    historical_demand_data: HistoricalDemandDatum[];
    system_health_metrics: {
      metrics?: SystemHealthMetric[];
      api_latency_ms?: number;
      payment_success_rate?: number;
      trip_state_consistency?: number;
      cancellation_rate?: number;
      delay_rate?: number;
    };
  };
  output: OptimizeRideFlowOutput;
}

function roundNumber(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function uniqueLatestDriverLocations(
  rides: PostedRide[],
  driverLocationsByRide: DriverLocation[][],
  bookings: RideBookingRecord[],
) {
  const latestByDriver = new Map<string, RealTimeDriverLocation>();
  const bookingsByRide = bookings.reduce<Map<string, RideBookingRecord[]>>((accumulator, booking) => {
    const current = accumulator.get(booking.rideId) ?? [];
    current.push(booking);
    accumulator.set(booking.rideId, current);
    return accumulator;
  }, new Map());

  rides.forEach((ride, index) => {
    const locations = driverLocationsByRide[index] ?? [];
    const rideBookings = bookingsByRide.get(ride.id) ?? [];
    const seatsReserved = rideBookings
      .filter(booking => ['pending_driver', 'confirmed'].includes(booking.status))
      .reduce((sum, booking) => sum + Math.max(1, booking.seatsRequested ?? 1), 0);
    const completedTrips = rideBookings.filter(booking => booking.status === 'completed').length;
    const rejectedTrips = rideBookings.filter(booking => ['rejected', 'cancelled'].includes(booking.status)).length;
    const handledTrips = Math.max(1, completedTrips + rejectedTrips + rideBookings.filter(booking => booking.status === 'confirmed').length);
    const acceptanceRate = roundNumber((completedTrips + rideBookings.filter(booking => booking.status === 'confirmed').length) / handledTrips, 2);
    const availability = ride.status === 'cancelled' || ride.status === 'completed'
      ? 'offline'
      : seatsReserved >= Math.max(1, ride.seats)
        ? 'busy'
        : 'available';

    for (const location of locations) {
      const current = latestByDriver.get(location.driverId);
      if (current && new Date(current.updated_at ?? 0).getTime() >= new Date(location.timestamp).getTime()) {
        continue;
      }

      latestByDriver.set(location.driverId, {
        driver_id: location.driverId,
        location: {
          lat: location.latitude,
          lng: location.longitude,
          label: ride.from,
        },
        availability,
        acceptance_rate: acceptanceRate,
        vehicle_capacity: Math.max(1, ride.seats),
        current_load: seatsReserved,
        matched_request_id: rideBookings.find(booking => booking.status === 'pending_driver')?.id,
        updated_at: location.timestamp,
      });
    }
  });

  return Array.from(latestByDriver.values());
}

function toActiveRideRequest(
  booking: RideBookingRecord,
  ride?: PostedRide,
): ActiveRideRequest {
  const paymentStatus: ActiveRideRequest['payment_status'] =
    booking.paymentStatus === 'captured'
      ? 'paid'
      : booking.paymentStatus === 'failed'
        ? 'failed'
        : booking.paymentStatus === 'authorized'
          ? 'authorized'
          : 'pending';
  const tripState: ActiveRideRequest['trip_state'] =
    booking.status === 'completed'
      ? 'completed'
      : booking.status === 'cancelled' || booking.status === 'rejected'
        ? 'cancelled'
        : booking.status === 'confirmed'
          ? 'in_progress'
          : 'requested';

  return {
    request_id: booking.id,
    rider_id: booking.passengerEmail ?? booking.passengerPhone ?? booking.passengerName,
    pickup: {
      ...resolveJordanLocationCoord(booking.from),
      label: booking.from,
    },
    dropoff: {
      ...resolveJordanLocationCoord(booking.to),
      label: booking.to,
    },
    requested_at: booking.createdAt,
    seats_requested: Math.max(1, booking.seatsRequested ?? 1),
    base_fare: booking.totalPriceJod ?? booking.pricePerSeatJod,
    trip_state: tripState,
    payment_status: paymentStatus,
    matched_driver_id: ride?.ownerId,
  };
}

function toHistoricalDemandData(bookings: RideBookingRecord[]): HistoricalDemandDatum[] {
  const history = new Map<string, HistoricalDemandDatum>();

  for (const booking of bookings) {
    const hourOfDay = new Date(booking.createdAt).getHours();
    const key = `${booking.from}__${booking.to}__${hourOfDay}`;
    const current = history.get(key) ?? {
      corridor_key: `${booking.from.toLowerCase().replace(/\s+/g, '_')}__${booking.to.toLowerCase().replace(/\s+/g, '_')}`,
      pickup: { ...resolveJordanLocationCoord(booking.from), label: booking.from },
      dropoff: { ...resolveJordanLocationCoord(booking.to), label: booking.to },
      hour_of_day: hourOfDay,
      demand_count: 0,
      completed_count: 0,
      cancelled_count: 0,
      delayed_count: 0,
      average_fare_multiplier: 1,
      average_wait_minutes: 0,
      average_delay_minutes: 0,
    };

    current.demand_count = (current.demand_count ?? 0) + 1;
    current.completed_count = (current.completed_count ?? 0) + (booking.status === 'completed' ? 1 : 0);
    current.cancelled_count = (current.cancelled_count ?? 0) + (['cancelled', 'rejected'].includes(booking.status) ? 1 : 0);
    current.delayed_count = (current.delayed_count ?? 0) + (booking.supportThreadOpen ? 1 : 0);
    current.average_fare_multiplier = roundNumber(
      ((current.average_fare_multiplier ?? 1) + (booking.totalPriceJod && booking.pricePerSeatJod
        ? booking.totalPriceJod / Math.max(booking.pricePerSeatJod, 1)
        : 1)) / 2,
      2,
    );
    current.average_wait_minutes = roundNumber(
      ((current.average_wait_minutes ?? 0) + (booking.status === 'pending_driver' ? 8 : 3)) / 2,
      1,
    );
    current.average_delay_minutes = roundNumber(
      ((current.average_delay_minutes ?? 0) + (booking.supportThreadOpen ? 12 : 2)) / 2,
      1,
    );

    history.set(key, current);
  }

  for (const event of getGrowthEventFeed()) {
    if (event.serviceType !== 'ride' || !event.from || !event.to) {
      continue;
    }

    const hourOfDay = new Date(event.createdAt).getHours();
    const key = `${event.from}__${event.to}__${hourOfDay}`;
    const current = history.get(key) ?? {
      corridor_key: `${event.from.toLowerCase().replace(/\s+/g, '_')}__${event.to.toLowerCase().replace(/\s+/g, '_')}`,
      pickup: { ...resolveJordanLocationCoord(event.from), label: event.from },
      dropoff: { ...resolveJordanLocationCoord(event.to), label: event.to },
      hour_of_day: hourOfDay,
      demand_count: 0,
      completed_count: 0,
      cancelled_count: 0,
      delayed_count: 0,
      average_fare_multiplier: 1,
      average_wait_minutes: 0,
      average_delay_minutes: 0,
    };

    if (['searched', 'selected', 'booked', 'completed'].includes(event.funnelStage)) {
      current.demand_count = (current.demand_count ?? 0) + 1;
    }
    if (event.funnelStage === 'completed') {
      current.completed_count = (current.completed_count ?? 0) + 1;
    }
    if (event.funnelStage === 'cancelled') {
      current.cancelled_count = (current.cancelled_count ?? 0) + 1;
    }

    history.set(key, current);
  }

  return Array.from(history.values());
}

async function buildSystemHealthMetrics(refreshHealth: boolean | undefined) {
  if (refreshHealth) {
    await serviceHealthMonitor.checkAllServices().catch(() => undefined);
  }

  const dashboard = performanceMonitor.generateDashboard();
  const serviceMetrics = Object.values(serviceHealthMonitor.getAllHealthStatus()).map((health) => ({
    service: health.name,
    status: health.status,
    latency_ms: health.responseTime,
    success_rate: health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.75 : 0.2,
    error_rate: health.status === 'down' ? 1 : health.status === 'degraded' ? 0.25 : 0,
  })) satisfies SystemHealthMetric[];

  const healthyServices = dashboard.services.healthy + dashboard.services.degraded + dashboard.services.down;
  const tripStateConsistency = healthyServices > 0
    ? (dashboard.services.healthy + dashboard.services.degraded * 0.5) / healthyServices
    : 1;

  return {
    metrics: serviceMetrics,
    api_latency_ms: roundNumber(dashboard.api.p95ResponseTime || dashboard.api.avgResponseTime || 0, 0),
    payment_success_rate: roundNumber(dashboard.api.successRate / 100, 2),
    trip_state_consistency: roundNumber(tripStateConsistency, 2),
    cancellation_rate: 0,
    delay_rate: 0,
  };
}

export async function buildLiveRideFlowOptimizationInput(
  options: Pick<RideFlowRuntimeOptions, 'refreshHealth'> = {},
) {
  const rides = getConnectedRides();
  const bookings = getRideBookings();
  const activeRides = rides.filter(ride => ride.status !== 'cancelled');
  const driverLocationsByRide = await Promise.all(
    activeRides.map(async ride => getTripDriverLocations(ride.id).catch(() => [])),
  );
  const driverLocations = uniqueLatestDriverLocations(activeRides, driverLocationsByRide, bookings);
  const ridesById = new Map(rides.map(ride => [ride.id, ride]));
  const activeRideRequests = bookings.map(booking => toActiveRideRequest(booking, ridesById.get(booking.rideId)));
  const historicalDemandData = toHistoricalDemandData(bookings);
  const systemHealthMetrics = await buildSystemHealthMetrics(options.refreshHealth);

  const requestCount = activeRideRequests.length || 1;
  const cancellationCount = activeRideRequests.filter(request => request.trip_state === 'cancelled').length;
  const delayCount = bookings.filter(booking => booking.supportThreadOpen).length;

  systemHealthMetrics.cancellation_rate = roundNumber(cancellationCount / requestCount, 2);
  systemHealthMetrics.delay_rate = roundNumber(delayCount / requestCount, 2);

  return {
    real_time_driver_locations: driverLocations,
    active_ride_requests: activeRideRequests,
    historical_demand_data: historicalDemandData,
    system_health_metrics: systemHealthMetrics,
  };
}

export async function getLiveRideFlowOptimization(
  options: RideFlowRuntimeOptions = {},
): Promise<RideFlowRuntimeSnapshot> {
  const input = await buildLiveRideFlowOptimizationInput({ refreshHealth: options.refreshHealth });
  const output = optimizeRideFlow(input, options);

  return {
    generatedAt: new Date().toISOString(),
    input,
    output,
  };
}
