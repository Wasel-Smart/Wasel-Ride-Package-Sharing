import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefundRequest {
  bookingId: string;
  amount?: number;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { bookingId, amount, reason }: RefundRequest = await req.json();

    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*, trips(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    if (booking.user_id !== user.id && booking.trips.driver_id !== user.id) {
      throw new Error('Unauthorized');
    }

    if (!booking.payment_intent_id) {
      throw new Error('No payment to refund');
    }

    if (booking.payment_status === 'refunded') {
      throw new Error('Already refunded');
    }

    const refundAmount = amount || booking.total_price * 100;

    const refund = await stripe.refunds.create({
      payment_intent: booking.payment_intent_id,
      amount: Math.round(refundAmount),
      reason: 'requested_by_customer',
      metadata: {
        bookingId,
        userId: user.id,
        reason,
      },
    });

    const { error: refundInsertError } = await supabaseClient
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

    await supabaseClient
      .from('bookings')
      .update({
        payment_status: 'refunded',
        refund_amount: refund.amount,
      })
      .eq('id', bookingId);

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        amount: refund.amount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
