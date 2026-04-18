import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing webhook: ${event.type}`);

    // Log webhook receipt
    await supabase.from('payment_webhooks').insert({
      provider: 'stripe',
      event_id: event.id,
      event_type: event.type,
      raw_payload: event,
      status: 'RECEIVED',
    });

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark webhook as processed
    await supabase
      .from('payment_webhooks')
      .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
      .eq('event_id', event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    
    // Log error
    await supabase.from('payment_webhooks').insert({
      provider: 'stripe',
      event_id: 'error',
      event_type: 'error',
      raw_payload: { error: error.message },
      status: 'FAILED',
      processing_error: error.message,
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});

async function handlePaymentSuccess(paymentIntent: any) {
  const { id, amount, currency, metadata } = paymentIntent;
  
  // Update payment status
  await supabase
    .from('payment_status')
    .upsert({
      payment_intent_id: id,
      status: 'SUCCESS',
      amount: amount / 100, // Convert from cents
      currency: currency.toUpperCase(),
      user_id: metadata.user_id,
      reference_type: metadata.reference_type,
      reference_id: metadata.reference_id,
      provider_data: paymentIntent,
    });

  // Update ride/package payment status
  if (metadata.reference_type === 'ride') {
    await supabase
      .from('rides')
      .update({ payment_status: 'paid', payment_intent_id: id })
      .eq('id', metadata.reference_id);
    
    // Create wallet transaction
    await createWalletTransaction({
      userId: metadata.user_id,
      amount: amount / 100,
      type: 'debit',
      category: 'ride_payment',
      referenceType: 'ride',
      referenceId: metadata.reference_id,
      paymentIntentId: id,
    });
  } else if (metadata.reference_type === 'package') {
    await supabase
      .from('packages')
      .update({ payment_status: 'paid', payment_intent_id: id })
      .eq('id', metadata.reference_id);
    
    await createWalletTransaction({
      userId: metadata.user_id,
      amount: amount / 100,
      type: 'debit',
      category: 'package_payment',
      referenceType: 'package',
      referenceId: metadata.reference_id,
      paymentIntentId: id,
    });
  } else if (metadata.reference_type === 'wallet_topup') {
    // Credit wallet
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', metadata.user_id)
      .single();
    
    const newBalance = (profile?.wallet_balance || 0) + (amount / 100);
    
    await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', metadata.user_id);
    
    await createWalletTransaction({
      userId: metadata.user_id,
      amount: amount / 100,
      type: 'credit',
      category: 'wallet_topup',
      paymentIntentId: id,
    });
  }

  // Send notification
  await supabase.from('notifications').insert({
    user_id: metadata.user_id,
    title: 'Payment Successful',
    message: `Your payment of ${(amount / 100).toFixed(2)} ${currency.toUpperCase()} was successful.`,
    type: 'payment',
    reference_type: metadata.reference_type,
    reference_id: metadata.reference_id,
  });
}

async function handlePaymentFailed(paymentIntent: any) {
  const { id, amount, currency, metadata } = paymentIntent;
  
  await supabase
    .from('payment_status')
    .upsert({
      payment_intent_id: id,
      status: 'FAILED',
      amount: amount / 100,
      currency: currency.toUpperCase(),
      user_id: metadata.user_id,
      reference_type: metadata.reference_type,
      reference_id: metadata.reference_id,
      provider_data: paymentIntent,
    });

  // Send notification
  await supabase.from('notifications').insert({
    user_id: metadata.user_id,
    title: 'Payment Failed',
    message: 'Your payment could not be processed. Please try again.',
    type: 'payment',
    priority: 'high',
  });
}

async function handleRefund(charge: any) {
  const { payment_intent, amount_refunded, currency } = charge;
  
  // Find original payment
  const { data: payment } = await supabase
    .from('payment_status')
    .select('*')
    .eq('payment_intent_id', payment_intent)
    .single();
  
  if (!payment) return;

  // Update payment status
  await supabase
    .from('payment_status')
    .update({ status: 'REFUNDED' })
    .eq('payment_intent_id', payment_intent);

  // Create refund transaction
  await createWalletTransaction({
    userId: payment.user_id,
    amount: amount_refunded / 100,
    type: 'credit',
    category: payment.reference_type === 'ride' ? 'ride_refund' : 'package_refund',
    referenceType: payment.reference_type,
    referenceId: payment.reference_id,
    paymentIntentId: payment_intent,
  });

  // Send notification
  await supabase.from('notifications').insert({
    user_id: payment.user_id,
    title: 'Refund Processed',
    message: `A refund of ${(amount_refunded / 100).toFixed(2)} ${currency.toUpperCase()} has been processed.`,
    type: 'payment',
  });
}

async function createWalletTransaction(params: {
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  referenceType?: string;
  referenceId?: string;
  paymentIntentId?: string;
}) {
  // Get current balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', params.userId)
    .single();
  
  const balanceBefore = profile?.wallet_balance || 0;
  const balanceAfter = params.type === 'credit' 
    ? balanceBefore + params.amount 
    : balanceBefore - params.amount;

  // Create transaction
  await supabase.from('wallet_transactions').insert({
    user_id: params.userId,
    amount: params.amount,
    type: params.type,
    category: params.category,
    reference_type: params.referenceType,
    reference_id: params.referenceId,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    payment_intent_id: params.paymentIntentId,
    status: 'completed',
  });

  // Update profile balance if not topup (topup already updated)
  if (params.category !== 'wallet_topup') {
    await supabase
      .from('profiles')
      .update({ wallet_balance: balanceAfter })
      .eq('id', params.userId);
  }
}
