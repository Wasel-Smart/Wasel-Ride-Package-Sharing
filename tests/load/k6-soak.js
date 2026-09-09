// Wasel Soak Test — 60 minutes at steady load to surface memory leaks and
// connection pool exhaustion that smoke/realistic tests miss.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const p95Latency = new Trend('p95_latency');

const BASE_URL = __ENV.BASE_URL || 'https://wasel14.online';

export const options = {
  stages: [
    { duration: '5m',  target: 50  }, // ramp up
    { duration: '50m', target: 50  }, // hold steady
    { duration: '5m',  target: 0   }, // ramp down
  ],
  thresholds: {
    http_req_duration:  ['p(95)<900', 'p(99)<2000'],
    http_req_failed:    ['rate<0.01'],
    errors:             ['rate<0.02'],
  },
};

export default function () {
  const pages = ['/', '/app/find-ride', '/app/packages', '/app/bus'];
  const page  = pages[Math.floor(Math.random() * pages.length)];

  const res = http.get(`${BASE_URL}${page}`, { tags: { type: 'soak' } });

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'under 900ms': (r) => r.timings.duration < 900,
  });

  errorRate.add(!ok);
  p95Latency.add(res.timings.duration);

  sleep(Math.random() * 2 + 1);
}
