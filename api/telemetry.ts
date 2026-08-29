type TelemetryPayload = {
  metrics?: Array<Record<string, unknown>>;
  traces?: Array<Record<string, unknown>>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  json: (body: Record<string, unknown>) => void;
};

type TelemetryRequest = {
  method?: string;
  body?: TelemetryPayload;
  headers?: Record<string, string | string[] | undefined>;
};

const MAX_EVENTS_PER_REQUEST = 50;
const MAX_CONTENT_LENGTH = 64 * 1024;

function getHeader(request: TelemetryRequest, name: string): string | undefined {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getAllowedOrigins(): Set<string> {
  const configured = process.env.ALLOWED_ORIGINS ?? process.env.APP_BASE_URL ?? 'https://wasel14.online';
  const origins = configured
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  return new Set(origins);
}

function hasValidPayload(payload: TelemetryPayload): boolean {
  const collections = [payload.metrics, payload.traces];
  return collections.every(collection =>
    collection === undefined ||
    (Array.isArray(collection) &&
      collection.length <= MAX_EVENTS_PER_REQUEST &&
      collection.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))),
  );
}

export default function handler(request: TelemetryRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const origin = getHeader(request, 'origin');
  if (origin && !getAllowedOrigins().has(origin)) {
    return response.status(403).json({ error: 'Forbidden origin' });
  }

  const contentLength = Number(getHeader(request, 'content-length') ?? '0');
  if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > MAX_CONTENT_LENGTH) {
    return response.status(413).json({ error: 'Payload too large' });
  }

  const payload = request.body;
  if (!payload || (!payload.metrics && !payload.traces)) {
    return response.status(200).json({ received: false, reason: 'empty payload' });
  }

  if (!hasValidPayload(payload)) {
    return response.status(400).json({ error: 'Invalid telemetry payload' });
  }

  const metricCount = Array.isArray(payload.metrics) ? payload.metrics.length : 0;
  const traceCount = Array.isArray(payload.traces) ? payload.traces.length : 0;

  if (process.env.NODE_ENV === 'development') {
    console.info('[telemetry] received', { metricCount: Number(metricCount), traceCount: Number(traceCount) });
  }

  return response.status(200).json({ received: true, metricCount, traceCount });
}
