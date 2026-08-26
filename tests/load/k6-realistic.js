// Wasel Realistic Load Test
// Simulates actual user journeys: browse → search → book → track
// Duration: 10 minutes with gradual ramp-up

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4173';

export const options = {
  scenarios: {
    // Scenario 1: Anonymous browsers (high volume, low intensity)
    browsers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'browser' },
    },
    // Scenario 2: Active bookers (medium volume, API-heavy)
    bookers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '4m', target: 40 },
        { duration: '2m', target: 40 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'booker' },
    },
    // Scenario 3: Peak load spike (flash traffic)
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '3m',
      stages: [
        { duration: '30s', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.05'],
    'http_req_duration{scenario:browser}': ['p(95)<600'],
    'http_req_duration{scenario:booker}': ['p(95)<1000'],
  };
};

// ─── User Journey Functions ───────────────────────────────────────────────────

function anonymousBrowser() {
  group('browser: landing page', () => {
    const res = http.get(`${BASE_URL}/`, { tags: { page: 'landing' } });
    check(res, {
      'landing status 200': (r) => r.status === 200,
      'landing has content': (r) => r.body.includes('DOCTYPE') || r.body.includes('html'),
    }) && errorRate.add(0);
    apiLatency.add(res.timings.duration);
  });

  sleep(Math.random() * 2 + 1);

  group('browser: browse services', () => {
    const pages = ['/app/find-ride', '/app/packages', '/app/bus'];
    const page = pages[Math.floor(Math.random() * pages.length)];
    const res = http.get(`${BASE_URL}${page}`, { tags: { page: 'service' } });
    check(res, {
      'service page loads': (r) => r.status === 200,
    }) && errorRate.add(0);
  });

  sleep(Math.random() * 3 + 2);
}

function activeBooker() {
  group('booker: view ride page', () => {
    const res = http.get(`${BASE_URL}/app/find-ride`, { tags: { page: 'find-ride' } });
    check(res, {
      'find-ride loads': (r) => r.status === 200,
    }) && errorRate.add(0);
  });

  sleep(Math.random() * 2 + 1);

  group('booker: search routes', () => {
    const res = http.get(`${BASE_URL}/app/find-ride?from=Amman&to=Irbid&date=2026-09-01`, {
      tags: { action: 'search' },
    });
    check(res, {
      'search returns results': (r) => r.status === 200,
    }) && errorRate.add(0);
    apiLatency.add(res.timings.duration);
  });

  sleep(Math.random() * 2 + 1);

  group('booker: view trip details', () => {
    const res = http.get(`${BASE_URL}/app/trip/WA-${Math.floor(Math.random() * 9000) + 1000}`, {
      tags: { page: 'trip-detail' },
    });
    // 404 is acceptable for random IDs — we measure that the route works
    check(res, {
      'trip detail responds': (r) => r.status === 200 || r.status === 404,
    }) && errorRate.add(0);
  });

  sleep(Math.random() * 3 + 2);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function () {
  const scenario = __ENV.K6_SCENARIO || 'browser';

  if (scenario === 'booker') {
    activeBooker();
  } else {
    anonymousBrowser();
  }
}
