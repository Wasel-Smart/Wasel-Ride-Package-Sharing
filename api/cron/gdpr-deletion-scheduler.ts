import { timingSafeEqual } from 'node:crypto';

type VercelRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  json: (body: Record<string, unknown>) => void;
};

function header(request: VercelRequest, name: string): string | undefined {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function matchesSecret(expected: string, provided: string): boolean {
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return response.status(503).json({ error: 'Scheduled deletion is not configured.' });
  }

  const authorization = header(request, 'authorization') ?? '';
  const providedSecret = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!providedSecret || !matchesSecret(cronSecret, providedSecret)) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
  if (!supabaseUrl) {
    return response.status(503).json({ error: 'Scheduled deletion is not configured.' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const upstream = await fetch(`${supabaseUrl}/functions/v1/gdpr-deletion-scheduler`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: controller.signal,
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return response.status(upstream.status).json({ error: 'Scheduled deletion run failed.' });
    }
    return response.status(200).json(result as Record<string, unknown>);
  } catch {
    return response.status(502).json({ error: 'Scheduled deletion service is unavailable.' });
  } finally {
    clearTimeout(timer);
  }
}
