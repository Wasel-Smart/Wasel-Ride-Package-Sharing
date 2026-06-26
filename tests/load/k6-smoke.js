// Wasel Smoke Load Test - Quick health check for production deployment
// Duration: 30s, 5-10 VUs - validates basic endpoints respond

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://wasel14.online';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '10s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 500ms': (r) => r.timings.duration < 500,
  });

  const indexRes = http.get(BASE_URL);
  check(indexRes, {
    'index status is 200': (r) => r.status === 200,
    'index response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  const apiRes = http.get(`${BASE_URL}/api/health`, {
    headers: { 'apikey': __ENV.API_KEY || 'test-key' },
  });
  check(apiRes, {
    'api health responds': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}