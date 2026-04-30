import { describe, expect, it } from 'vitest';

import { OPTIMIZE_RIDE_FLOW } from '../../../src/services/rideOptimization';

describe('OPTIMIZE_RIDE_FLOW()', () => {
  it('matches riders to the nearest optimal drivers without double-assigning supply', () => {
    const output = OPTIMIZE_RIDE_FLOW({
      real_time_driver_locations: [
        {
          driver_id: 'driver-amman',
          location: { lat: 31.9542, lng: 35.9108, label: 'Amman' },
          availability: 'available',
          acceptance_rate: 0.94,
          vehicle_capacity: 4,
          updated_at: '2026-04-28T09:58:00.000Z',
        },
        {
          driver_id: 'driver-irbid',
          location: { lat: 32.5571, lng: 35.8482, label: 'Irbid' },
          availability: 'available',
          acceptance_rate: 0.88,
          vehicle_capacity: 4,
          updated_at: '2026-04-28T09:58:30.000Z',
        },
      ],
      active_ride_requests: [
        {
          request_id: 'req-aqaba',
          rider_id: 'rider-1',
          pickup: { lat: 31.9539, lng: 35.9106, label: 'Amman' },
          dropoff: { lat: 29.5321, lng: 35.006, label: 'Aqaba' },
          requested_at: '2026-04-28T09:55:00.000Z',
          seats_requested: 1,
          trip_state: 'requested',
        },
        {
          request_id: 'req-jerash',
          rider_id: 'rider-2',
          pickup: { lat: 32.5568, lng: 35.8479, label: 'Irbid' },
          dropoff: { lat: 32.2744, lng: 35.8961, label: 'Jerash' },
          requested_at: '2026-04-28T09:57:00.000Z',
          seats_requested: 1,
          trip_state: 'requested',
        },
      ],
      historical_demand_data: [],
      system_health_metrics: {
        api_latency_ms: 120,
        payment_success_rate: 0.98,
        trip_state_consistency: 0.99,
        cancellation_rate: 0.04,
        delay_rate: 0.06,
      },
    });

    const aqabaMatch = output.optimized_matches.find(match => match.request_id === 'req-aqaba');
    const jerashMatch = output.optimized_matches.find(match => match.request_id === 'req-jerash');

    expect(aqabaMatch?.driver_id).toBe('driver-amman');
    expect(jerashMatch?.driver_id).toBe('driver-irbid');
    expect(aqabaMatch?.driver_id).not.toBe(jerashMatch?.driver_id);
    expect(aqabaMatch?.pickup_eta_ms ?? 0).toBeGreaterThanOrEqual(0);
    expect(jerashMatch?.route_distance_km ?? 0).toBeGreaterThan(0);
  });

  it('applies surge pricing when live demand outruns available supply', () => {
    const output = OPTIMIZE_RIDE_FLOW({
      real_time_driver_locations: [
        {
          driver_id: 'single-driver',
          location: { lat: 31.954, lng: 35.911, label: 'Amman' },
          availability: 'available',
          acceptance_rate: 97,
          vehicle_capacity: 4,
        },
      ],
      active_ride_requests: [
        {
          request_id: 'req-1',
          rider_id: 'rider-1',
          pickup: { lat: 31.9539, lng: 35.9106, label: 'Amman' },
          dropoff: { lat: 29.5321, lng: 35.006, label: 'Aqaba' },
          trip_state: 'requested',
        },
        {
          request_id: 'req-2',
          rider_id: 'rider-2',
          pickup: { lat: 31.9541, lng: 35.9107, label: 'Amman' },
          dropoff: { lat: 29.5321, lng: 35.006, label: 'Aqaba' },
          trip_state: 'requested',
        },
        {
          request_id: 'req-3',
          rider_id: 'rider-3',
          pickup: { lat: 31.9543, lng: 35.9109, label: 'Amman' },
          dropoff: { lat: 29.5321, lng: 35.006, label: 'Aqaba' },
          trip_state: 'requested',
        },
      ],
      historical_demand_data: [
        {
          corridor_key: 'amman__aqaba',
          demand_count: 120,
          completed_count: 110,
          cancelled_count: 6,
          average_fare_multiplier: 1.12,
        },
      ],
      system_health_metrics: {
        api_latency_ms: 100,
        payment_success_rate: 0.99,
        trip_state_consistency: 0.99,
      },
    });

    const surgePrice = output.dynamic_prices.find(price => price.request_id === 'req-1');

    expect(surgePrice?.price_tier).toBe('surge');
    expect(surgePrice?.price_multiplier ?? 0).toBeGreaterThan(1.1);
    expect(surgePrice?.final_price ?? 0).toBeGreaterThan(surgePrice?.base_price ?? 0);
  });

  it('raises system alerts, retries failed payments, and closes completed rides', () => {
    const output = OPTIMIZE_RIDE_FLOW({
      real_time_driver_locations: [
        {
          driver_id: 'driver-1',
          location: { lat: 31.9539, lng: 35.9106, label: 'Amman' },
          availability: 'available',
          acceptance_rate: 0.9,
        },
      ],
      active_ride_requests: [
        {
          request_id: 'ride-complete',
          rider_id: 'rider-1',
          pickup: { lat: 31.9539, lng: 35.9106, label: 'Amman' },
          dropoff: { lat: 32.0728, lng: 36.088, label: 'Zarqa' },
          matched_driver_id: 'driver-1',
          trip_state: 'dropoff_reached',
          payment_status: 'failed',
        },
      ],
      historical_demand_data: [
        {
          corridor_key: 'amman__zarqa',
          demand_count: 100,
          completed_count: 94,
          cancelled_count: 5,
          delayed_count: 7,
          average_delay_minutes: 6,
        },
      ],
      system_health_metrics: {
        api_latency_ms: 900,
        payment_success_rate: 0.82,
        trip_state_consistency: 0.91,
        cancellation_rate: 0.18,
        delay_rate: 0.24,
      },
    });

    expect(output.completed_rides).toEqual([
      expect.objectContaining({
        request_id: 'ride-complete',
        driver_id: 'driver-1',
        status: 'completed',
        payment_status: 'retry_required',
        feedback_required: true,
      }),
    ]);

    expect(output.system_alerts.map(alert => alert.type)).toEqual(
      expect.arrayContaining([
        'latency',
        'payments',
        'trip_state',
        'cancellations',
        'delays',
        'payment_retry',
      ]),
    );
  });
});
