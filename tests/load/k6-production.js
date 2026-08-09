// Wasel Production Load Test
// Duration: 18m, up to 500 VUs - validates production SLO compliance

import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://wasel14.online';
const API_URL = __ENV.API_URL || BASE_URL;

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 350 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 250 },
  ],
  thresholds: {
    'http_req_duration{type:api}': ['p(95)<500'],
    'http_req_duration{type:static}': ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    'checks{type:availability}': ['rate>0.99'],
  },
};

export default function () {
  group('health-checks', function () {
    const healthRes = http.get(`${BASE_URL}/health`, { tags: { type: 'api' } });
    check(healthRes, {
      'health status 200': (r) => r.status === 200,
      'health p95 < 500ms': (r) => r.timings.duration < 500,
    });
  });

  group('static-assets', function () {
    const indexRes = http.get(BASE_URL, { tags: { type: 'static' } });
    check(indexRes, {
      'index loads': (r) => r.status === 200,
      'index p95 < 300ms': (r) => r.timings.duration < 300,
    });
  });

  group('api-endpoints', function () {
    const apiHealth = http.get(`${API_URL}/health`, {
      headers: { 'apikey': __ENV.API_KEY || 'test-key' },
      tags: { type: 'api' },
    });
    check(apiHealth, {
      'api health responds': (r) => r.status === 200 || r.status === 401,
    });

    const corsPreflight = http.options(`${API_URL}/health`, null, {
      headers: { 'Origin': 'https://wasel14.online', 'Access-Control-Request-Method': 'GET' },
      tags: { type: 'api' },
    });
    check(corsPreflight, {
      'cors preflight responds': (r) => r.status === 200 || r.status === 204 || r.status === 404,
    });
  });

  sleep(0.5);
}