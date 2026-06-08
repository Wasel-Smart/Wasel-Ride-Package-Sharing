import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createRateLimitMiddleware } from '../_shared/rate-limiter.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const APP_ORIGIN = (Deno.env.get('APP_ORIGIN') || Deno.env.get('APP_BASE_URL') || 'https://wasel14.online').replace(/\/$/, '');
const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') || '';
const MAX_REFUND_AMOUNT_MINOR = 500_000;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const refundRateLimit = createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 20 });

interface RefundRequest {
  bookingId: string;
  amount?: number;
  reason: string;
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

  const supabaseClient = getSupabaseAdmin();
  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: canonicalUser } = await supabaseClient
    .from('users')
    .select('id, auth_user_id')
    .or(`auth_user_id.eq.${data.user.id},id.eq.${data.user.id}`)
    .maybeSingle();

  return { supabaseClient, authUserId: data.user.id, userId: canonicalUser?.id ?? data.user.id };
}

function normalizeRefundAmountMajorToMinor(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const amountMinor = Math.round(value * 100);
  if (amountMinor < 50 || amountMinor > MAX_REFUND_AMOUNT_MINOR) return null;
  return amountMinor;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: responseHeaders(req) });
  }

  const origin = req.headers.get('origin');
  if (origin && !resolveOrigin(req)) {
    return json(req, { error: 'Origin not allowed' }, 403);
  }

  const rateLimitResponse = refundRateLimit(req);
  if (rateLimitResponse) return withSecurityHeaders(req, rateLimitResponse);

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405);
  }

  try {
    if (!STRIPE_SECRET_KEY) return json(req, { error: 'Payment service unavailable' }, 503);

    const auth = await authenticate(req);
    if (!auth) return json(req, { error: 'Unauthorized' }, 401);

    const { bookingId, amount, reason }: RefundRequest = await req.json();
    if (typeof bookingId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(bookingId)) {
      return json(req, { error: 'Invalid booking' }, 400);
    }

    const { data: booking, error: bookingError } = await auth.supabaseClient
      .from('bookings')
      .select('*, trips(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.user_id !== auth.userId && booking.trips.driver_id !== auth.userId) {
      throw new Error('Unauthorized');
    }

    if (!booking.payment_intent_id) {
      throw new Error('No payment to refund');
    }

    if (booking.payment_status === 'refunded') {
      throw new Error('Already refunded');
    }

    const maxRefundAmount = Math.round(Number(booking.total_price ?? booking.amount ?? 0) * 100);
    const requestedRefundAmount = amount === undefined
      ? maxRefundAmount
      : normalizeRefundAmountMajorToMinor(amount);
    if (!requestedRefundAmount || requestedRefundAmount > maxRefundAmount) {
      return json(req, { error: 'Invalid refund amount' }, 400);
    }

    const idempotencyKey =
      req.headers.get('idempotency-key') ||
      `refund:${auth.userId}:${bookingId}:${requestedRefundAmount}`;

    const refund = await stripe.refunds.create(
      {
        payment_intent: booking.payment_intent_id,
        amount: requestedRefundAmount,
        reason: 'requested_by_customer',
        metadata: {
          bookingId,
          userId: auth.userId,
          reason: String(reason ?? '').slice(0, 250),
        },
      },
      { idempotencyKey },
    );

    const { error: refundInsertError } = await auth.supabaseClient
      .from('refunds')
      .insert({
        booking_id: bookingId,
        payment_intent_id: booking.payment_intent_id,
        refund_id: refund.id,
        amount: refund.amount,
        reason,
        status: refund.status,
      });

    if (refundInsertError) {
      throw refundInsertError;
    }

    await auth.supabaseClient
      .from('bookings')
      .update({
        payment_status: 'refunded',
        refund_amount: refund.amount,
      })
      .eq('id', bookingId);

    return json(req, {
      success: true,
      refundId: refund.id,
      amount: refund.amount,
    });
  } catch (error) {
    console.error('refund failed', error instanceof Error ? error.message : String(error));
    const message = error instanceof Error && ['Unauthorized', 'Booking not found', 'No payment to refund', 'Already refunded'].includes(error.message)
      ? error.message
      : 'Refund request failed';
    const status = message === 'Unauthorized' ? 403 : message === 'Booking not found' ? 404 : 400;
    return json(req, { error: message }, status);
  }
});
