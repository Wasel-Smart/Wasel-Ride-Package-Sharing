import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:4173';

export default function () {
  const responses = [
    http.get(`${baseUrl}/`),
    http.get(`${baseUrl}/app/find-ride`),
    http.get(`${baseUrl}/app/packages`),
  ];

  responses.forEach((response) => {
    check(response, {
      'status is 200': (res) => res.status === 200,
      'response under 800ms': (res) => res.timings.duration < 800,
    });
  });

  sleep(1);
}
