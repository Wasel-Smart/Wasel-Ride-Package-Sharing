type MetricPayload = {
  ok: boolean;
  service: 'wasel-web';
  timestamp: string;
  traceId: string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  json: (body: MetricPayload) => void;
};

function createTraceId(): string {
  return `wasel-metric-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function handler(_request: unknown, response: VercelResponse) {
  const traceId = createTraceId();

  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Wasel-Trace-Id', traceId);
  response.status(200).json({
    ok: true,
    service: 'wasel-web',
    timestamp: new Date().toISOString(),
    traceId,
  });
}
