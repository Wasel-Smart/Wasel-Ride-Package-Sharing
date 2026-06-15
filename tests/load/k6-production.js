/**
 * Comprehensive k6 load testing suite for Wasel platform
 * Tests realistic production scenarios with SLO validation
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const rideRequestLatency = new Trend('ride_request_latency');
const packageRequestLatency = new Trend('package_request_latency');
const paymentLatency = new Trend('payment_latency');
const errorRate = new Rate('error_rate');
const apiCallCounter = new Counter('api_calls');

// SLO thresholds from reliability-slos.md
const SLO_THRESHOLDS = {
  ride_matching_p95: 700, // ms
  package_delivery_p95: 400, // ms
  payment_p95: 350, // ms
  api_gateway_p95: 250, // ms
  error_rate_max: 0.01, // 1%
};

export const options = {
  stages: [
    // Warm-up
    { duration: '1m', target: 10 },
    // Ramp to normal load
    { duration: '3m', target: 50 },
    // Sustained normal load
    { duration: '5m', target: 50 },
    // Peak load simulation
    { duration: '2m', target: 200 },
    // Stress test
    { duration: '2m', target: 500 },
    // Recovery
    { duration: '2m', target: 50 },
    // Cool down
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: [`p(95)<${SLO_THRESHOLDS.api_gateway_p95}`],
    http_req_failed: [`rate<${SLO_THRESHOLDS.error_rate_max}`],
    ride_request_latency: [`p(95)<${SLO_THRESHOLDS.ride_matching_p95}`],
    package_request_latency: [`p(95)<${SLO_THRESHOLDS.package_delivery_p95}`],
    payment_latency: [`p(95)<${SLO_THRESHOLDS.payment_p95}`],
    error_rate: [`rate<${SLO_THRESHOLDS.error_rate_max}`],
  },
  ext: {
    loadimpact: {
      projectID: __ENV.K6_PROJECT_ID,
      name: 'Wasel Production Load Test',
    },
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5173';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const HAS_AUTH_TOKEN = AUTH_TOKEN.trim().length > 0;
const PUBLIC_PATHS = ['/', '/app/find-ride', '/app/packages', '/app/payments'];

// Test data pools
const ORIGINS = [
  { lat: 31.9539, lng: 35.9106 }, // Amman
  { lat: 32.5556, lng: 35.8469 }, // Irbid
  { lat: 30.3285, lng: 35.4444 }, // Aqaba
  { lat: 32.2701, lng: 36.7100 }, // Zarqa
];

const DESTINATIONS = [
  { lat: 31.9700, lng: 35.9000 },
  { lat: 32.5400, lng: 35.8600 },
  { lat: 30.3100, lng: 35.4600 },
  { lat: 32.2900, lng: 36.7300 },
];

function getRandomLocation(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateRideRequest() {
  const origin = getRandomLocation(ORIGINS);
  const destination = getRandomLocation(DESTINATIONS);

  return {
    origin,
    destination,
    passengers: Math.floor(Math.random() * 3) + 1,
    departureTime: new Date(Date.now() + Math.random() * 3600000).toISOString(),
  };
}

function generatePackageDelivery() {
  const pickup = getRandomLocation(ORIGINS);
  const dropoff = getRandomLocation(DESTINATIONS);

  return {
    pickup,
    dropoff,
    packageSize: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
    urgent: Math.random() > 0.7,
  };
}

function parseJsonBody(response) {
  try {
    return response.body ? JSON.parse(response.body) : {};
  } catch {
    return {};
  }
}

export default function () {
  if (!HAS_AUTH_TOKEN) {
    group('Public Site Flow', function () {
      const path = PUBLIC_PATHS[Math.floor(Math.random() * PUBLIC_PATHS.length)];
      const response = http.get(`${BASE_URL}${path}`);
      const duration = response.timings.duration;

      if (path.includes('find-ride')) rideRequestLatency.add(duration);
      else if (path.includes('packages')) packageRequestLatency.add(duration);
      else if (path.includes('payments')) paymentLatency.add(duration);

      apiCallCounter.add(1);

      const publicSuccess = check(response, {
        'public page status is 200': (r) => r.status === 200,
        'public page latency < 800ms': (r) => r.timings.duration < 800,
      });

      errorRate.add(publicSuccess ? 0 : 1);
      sleep(1);
    });

    return;
  }

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  };

  // Ride Request Flow (60% of traffic)
  if (Math.random() < 0.6) {
    group('Ride Request Flow', function () {
      const ridePayload = JSON.stringify(generateRideRequest());

      const rideStart = Date.now();
      const rideResponse = http.post(`${BASE_URL}/api/rides/request`, ridePayload, params);
      const rideLatency = Date.now() - rideStart;

      rideRequestLatency.add(rideLatency);
      apiCallCounter.add(1);

      const rideSuccess = check(rideResponse, {
        'ride request status is 200': (r) => r.status === 200,
        'ride request has trip_id': (r) => parseJsonBody(r).trip_id !== undefined,
        'ride request latency < 700ms': () => rideLatency < 700,
      });

      if (!rideSuccess) errorRate.add(1);
      else errorRate.add(0);

      // Simulate user checking ride status
      sleep(2);

      if (rideResponse.status === 200) {
        const tripId = parseJsonBody(rideResponse).trip_id;
        if (!tripId) return;

        const statusResponse = http.get(`${BASE_URL}/api/rides/${tripId}/status`, params);

        check(statusResponse, {
          'ride status check is 200': (r) => r.status === 200,
        });
      }
    });
  }

  // Package Delivery Flow (25% of traffic)
  else if (Math.random() < 0.85) {
    group('Package Delivery Flow', function () {
      const packagePayload = JSON.stringify(generatePackageDelivery());

      const packageStart = Date.now();
      const packageResponse = http.post(
        `${BASE_URL}/api/packages/request`,
        packagePayload,
        params,
      );
      const packageLatency = Date.now() - packageStart;

      packageRequestLatency.add(packageLatency);
      apiCallCounter.add(1);

      const packageSuccess = check(packageResponse, {
        'package request status is 200': (r) => r.status === 200,
        'package request has delivery_id': (r) => parseJsonBody(r).delivery_id !== undefined,
        'package request latency < 400ms': () => packageLatency < 400,
      });

      if (!packageSuccess) errorRate.add(1);
      else errorRate.add(0);

      sleep(1);
    });
  }

  // Payment Flow (15% of traffic)
  else {
    group('Payment Flow', function () {
      const paymentPayload = JSON.stringify({
        amount: Math.floor(Math.random() * 5000) + 500, // 500-5500 fils
        currency: 'JOD',
        payment_method: 'card',
      });

      const paymentStart = Date.now();
      const paymentResponse = http.post(
        `${BASE_URL}/api/payments/authorize`,
        paymentPayload,
        params,
      );
      const paymentDuration = Date.now() - paymentStart;

      paymentLatency.add(paymentDuration);
      apiCallCounter.add(1);

      const paymentSuccess = check(paymentResponse, {
        'payment authorization status is 200': (r) => r.status === 200,
        'payment has transaction_id': (r) => parseJsonBody(r).transaction_id !== undefined,
        'payment latency < 350ms': () => paymentDuration < 350,
      });

      if (!paymentSuccess) errorRate.add(1);
      else errorRate.add(0);
    });
  }

  sleep(Math.random() * 3); // Random user think time
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors !== undefined ? options.enableColors : true;

  let summary = `${indent}
╔═══════════════════════════════════════════════════════════════════╗
║           Wasel Platform Load Test Results                       ║
╚═══════════════════════════════════════════════════════════════════╝

Test Duration: ${data.state.testRunDurationMs / 1000}s
Virtual Users: ${data.metrics.vus.values.max} (max)
Total Requests: ${data.metrics.http_reqs.values.count}

SLO Compliance:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  // Check SLO compliance
  const rideP95 = data.metrics.ride_request_latency?.values['p(95)'] || 0;
  const packageP95 = data.metrics.package_request_latency?.values['p(95)'] || 0;
  const paymentP95 = data.metrics.payment_latency?.values['p(95)'] || 0;
  const apiP95 = data.metrics.http_req_duration?.values['p(95)'] || 0;
  const errRate = data.metrics.error_rate?.values.rate || 0;

  const checkMark = enableColors ? '✓' : 'OK';
  const crossMark = enableColors ? '✗' : 'FAIL';

  summary += `${indent}Ride Matching p95: ${rideP95.toFixed(2)}ms ${rideP95 < SLO_THRESHOLDS.ride_matching_p95 ? checkMark : crossMark} (target: <${SLO_THRESHOLDS.ride_matching_p95}ms)\n`;
  summary += `${indent}Package Delivery p95: ${packageP95.toFixed(2)}ms ${packageP95 < SLO_THRESHOLDS.package_delivery_p95 ? checkMark : crossMark} (target: <${SLO_THRESHOLDS.package_delivery_p95}ms)\n`;
  summary += `${indent}Payment p95: ${paymentP95.toFixed(2)}ms ${paymentP95 < SLO_THRESHOLDS.payment_p95 ? checkMark : crossMark} (target: <${SLO_THRESHOLDS.payment_p95}ms)\n`;
  summary += `${indent}API Gateway p95: ${apiP95.toFixed(2)}ms ${apiP95 < SLO_THRESHOLDS.api_gateway_p95 ? checkMark : crossMark} (target: <${SLO_THRESHOLDS.api_gateway_p95}ms)\n`;
  summary += `${indent}Error Rate: ${(errRate * 100).toFixed(2)}% ${errRate < SLO_THRESHOLDS.error_rate_max ? checkMark : crossMark} (target: <${SLO_THRESHOLDS.error_rate_max * 100}%)\n`;

  summary += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return summary;
}
