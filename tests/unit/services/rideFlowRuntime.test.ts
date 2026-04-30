import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetConnectedRides = vi.fn();
const mockGetRideBookings = vi.fn();
const mockGetGrowthEventFeed = vi.fn();
const mockGetTripDriverLocations = vi.fn();
const mockGenerateDashboard = vi.fn();
const mockGetAllHealthStatus = vi.fn();
const mockCheckAllServices = vi.fn();

vi.mock('../../../src/services/journeyLogistics', () => ({
  getConnectedRides: () => mockGetConnectedRides(),
}));

vi.mock('../../../src/services/rideLifecycle', () => ({
  getRideBookings: () => mockGetRideBookings(),
}));

vi.mock('../../../src/services/growthEngine', () => ({
  getGrowthEventFeed: () => mockGetGrowthEventFeed(),
}));

vi.mock('../../../src/services/driverTracking', () => ({
  getTripDriverLocations: (...args: unknown[]) => mockGetTripDriverLocations(...args),
}));

vi.mock('../../../src/platform/observability/performanceMonitor', () => ({
  performanceMonitor: {
    generateDashboard: () => mockGenerateDashboard(),
  },
}));

vi.mock('../../../src/platform/microservices/healthMonitor', () => ({
  serviceHealthMonitor: {
    getAllHealthStatus: () => mockGetAllHealthStatus(),
    checkAllServices: () => mockCheckAllServices(),
  },
}));

import {
  buildLiveRideFlowOptimizationInput,
  getLiveRideFlowOptimization,
} from '../../../src/services/rideFlowRuntime';

describe('rideFlowRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConnectedRides.mockReturnValue([
      {
        id: 'ride-1',
        ownerId: 'driver-1',
        from: 'Amman',
        to: 'Aqaba',
        date: '2026-04-28',
        time: '09:00',
        seats: 4,
        price: 12,
        gender: 'any',
        prayer: false,
        carModel: 'Sedan',
        note: '',
        acceptsPackages: false,
        packageCapacity: 'medium',
        packageNote: '',
        createdAt: '2026-04-28T08:00:00.000Z',
        status: 'active',
      },
    ]);
    mockGetRideBookings.mockReturnValue([
      {
        id: 'booking-1',
        rideId: 'ride-1',
        ownerId: 'driver-1',
        from: 'Amman',
        to: 'Aqaba',
        date: '2026-04-28',
        time: '09:00',
        driverName: 'Captain One',
        passengerName: 'Rider One',
        seatsRequested: 2,
        status: 'confirmed',
        paymentStatus: 'authorized',
        routeMode: 'live_post',
        supportThreadOpen: false,
        ticketCode: 'RIDE-100001',
        totalPriceJod: 24,
        pricePerSeatJod: 12,
        createdAt: '2026-04-28T08:10:00.000Z',
        updatedAt: '2026-04-28T08:20:00.000Z',
      },
      {
        id: 'booking-2',
        rideId: 'ride-1',
        ownerId: 'driver-1',
        from: 'Amman',
        to: 'Aqaba',
        date: '2026-04-27',
        time: '09:00',
        driverName: 'Captain One',
        passengerName: 'Rider Two',
        seatsRequested: 1,
        status: 'completed',
        paymentStatus: 'captured',
        routeMode: 'live_post',
        supportThreadOpen: true,
        ticketCode: 'RIDE-100002',
        totalPriceJod: 12,
        pricePerSeatJod: 12,
        createdAt: '2026-04-27T08:10:00.000Z',
        updatedAt: '2026-04-27T11:20:00.000Z',
      },
    ]);
    mockGetGrowthEventFeed.mockReturnValue([
      {
        eventName: 'ride_booking_started',
        funnelStage: 'booked',
        serviceType: 'ride',
        from: 'Amman',
        to: 'Aqaba',
        createdAt: '2026-04-26T08:00:00.000Z',
      },
    ]);
    mockGetTripDriverLocations.mockResolvedValue([
      {
        driverId: 'driver-1',
        tripId: 'ride-1',
        latitude: 31.9539,
        longitude: 35.9106,
        accuracy: 8,
        speed: 42,
        heading: 90,
        timestamp: '2026-04-28T08:21:00.000Z',
        isLive: true,
      },
    ]);
    mockGenerateDashboard.mockReturnValue({
      timestamp: Date.now(),
      api: {
        totalRequests: 100,
        successRate: 96,
        avgResponseTime: 120,
        p95ResponseTime: 180,
        errorRate: 4,
      },
      services: {
        healthy: 5,
        degraded: 1,
        down: 0,
      },
      user: { totalActions: 0, topActions: [] },
      system: {},
    });
    mockGetAllHealthStatus.mockReturnValue({
      bookings: {
        name: 'bookings',
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 80,
        uptime: 100,
      },
      payments: {
        name: 'payments',
        status: 'degraded',
        lastCheck: Date.now(),
        responseTime: 220,
        uptime: 97,
      },
    });
    mockCheckAllServices.mockResolvedValue(undefined);
  });

  it('builds live optimization input from bookings, driver locations, growth, and health', async () => {
    const input = await buildLiveRideFlowOptimizationInput({ refreshHealth: true });

    expect(mockCheckAllServices).toHaveBeenCalled();
    expect(input.real_time_driver_locations).toEqual([
      expect.objectContaining({
        driver_id: 'driver-1',
        availability: 'available',
        current_load: 2,
      }),
    ]);
    expect(input.active_ride_requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          request_id: 'booking-1',
          matched_driver_id: 'driver-1',
          trip_state: 'in_progress',
        }),
        expect.objectContaining({
          request_id: 'booking-2',
          trip_state: 'completed',
          payment_status: 'paid',
        }),
      ]),
    );
    expect(input.historical_demand_data.length).toBeGreaterThan(0);
    expect(input.system_health_metrics.api_latency_ms).toBe(180);
    expect(input.system_health_metrics.payment_success_rate).toBe(0.96);
  });

  it('produces a runtime optimization snapshot from the live input', async () => {
    const snapshot = await getLiveRideFlowOptimization({ latency_target_ms: 150 });

    expect(snapshot.input.active_ride_requests).toHaveLength(2);
    expect(snapshot.output.dynamic_prices).toHaveLength(2);
    expect(snapshot.output.optimized_matches[0]?.driver_id).toBe('driver-1');
    expect(snapshot.output.system_alerts.map(alert => alert.type)).toEqual(
      expect.arrayContaining(['latency', 'trip_state', 'delays']),
    );
  });
});
