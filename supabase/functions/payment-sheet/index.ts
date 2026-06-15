import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createRateLimitMiddleware } from '../_shared/rate-limiter.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const APP_ORIGIN = (Deno.env.get('APP_ORIGIN') || Deno.env.get('APP_BASE_URL') || 'https://wasel14.online').replace(/\/$/, '');
const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') || '';
const MAX_PAYMENT_AMOUNT_MINOR = 500_000;
const ALLOWED_CURRENCIES = new Set(['jod', 'usd']);

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const paymentRateLimit = createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 30 });

interface PaymentRequest {
  amount: number;
  currency?: string;
  bookingId: string;
  metadata?: Record<string, string>;
}

function allowedOrigins(): string[] {
  return [
    APP_ORIGIN,
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...ADDITIONAL_ALLOWED_ORIGINS.split(/[,\s]+/).filter(Boolean),
  ].map(origin => origin.replace(/\/$/, ''));
}

function resolveOrigin(req: Request): string | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;

  try {
    const normalized = new URL(origin).origin;
    return allowedOrigins().includes(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function responseHeaders(req: Request): HeadersInit {
  const origin = resolveOrigin(req);
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token, idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
}

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(req),
  });
}

function withSecurityHeaders(req: Request, response: Response): Response {
  const headers = new Headers(responseHeaders(req));
  response.headers.forEach((value, key) => headers.set(key, value));

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function normalizeAmountMajorToMinor(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const minor = Math.round(value * 100);
  if (minor < 50 || minor > MAX_PAYMENT_AMOUNT_MINOR) return null;
  return minor;
}

function normalizeCurrency(value: unknown): string | null {
  const currency = String(value ?? 'jod').toLowerCase();
  return ALLOWED_CURRENCIES.has(currency) ? currency : null;
}

function safeMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, entry]) => /^[a-zA-Z0-9_.-]{1,40}$/.test(key) && typeof entry === 'string')
      .map(([key, entry]) => [key, String(entry).slice(0, 250)]),
  );
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service configuration is missing');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticate(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!token) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: canonicalUser } = await admin
    .from('users')
    .select('id, auth_user_id')
    .or(`auth_user_id.eq.${data.user.id},id.eq.${data.user.id}`)
    .maybeSingle();

  return { admin, authUserId: data.user.id, userId: canonicalUser?.id ?? data.user.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: responseHeaders(req) });
  }

  const origin = req.headers.get('origin');
  if (origin && !resolveOrigin(req)) {
    return json(req, { error: 'Origin not allowed' }, 403);
  }

  const rateLimitResponse = paymentRateLimit(req);
  if (rateLimitResponse) return withSecurityHeaders(req, rateLimitResponse);

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  try {
    if (!STRIPE_SECRET_KEY) return json(req, { error: 'Payment service unavailable' }, 503);

    const auth = await authenticate(req);
    if (!auth) return json(req, { error: 'Unauthorized' }, 401);

    const { amount, currency = 'jod', bookingId, metadata = {} }: PaymentRequest = await req.json();
    const amountMinor = normalizeAmountMajorToMinor(amount);
    const normalizedCurrency = normalizeCurrency(currency);

    if (!amountMinor) return json(req, { error: 'Invalid amount' }, 400);
    if (!normalizedCurrency) return json(req, { error: 'Invalid currency' }, 400);
    if (typeof bookingId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(bookingId)) {
      return json(req, { error: 'Invalid booking' }, 400);
    }

    const { data: booking, error: bookingError } = await auth.admin
      .from('bookings')
      .select('id, user_id, total_price, amount, payment_status')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) return json(req, { error: 'Unable to validate booking' }, 500);
    if (!booking || booking.user_id !== auth.userId) return json(req, { error: 'Booking not found' }, 404);
    if (booking.payment_status === 'succeeded' || booking.payment_status === 'paid') {
      return json(req, { error: 'Booking is already paid' }, 409);
    }

    const bookingAmount = Number(booking.total_price ?? booking.amount ?? 0);
    const bookingAmountMinor = normalizeAmountMajorToMinor(bookingAmount);
    if (!bookingAmountMinor || bookingAmountMinor !== amountMinor) {
      return json(req, { error: 'Payment amount does not match booking' }, 400);
    }

    const idempotencyKey =
      req.headers.get('idempotency-key') ||
      `payment-sheet:${auth.userId}:${bookingId}:${amountMinor}:${normalizedCurrency}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountMinor,
        currency: normalizedCurrency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          bookingId,
          userId: auth.userId,
          ...safeMetadata(metadata),
        },
      },
      {
        idempotencyKey,
      },
    );

    await auth.admin
      .from('bookings')
      .update({ payment_intent_id: paymentIntent.id, payment_status: paymentIntent.status })
      .eq('id', bookingId)
      .eq('user_id', auth.userId);

    return json(req, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('payment-sheet failed', error instanceof Error ? error.message : String(error));
    return json(req, { error: 'Payment request failed' }, 500);
  }
});
