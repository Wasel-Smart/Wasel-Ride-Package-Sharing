type TelemetryPayload = {
  metrics?: Array<Record<string, unknown>>;
  traces?: Array<Record<string, unknown>>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  json: (body: Record<string, unknown>) => void;
};

export default function handler(request: { method: string; body: TelemetryPayload }, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const payload = request.body;
  if (!payload || (!payload.metrics && !payload.traces)) {
    return response.status(200).json({ received: false, reason: 'empty payload' });
  }

  const metricCount = Array.isArray(payload.metrics) ? payload.metrics.length : 0;
  const traceCount = Array.isArray(payload.traces) ? payload.traces.length : 0;

  if (import.meta.env?.DEV) {
    console.info('[telemetry] received', { metricCount: Number(metricCount), traceCount: Number(traceCount) });
  }

  return response.status(200).json({ received: true, metricCount, traceCount });
}
