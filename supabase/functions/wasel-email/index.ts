import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Wasel <notifications@wasel.jo>';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface EmailRequest {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

const templates = {
  welcome: (data: any) => `
    <h1>Welcome to Wasel, ${data.name}!</h1>
    <p>Thank you for joining Jordan's leading ride-sharing platform.</p>
    <p>Get started by:</p>
    <ul>
      <li>Finding your first ride</li>
      <li>Offering a ride to earn money</li>
      <li>Sending a package with a traveler</li>
    </ul>
    <a href="${data.appUrl}/app/find-ride" style="background: #47B7E6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">
      Find a Ride
    </a>
  `,
  
  rideConfirmed: (data: any) => `
    <h1>Ride Confirmed!</h1>
    <p>Hi ${data.passengerName},</p>
    <p>Your ride has been confirmed with ${data.driverName}.</p>
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p><strong>Pickup:</strong> ${data.pickupAddress}</p>
      <p><strong>Dropoff:</strong> ${data.dropoffAddress}</p>
      <p><strong>Time:</strong> ${data.pickupTime}</p>
      <p><strong>Price:</strong> ${data.price} JOD</p>
    </div>
    <p>Your driver will contact you shortly.</p>
    <a href="${data.appUrl}/app/my-trips" style="background: #47B7E6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
      View Trip Details
    </a>
  `,
  
  rideRequest: (data: any) => `
    <h1>New Ride Request</h1>
    <p>Hi ${data.driverName},</p>
    <p>You have a new ride request from ${data.passengerName}.</p>
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p><strong>Pickup:</strong> ${data.pickupAddress}</p>
      <p><strong>Dropoff:</strong> ${data.dropoffAddress}</p>
      <p><strong>Seats:</strong> ${data.seats}</p>
      <p><strong>Price:</strong> ${data.price} JOD</p>
    </div>
    <a href="${data.appUrl}/app/my-trips" style="background: #47B7E6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
      Accept Request
    </a>
  `,
  
  packageDelivered: (data: any) => `
    <h1>Package Delivered</h1>
    <p>Hi ${data.senderName},</p>
    <p>Your package (${data.trackingNumber}) has been successfully delivered.</p>
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p><strong>Delivered to:</strong> ${data.receiverName}</p>
      <p><strong>Delivered at:</strong> ${data.deliveryTime}</p>
      <p><strong>Carrier:</strong> ${data.carrierName}</p>
    </div>
    <p>Please rate your delivery experience.</p>
    <a href="${data.appUrl}/app/packages" style="background: #47B7E6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
      Rate Delivery
    </a>
  `,
  
  paymentReceipt: (data: any) => `
    <h1>Payment Receipt</h1>
    <p>Hi ${data.userName},</p>
    <p>Your payment has been processed successfully.</p>
    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p><strong>Amount:</strong> ${data.amount} ${data.currency}</p>
      <p><strong>Type:</strong> ${data.type}</p>
      <p><strong>Date:</strong> ${data.date}</p>
      <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
    </div>
    <a href="${data.appUrl}/app/wallet" style="background: #47B7E6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
      View Wallet
    </a>
  `,
  
  passwordReset: (data: any) => `
    <h1>Reset Your Password</h1>
    <p>Hi ${data.name},</p>
    <p>You requested to reset your password. Click the button below to create a new password.</p>
    <a href="${data.resetLink}" style="background: #47B7E6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">
      Reset Password
    </a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `,
};

async function sendEmail(request: EmailRequest): Promise<boolean> {
  const template = templates[request.template as keyof typeof templates];
  if (!template) {
    throw new Error(`Unknown template: ${request.template}`);
  }

  const html = template(request.data);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: request.to,
      subject: request.subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Resend API error:', error);
    throw new Error(`Failed to send email: ${error}`);
  }

  return true;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { to, subject, template, data } = await req.json();

    if (!to || !subject || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check user email preferences
    const { data: prefs } = await supabase
      .from('communication_preferences')
      .select('email_notifications')
      .eq('user_id', data.userId)
      .single();

    if (prefs && !prefs.email_notifications) {
      return new Response(
        JSON.stringify({ message: 'Email notifications disabled for user' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await sendEmail({ to, subject, template, data });

    // Log email sent
    await supabase.from('business_events').insert({
      event_name: 'email_sent',
      user_id: data.userId,
      properties: { to, subject, template },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
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
