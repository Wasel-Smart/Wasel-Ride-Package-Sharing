/**
 * Wasel Stripe Subscription Webhook Handler
 * Processes subscription lifecycle events
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_SUBSCRIPTION_WEBHOOK_SECRET') || '';

serve(async req => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'No signature' }), { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log(`Processing subscription event: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase.from('subscriptions').upsert({
          stripe_subscription_id: subscription.id,
          customer_id: subscription.customer as string,
          status: subscription.status,
          plan_id: subscription.items.data[0]?.price.id,
          plan_amount: subscription.items.data[0]?.price.unit_amount || 0,
          plan_currency: subscription.items.data[0]?.price.currency?.toUpperCase() || 'JOD',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          created_at: new Date(subscription.created * 1000).toISOString(),
          ended_at: null,
        });

        await supabase.from('webhook_events').insert({
          event_type: 'subscription_created',
          stripe_id: subscription.id,
          customer_id: subscription.customer,
          payload: subscription,
        });

        console.log(`Subscription created: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            plan_id: subscription.items.data[0]?.price.id,
            plan_amount: subscription.items.data[0]?.price.unit_amount || 0,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        await supabase.from('webhook_events').insert({
          event_type: 'subscription_updated',
          stripe_id: subscription.id,
          customer_id: subscription.customer,
          payload: subscription,
        });

        console.log(`Subscription updated: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            ended_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        await supabase.from('webhook_events').insert({
          event_type: 'subscription_deleted',
          stripe_id: subscription.id,
          customer_id: subscription.customer,
          payload: subscription,
        });

        console.log(`Subscription deleted: ${subscription.id}`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        await supabase.from('subscription_invoices').insert({
          stripe_invoice_id: invoice.id,
          customer_id: invoice.customer as string,
          subscription_id: invoice.subscription as string,
          amount_paid: invoice.amount_paid / 100,
          amount_due: invoice.amount_due / 100,
          currency: invoice.currency?.toUpperCase() || 'JOD',
          status: invoice.status,
          invoice_pdf: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url,
          period_start: new Date(invoice.period_start * 1000).toISOString(),
          period_end: new Date(invoice.period_end * 1000).toISOString(),
          paid_at: invoice.status === 'paid' ? new Date().toISOString() : null,
        });

        // Update subscription last payment
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({
              last_payment_at: new Date().toISOString(),
              last_invoice_id: invoice.id,
            })
            .eq('stripe_subscription_id', invoice.subscription);
        }

        await supabase.from('webhook_events').insert({
          event_type: 'invoice_paid',
          stripe_id: invoice.id,
          customer_id: invoice.customer,
          payload: invoice,
        });

        console.log(`Invoice paid: ${invoice.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        await supabase.from('subscription_invoices').insert({
          stripe_invoice_id: invoice.id,
          customer_id: invoice.customer as string,
          subscription_id: invoice.subscription as string,
          amount_paid: invoice.amount_paid / 100,
          amount_due: invoice.amount_due / 100,
          currency: invoice.currency?.toUpperCase() || 'JOD',
          status: invoice.status,
          invoice_pdf: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url,
          period_start: new Date(invoice.period_start * 1000).toISOString(),
          period_end: new Date(invoice.period_end * 1000).toISOString(),
        });

        // Update subscription status to past_due
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              payment_failed_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription);
        }

        await supabase.from('webhook_events').insert({
          event_type: 'invoice_payment_failed',
          stripe_id: invoice.id,
          customer_id: invoice.customer,
          payload: invoice,
        });

        console.log(`Invoice payment failed: ${invoice.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 400 },
    );
  }
});
