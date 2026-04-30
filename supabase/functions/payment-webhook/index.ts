/**
 * Wasel Payment Webhook Handler
 * Processes Stripe payment events with idempotency
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'No signature' }), { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Initialize Supabase with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log webhook event (idempotent)
    const { data: existingWebhook } = await supabase
      .from('payment_webhooks')
      .select('id')
      .eq('provider', 'stripe')
      .eq('event_id', event.id)
      .single();

    if (existingWebhook) {
      // Webhook already processed
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Insert webhook record
    await supabase.from('payment_webhooks').insert({
      provider: 'stripe',
      event_id: event.id,
      event_type: event.type,
      raw_payload: event,
      payment_intent_id: event.data.object.id,
      amount: event.data.object.amount ? event.data.object.amount / 100 : null,
      currency: event.data.object.currency?.toUpperCase() || 'JOD',
    });

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        
        // Update payment status
        const { data: payment } = await supabase
          .from('payment_status')
          .update({ status: 'SUCCESS', updated_at: new Date().toISOString() })
          .eq('payment_intent_id', paymentIntent.id)
          .select()
          .single();

        if (payment) {
          // Update ride/package payment status
          if (payment.reference_type === 'ride') {
            await supabase
              .from('rides')
              .update({ payment_status: 'paid' })
              .eq('id', payment.reference_id);
          } else if (payment.reference_type === 'package') {
            await supabase
              .from('packages')
              .update({ payment_status: 'paid' })
              .eq('id', payment.reference_id);
          }

          // Create wallet transaction
          await supabase.from('wallet_transactions').insert({
            user_id: payment.user_id,
            amount: payment.amount,
            type: 'debit',
            category: payment.reference_type === 'ride' ? 'ride_payment' : 'package_payment',
            reference_type: payment.reference_type,
            reference_id: payment.reference_id,
            balance_before: 0, // Will be calculated by trigger
            balance_after: 0,
            payment_intent_id: paymentIntent.id,
            status: 'completed',
          });

          // Enqueue notification job
          await supabase.rpc('enqueue_job', {
            p_type: 'send_notification',
            p_payload: {
              user_id: payment.user_id,
              title: 'Payment Successful',
              message: `Your payment of ${payment.amount} ${payment.currency} was successful`,
              type: 'payment',
            },
            p_priority: 3,
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        await supabase
          .from('payment_status')
          .update({ 
            status: 'FAILED', 
            updated_at: new Date().toISOString(),
            provider_data: { error: paymentIntent.last_payment_error }
          })
          .eq('payment_intent_id', paymentIntent.id);

        // Enqueue retry job
        await supabase.rpc('enqueue_job', {
          p_type: 'retry_payment',
          p_payload: { payment_intent_id: paymentIntent.id },
          p_priority: 2,
          p_delay_seconds: 300, // Retry after 5 minutes
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        
        await supabase
          .from('payment_status')
          .update({ status: 'REFUNDED', updated_at: new Date().toISOString() })
          .eq('payment_intent_id', charge.payment_intent);

        // Create refund transaction
        const { data: payment } = await supabase
          .from('payment_status')
          .select('*')
          .eq('payment_intent_id', charge.payment_intent)
          .single();

        if (payment) {
          await supabase.from('wallet_transactions').insert({
            user_id: payment.user_id,
            amount: charge.amount_refunded / 100,
            type: 'credit',
            category: payment.reference_type === 'ride' ? 'ride_refund' : 'package_refund',
            reference_type: payment.reference_type,
            reference_id: payment.reference_id,
            balance_before: 0,
            balance_after: 0,
            payment_intent_id: charge.payment_intent,
            status: 'completed',
          });
        }
        break;
      }
    }

    // Mark webhook as processed
    await supabase
      .from('payment_webhooks')
      .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
      .eq('event_id', event.id);

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400 }
    );
  }
});
