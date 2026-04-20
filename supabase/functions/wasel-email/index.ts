/**
 * Wasel Email Service
 * Sends transactional emails via Resend
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Wasel <notifications@wasel.jo>';

interface EmailRequest {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

const templates = {
  ride_confirmed: (data: any) => `
    <h2>Ride Confirmed!</h2>
    <p>Hi ${data.passenger_name},</p>
    <p>Your ride has been confirmed.</p>
    <ul>
      <li><strong>From:</strong> ${data.origin}</li>
      <li><strong>To:</strong> ${data.destination}</li>
      <li><strong>Departure:</strong> ${data.departure_time}</li>
      <li><strong>Driver:</strong> ${data.driver_name}</li>
      <li><strong>Price:</strong> ${data.price} JOD</li>
    </ul>
    <p>Have a safe trip!</p>
  `,
  
  ride_cancelled: (data: any) => `
    <h2>Ride Cancelled</h2>
    <p>Hi ${data.passenger_name},</p>
    <p>Your ride has been cancelled.</p>
    <p><strong>Reason:</strong> ${data.reason}</p>
    <p>If you were charged, a refund will be processed within 5-7 business days.</p>
  `,
  
  package_delivered: (data: any) => `
    <h2>Package Delivered</h2>
    <p>Hi ${data.sender_name},</p>
    <p>Your package (${data.tracking_number}) has been delivered successfully.</p>
    <p><strong>Delivered to:</strong> ${data.receiver_name}</p>
    <p><strong>Delivered at:</strong> ${data.delivery_time}</p>
  `,
  
  payment_success: (data: any) => `
    <h2>Payment Successful</h2>
    <p>Hi ${data.user_name},</p>
    <p>Your payment of ${data.amount} ${data.currency} was successful.</p>
    <p><strong>Transaction ID:</strong> ${data.transaction_id}</p>
    <p><strong>Date:</strong> ${data.date}</p>
  `,
  
  verification_approved: (data: any) => `
    <h2>Verification Approved</h2>
    <p>Hi ${data.user_name},</p>
    <p>Your ${data.verification_type} verification has been approved!</p>
    <p>You can now access all features of Wasel.</p>
  `,
};

serve(async (req) => {
  try {
    const { to, subject, template, data }: EmailRequest = await req.json();

    if (!to || !subject || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    const templateFn = templates[template as keyof typeof templates];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: 'Invalid template' }),
        { status: 400 }
      );
    }

    const html = templateFn(data);

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await response.json();

    // Log email sent
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('business_events').insert({
      event_name: 'email_sent',
      properties: {
        to,
        subject,
        template,
        email_id: result.id,
      },
    });

    return new Response(
      JSON.stringify({ success: true, email_id: result.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Email error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
