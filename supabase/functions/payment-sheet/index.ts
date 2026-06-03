import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createRateLimitMiddleware } from '../_shared/rate-limiter.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const appOrigin = Deno.env.get('APP_ORIGIN') ?? Deno.env.get('PUBLIC_SITE_URL') ?? '';
const rateLimit = createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 30 });
const allowedCurrencies = new Set(['jod', 'usd']);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = appOrigin && origin === appOrigin ? origin : appOrigin;

  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'null',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function jsonResponse(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    status,
  });
}

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader.startsWith('Bearer ') && authHeader.length > 24;
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value <= 0 || value > 5_000) return null;
  return Math.round(value * 100);
}

interface PaymentRequest {
  amount: number;
  currency?: string;
  bookingId: string;
  userId: string;
  metadata?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const rateLimited = rateLimit(req);
  if (rateLimited) {
    return new Response(rateLimited.body, {
      status: rateLimited.status,
      headers: { ...getCorsHeaders(req), ...Object.fromEntries(rateLimited.headers.entries()) },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  if (!isAuthorized(req)) {
    return jsonResponse(req, { error: 'Unauthorized' }, 401);
  }

  try {
    const { amount, currency = 'jod', bookingId, userId, metadata = {} }: PaymentRequest = await req.json();
    const normalizedAmount = normalizeAmount(amount);
    const normalizedCurrency = currency.toLowerCase();

    if (!normalizedAmount) {
      throw new Error('Invalid amount');
    }

    if (!allowedCurrencies.has(normalizedCurrency)) {
      throw new Error('Invalid currency');
    }

    if (!bookingId || !userId) {
      throw new Error('Missing required fields');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: normalizedAmount,
      currency: normalizedCurrency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        bookingId,
        userId,
        ...metadata,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return jsonResponse(
      req,
      { error: error instanceof Error ? error.message : 'Payment setup failed' },
      400,
    );
  }
});
