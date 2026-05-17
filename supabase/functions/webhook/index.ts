import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';
import { createRateLimitMiddleware } from '../_shared/rate-limiter.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
const rateLimitMiddleware = createRateLimitMiddleware({ windowMs: 60000, maxRequests: 100 });

serve(async (req) => {
  const rateLimitResponse = rateLimitMiddleware(req);
  if (rateLimitResponse) return rateLimitResponse;

  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'No signature' }), { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.bookingId;

        await supabaseClient
          .from('bookings')
          .update({
            payment_status: 'succeeded',
            payment_intent_id: paymentIntent.id,
            status: 'confirmed',
          })
          .eq('id', bookingId);

        const { data: booking } = await supabaseClient
          .from('bookings')
          .select('user_id, trip_id, trips(driver_id)')
          .eq('id', bookingId)
          .single();

        if (booking) {
          await supabaseClient.from('notifications').insert({
            user_id: booking.user_id,
            type: 'payment_received',
            title: 'Payment Confirmed',
            body: 'Your booking payment was successful',
            data: { bookingId, tripId: booking.trip_id },
          });

          await supabaseClient.from('notifications').insert({
            user_id: booking.trips.driver_id,
            type: 'booking_confirmed',
            title: 'New Booking',
            body: 'You have a new confirmed booking',
            data: { bookingId, tripId: booking.trip_id },
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata.bookingId;

        await supabaseClient
          .from('bookings')
          .update({
            payment_status: 'failed',
            status: 'cancelled',
          })
          .eq('id', bookingId);
        break;
      }

      case 'refund.updated': {
        const refund = event.data.object as Stripe.Refund;

        await supabaseClient
          .from('refunds')
          .update({
            status: refund.status,
            processed_at: new Date().toISOString(),
          })
          .eq('refund_id', refund.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
