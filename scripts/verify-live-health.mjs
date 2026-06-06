const targetUrl = process.argv[2] ?? process.env.HEALTH_URL ?? 'https://wasel14.online/health';

const response = await fetch(targetUrl, {
  headers: {
    Accept: 'application/json',
    'User-Agent': 'wasel-health-verifier/1.0',
  },
});

const contentType = response.headers.get('content-type') ?? '';
const traceId = response.headers.get('x-wasel-trace-id');
const body = await response.text();

if (!response.ok) {
  throw new Error(`Health endpoint returned HTTP ${response.status}: ${body.slice(0, 200)}`);
}

if (!contentType.includes('application/json')) {
  throw new Error(`Health endpoint did not return JSON. content-type=${contentType}`);
}

let payload;
try {
  payload = JSON.parse(body);
} catch (error) {
  throw new Error(`Health endpoint returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (payload.status !== 'ok' || payload.service !== 'wasel-web') {
  throw new Error(`Health payload is not Wasel backend health JSON: ${body.slice(0, 200)}`);
}

if (!traceId || payload.traceId !== traceId) {
  throw new Error('Health endpoint did not return a correlated X-Wasel-Trace-Id header and payload traceId');
}

console.log(
  JSON.stringify(
    {
      ok: true,
      targetUrl,
      status: response.status,
      traceId,
      payload,
    },
    null,
    2,
  ),
);
