import Stripe from "npm:stripe@12.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.36.0";

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!STRIPE_SECRET) throw new Error('Missing STRIPE_SECRET_KEY');
if (!SUPABASE_URL || !SUPABASE_KEY) console.warn('Supabase env vars missing; payments will not be persisted.');

const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2022-11-15' });
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

console.info('stripe-payments-v2 function started');

Deno.serve(async (req: Request) => {
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
      if (!amount) return new Response(JSON.stringify({ error: 'Missing amount' }), { status: 400 });

      const pi = await stripe.paymentIntents.create(
        {
          amount: Math.round(amount),
          currency,
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
          console.warn('Failed to persist payment:', e.message || e);
        }
      }

      return new Response(JSON.stringify({ client_secret: pi.client_secret }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (pathname.endsWith('/create-checkout-session') && req.method === 'POST') {
      if (!isAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      const body = await req.json();
      const { line_items, mode = 'payment', success_url, cancel_url, customer_email } = body;
      if (!line_items || !success_url || !cancel_url) return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400 });

      const session = await stripe.checkout.sessions.create({
        line_items,
        mode,
        success_url,
        cancel_url,
        customer_email,
      });

      return new Response(JSON.stringify({ session_id: session.id, url: session.url }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (pathname.endsWith('/webhook') && req.method === 'POST') {
      // Webhook handler: expects raw body and STRIPE_WEBHOOK_SECRET env var
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      const payload = await req.text();
      if (!webhookSecret) return new Response(JSON.stringify({ error: 'Missing webhook secret' }), { status: 500 });
      const sig = req.headers.get('stripe-signature') || '';
      let event;
      try {
        event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      } catch (err) {
        console.warn('Webhook signature verification failed:', err.message);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
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

      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ status: 'ok', routes: ['/create-payment-intent', '/create-checkout-session', '/webhook'] }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});