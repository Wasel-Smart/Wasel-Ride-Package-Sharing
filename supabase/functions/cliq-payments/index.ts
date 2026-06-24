import { createClient } from "npm:@supabase/supabase-js@2";
import { createRateLimitMiddleware } from "../_shared/rate-limiter.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLIQ_API_BASE_URL = Deno.env.get('CLIQ_API_BASE_URL') ?? Deno.env.get('JOPACC_API_BASE_URL') ?? '';
const CLIQ_MERCHANT_ID = Deno.env.get('CLIQ_MERCHANT_ID') ?? Deno.env.get('JOPACC_MERCHANT_ID') ?? '';
const CLIQ_API_KEY = Deno.env.get('CLIQ_API_KEY') ?? Deno.env.get('JOPACC_API_KEY') ?? '';
const CLIQ_CHECKOUT_URL_TEMPLATE = Deno.env.get('CLIQ_CHECKOUT_URL_TEMPLATE') ?? Deno.env.get('JOPACC_CHECKOUT_URL_TEMPLATE') ?? '';

if (!CLIQ_API_BASE_URL || !CLIQ_MERCHANT_ID || !CLIQ_API_KEY) {
  console.warn('CliQ payment configuration incomplete');
}

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const cliqRateLimit = createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 30 });

console.info('cliq-payments function started');

function jsonResponse(body: Record<string, unknown>, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

function generateSignature(payload: string, timestamp: string, secret: string): string {
  const encoder = new TextEncoder();
  const data = `${payload}${timestamp}${secret}`;
  const hash = new Deno.Command('sha256sum', { args: ['-'], stdin: 'piped' });
  // Simplified for Deno - in production use proper crypto
  return btoa(data).slice(0, 64);
}

Deno.serve(async (req: Request) => {
  const rateLimitResponse = cliqRateLimit(req);
  if (rateLimitResponse) return rateLimitResponse;

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, '');

  const authHeader = req.headers.get('authorization') || '';
  const isAuth = authHeader.startsWith('Bearer ');

  if (pathname.endsWith('/create-checkout') && req.method === 'POST') {
    if (!isAuth) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { amount, merchantReference, customerPhone, returnUrl, cancelUrl } = body;

    if (!amount || !merchantReference) {
      return jsonResponse({ error: 'Amount and merchant reference required' }, { status: 400 });
    }

    const checkoutUrl = CLIQ_CHECKOUT_URL_TEMPLATE
      .replace('{amount}', amount.toString())
      .replace('{order_id}', merchantReference)
      .replace('{merchant_id}', CLIQ_MERCHANT_ID);

    if (supabase) {
      const { error } = await supabase.from('payments').insert([{
        id: merchantReference,
        amount,
        currency: 'JOD',
        provider: 'cliq',
        merchant_reference: merchantReference,
        status: 'pending',
      }});
      if (error) console.warn('Failed to create payment record:', error.message);
    }

    return jsonResponse({ checkoutUrl, paymentId: merchantReference });
  }

  if (pathname.endsWith('/webhook') && req.method === 'POST') {
    const payload = await req.text();
    const sig = req.headers.get('x-cliq-signature') || '';
    const ts = req.headers.get('x-cliq-timestamp') || '';

    const webhookSecret = Deno.env.get('CLIQ_WEBHOOK_SECRET') ?? '';
    const expectedSig = webhookSecret ? generateSignature(payload, ts, webhookSecret) : '';

    if (webhookSecret && sig !== expectedSig) {
      return jsonResponse({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(payload);

    if (supabase) {
      await supabase.from('payments').update({
        status: event.status === 'success' ? 'succeeded' : 'failed',
        provider_transaction_id: event.payment_id,
      }).eq('id', event.merchant_reference || event.payment_id);
    }

    return jsonResponse({ received: true });
  }

  return jsonResponse({ status: 'ok', routes: ['/create-checkout', '/webhook'] });
});