import Stripe from "npm:stripe@12.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.36.0";
import { createRateLimitMiddleware } from "../_shared/rate-limiter.ts";

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? Deno.env.get('PUBLIC_SITE_URL') ?? '';

if (!STRIPE_SECRET) throw new Error('Missing STRIPE_SECRET_KEY');
if (!SUPABASE_URL || !SUPABASE_KEY) console.warn('Supabase env vars missing; payments will not be persisted.');

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2022-11-15' });
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const paymentRateLimit = createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 30 });
const ALLOWED_CURRENCIES = new Set(['jod', 'usd']);
const MAX_PAYMENT_AMOUNT_MINOR = 500_000;

console.info('stripe-payments-v2 function started');

function jsonResponse(body: Record<string, unknown>, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

function isAllowedRedirectUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (!APP_ORIGIN) return true;
    return url.origin === new URL(APP_ORIGIN).origin;
  } catch {
    return false;
  }
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const amount = Math.round(value);
  if (amount < 50 || amount > MAX_PAYMENT_AMOUNT_MINOR) return null;
  return amount;
}

Deno.serve(async (req: Request) => {
  const rateLimitResponse = paymentRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/\/+$/, '');

    // Simple auth check (optional) - verify JWT from Supabase client
    const authHeader = req.headers.get('authorization') || '';
    const isAuth = authHeader.startsWith('Bearer ');

    if (pathname.endsWith('/create-payment-intent') && req.method === 'POST') {
      if (!isAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      const body = await req.json();
      const { amount, currency = 'usd', customer_id, metadata, idempotency_key } = body;
      const normalizedAmount = normalizeAmount(amount);
      const normalizedCurrency = String(currency).toLowerCase();
      if (!normalizedAmount) return jsonResponse({ error: 'Invalid amount' }, { status: 400 });
      if (!ALLOWED_CURRENCIES.has(normalizedCurrency)) return jsonResponse({ error: 'Invalid currency' }, { status: 400 });

      const pi = await stripe.paymentIntents.create(
        {
          amount: normalizedAmount,
          currency: normalizedCurrency,
          customer: customer_id || undefined,
          metadata: metadata || undefined,
        },
        idempotency_key ? { idempotencyKey: idempotency_key } : undefined
      );

      // Persist to payments table if available
      if (supabase) {
        try {
          await supabase.from('payments').insert([{ id: pi.id, amount: pi.amount, currency: pi.currency, status: pi.status, raw: pi }]);
        } catch (e) {
          console.warn('Failed to persist payment:', e instanceof Error ? e.message : 'unknown error');
        }
      }

      return jsonResponse({ client_secret: pi.client_secret });
    }

    if (pathname.endsWith('/create-checkout-session') && req.method === 'POST') {
      if (!isAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      const body = await req.json();
      const { line_items, mode = 'payment', success_url, cancel_url, customer_email } = body;
      if (!Array.isArray(line_items) || line_items.length === 0 || line_items.length > 20) {
        return jsonResponse({ error: 'Invalid line items' }, { status: 400 });
      }
      if (!isAllowedRedirectUrl(success_url) || !isAllowedRedirectUrl(cancel_url)) {
        return jsonResponse({ error: 'Invalid redirect URL' }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        line_items,
        mode,
        success_url,
        cancel_url,
        customer_email,
      });

      return jsonResponse({ session_id: session.id, url: session.url });
    }

    if (pathname.endsWith('/webhook') && req.method === 'POST') {
      // Webhook handler: expects raw body and STRIPE_WEBHOOK_SECRET env var
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      const payload = await req.text();
      if (!webhookSecret) return jsonResponse({ error: 'Webhook unavailable' }, { status: 500 });
      const sig = req.headers.get('stripe-signature') || '';
      let event;
      try {
        event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      } catch (err) {
        console.warn('Webhook signature verification failed:', err instanceof Error ? err.message : 'unknown error');
        return jsonResponse({ error: 'Invalid signature' }, { status: 400 });
      }

      // Handle relevant events
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const pi = event.data.object;
          if (supabase) await supabase.from('payments').update({ status: 'succeeded' }).eq('id', pi.id);
          break;
        }
        case 'payment_intent.payment_failed': {
          const pi = event.data.object;
          if (supabase) await supabase.from('payments').update({ status: 'failed' }).eq('id', pi.id);
          break;
        }
        case 'checkout.session.completed': {
          const session = event.data.object;
          if (supabase) await supabase.from('payments').insert([{ id: session.payment_intent, status: 'succeeded', raw: session }]);
          break;
        }
        default:
          console.info('Unhandled event type', event.type);
      }

      return jsonResponse({ received: true }, { status: 200 });
    }

    return jsonResponse({ status: 'ok', routes: ['/create-payment-intent', '/create-checkout-session', '/webhook'] });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return jsonResponse({ error: 'Payment request failed' }, { status: 500 });
  }
});
