/**
 * Webhooks function — verify_jwt = false
 *
 * Serves all inbound provider callbacks: Stripe, CliQ, Resend, Twilio,
 * and the Supabase Send-SMS auth hook. None of these callers send a Supabase
 * JWT, so this function runs without JWT verification. Every handler verifies
 * its own provider signature before touching any data.
 *
 * Routes:
 *   POST /payments/webhooks/stripe
 *   POST /payments/webhooks/cliq
 *   POST /communications/webhooks/resend
 *   POST /communications/webhooks/twilio
 *   POST /auth/hooks/send-sms
 */

import {
    json,
    finalizeResponse,
    sanitizedUnhandledErrorResponse,
    logUnhandledRouteError,
} from './_vendor/supabase/functions/make-server-0b1f4071/_handlers/shared.ts';

import {
  handleStripeWebhook,
  handleCliqWebhook,
  handleResendWebhook,
  handleTwilioWebhook,
  handleSendSmsHook,
} from './_vendor/supabase/functions/make-server-0b1f4071/_handlers/webhooks.ts';
import { getWebhookRequestPath } from './_shared/route.ts';

Deno.serve(async (request: Request) => {
  // Webhook callers (Stripe, Twilio, etc.) send from their own origins, not
  // from the Wasel app origin. Skip the origin allow-list for this function.
  // Each handler enforces its own provider signature check instead.

  if (request.method === 'OPTIONS') {
    return finalizeResponse(request, new Response(null, { status: 204 }));
  }

  const url = new URL(request.url);
  const path = getWebhookRequestPath(url.pathname);

  try {
    if (request.method === 'GET' && path === '/health') {
      // Used to verify that the webhooks function is deployed and reachable.
      // After deploying, register the Stripe webhook endpoint at:
      //   Stripe Dashboard > Developers > Webhooks > Add endpoint
      //   URL: <SUPABASE_URL>/functions/v1/webhooks/payments/webhooks/stripe
      //   Events: payment_intent.succeeded, payment_intent.payment_failed,
      //            charge.refunded, customer.subscription.created,
      //            customer.subscription.deleted
      // Then copy the signing secret into STRIPE_WEBHOOK_SECRET env var.
      return json({ status: 'ok', service: 'webhooks', timestamp: new Date().toISOString() });
    }

    if (request.method === 'POST') {
      if (path === '/payments/webhooks/stripe') {return await handleStripeWebhook(request);}
      if (path === '/payments/webhooks/cliq')   {return await handleCliqWebhook(request);}
      if (path === '/communications/webhooks/resend') {return await handleResendWebhook(request);}
      if (path === '/communications/webhooks/twilio') {return await handleTwilioWebhook(request);}
      if (path === '/auth/hooks/send-sms')       {return await handleSendSmsHook(request);}
    }

    return json({ error: 'Route not found', path }, 404);
  } catch (error) {
    logUnhandledRouteError(error, request);
    return sanitizedUnhandledErrorResponse();
  }
});
