/**
 * Wasel Email Edge Function  —  supabase/functions/wasel-email/index.ts
 *
 * Handles all transactional email for the Wasel platform.
 * Supports Resend (primary) with SendGrid as automatic fallback.
 *
 * POST /functions/v1/wasel-email
 * Body: { type: EmailType, payload: EmailPayload }
 *
 * Auth: Bearer token in Authorization header OR
 *       X-Wasel-Worker-Secret header for internal service calls.
 *
 * ── Supported email types ────────────────────────────────────────────────────
 *  welcome                  New user signup
 *  email_confirmation       Email verify link
 *  password_reset           Password reset link
 *  booking_confirmation     Passenger: ride booked
 *  driver_booking_request   Driver: new ride request
 *  booking_status_update    Passenger: driver accepted/declined
 *  payment_receipt          Wallet top-up / ride payment receipt
 *  package_confirmation     Package sender confirmation + handoff code
 *  bus_booking_confirmation Bus seat booked
 *  ride_completed           Post-trip rating prompt
 *  security_alert           New login / password changed
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BRAND } from './brand.ts';
import {
  bookingConfirmationEmail,
  bookingStatusUpdateEmail,
  busBookingConfirmationEmail,
  driverBookingRequestEmail,
  emailConfirmationEmail,
  packageConfirmationEmail,
  paymentReceiptEmail,
  passwordResetEmail,
  rideCompletedEmail,
  securityAlertEmail,
  welcomeEmail,
} from './templates.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

type EmailType =
  | 'welcome'
  | 'email_confirmation'
  | 'password_reset'
  | 'booking_confirmation'
  | 'driver_booking_request'
  | 'booking_status_update'
  | 'payment_receipt'
  | 'package_confirmation'
  | 'bus_booking_confirmation'
  | 'ride_completed'
  | 'security_alert';

interface EmailRequest {
  type:    EmailType;
  to:      string;          // recipient email address
  payload: Record<string, unknown>;
}

interface SendResult {
  ok:       boolean;
  provider: 'resend' | 'sendgrid' | 'none';
  messageId?: string;
  error?:   string;
}

// ── Environment ───────────────────────────────────────────────────────────────

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')   ?? '';
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
const WORKER_SECRET    = Deno.env.get('COMMUNICATION_WORKER_SECRET') ?? '';
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ALLOWED_ORIGINS  = [
  'https://wasel14.online',
  'https://www.wasel14.online',
  'http://localhost:3000',
  'http://localhost:5173',
];

// ── CORS helper ───────────────────────────────────────────────────────────────

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wasel-Worker-Secret',
    'Access-Control-Max-Age':       '86400',
  };
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function isAuthorized(req: Request): Promise<boolean> {
  // Allow internal service calls with shared secret
  const workerSecret = req.headers.get('X-Wasel-Worker-Secret');
  if (WORKER_SECRET && workerSecret === WORKER_SECRET) return true;

  // Allow Supabase JWT bearer tokens
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.auth.getUser(token);
    return !error;
  } catch {
    return false;
  }
}

// ── Template resolver ─────────────────────────────────────────────────────────

type EmailOutput = { subject: string; html: string; text: string };

function resolveTemplate(type: EmailType, payload: Record<string, unknown>): EmailOutput {
  const p = payload as any; // typed per-case below

  switch (type) {
    case 'welcome':
      return welcomeEmail({
        name:       String(p.name ?? ''),
        email:      String(p.email ?? ''),
        confirmUrl: p.confirmUrl ? String(p.confirmUrl) : undefined,
      });

    case 'email_confirmation':
      return emailConfirmationEmail({
        name:       String(p.name ?? ''),
        confirmUrl: String(p.confirmUrl ?? ''),
      });

    case 'password_reset':
      return passwordResetEmail({
        name:     String(p.name ?? ''),
        resetUrl: String(p.resetUrl ?? ''),
      });

    case 'booking_confirmation':
      return bookingConfirmationEmail({
        passengerName: String(p.passengerName ?? ''),
        ticketCode:    String(p.ticketCode ?? ''),
        from:          String(p.from ?? ''),
        to:            String(p.to ?? ''),
        date:          String(p.date ?? ''),
        time:          String(p.time ?? ''),
        driverName:    String(p.driverName ?? ''),
        driverPhone:   p.driverPhone ? String(p.driverPhone) : undefined,
        seats:         Number(p.seats ?? 1),
        priceJod:      Number(p.priceJod ?? 0),
        status:        p.status === 'pending_driver' ? 'pending_driver' : 'confirmed',
      });

    case 'driver_booking_request':
      return driverBookingRequestEmail({
        driverName:    String(p.driverName ?? ''),
        passengerName: String(p.passengerName ?? ''),
        ticketCode:    String(p.ticketCode ?? ''),
        from:          String(p.from ?? ''),
        to:            String(p.to ?? ''),
        date:          String(p.date ?? ''),
        time:          String(p.time ?? ''),
        seats:         Number(p.seats ?? 1),
        priceJod:      Number(p.priceJod ?? 0),
        acceptUrl:     String(p.acceptUrl ?? ''),
        declineUrl:    String(p.declineUrl ?? ''),
      });

    case 'booking_status_update':
      return bookingStatusUpdateEmail({
        passengerName: String(p.passengerName ?? ''),
        ticketCode:    String(p.ticketCode ?? ''),
        from:          String(p.from ?? ''),
        to:            String(p.to ?? ''),
        date:          String(p.date ?? ''),
        time:          String(p.time ?? ''),
        driverName:    String(p.driverName ?? ''),
        newStatus:     p.newStatus === 'rejected' ? 'rejected' : p.newStatus === 'cancelled' ? 'cancelled' : 'confirmed',
        priceJod:      Number(p.priceJod ?? 0),
      });

    case 'payment_receipt':
      return paymentReceiptEmail({
        name:          String(p.name ?? ''),
        transactionId: String(p.transactionId ?? ''),
        type:          (['top_up','ride_payment','package_payment','withdrawal'] as const)
                         .includes(p.type) ? p.type : 'top_up',
        amountJod:     Number(p.amountJod ?? 0),
        balanceJod:    Number(p.balanceJod ?? 0),
        description:   String(p.description ?? ''),
        createdAt:     String(p.createdAt ?? new Date().toISOString()),
        paymentMethod: p.paymentMethod ? String(p.paymentMethod) : undefined,
      });

    case 'package_confirmation':
      return packageConfirmationEmail({
        senderName:    String(p.senderName ?? ''),
        trackingId:    String(p.trackingId ?? ''),
        handoffCode:   String(p.handoffCode ?? ''),
        from:          String(p.from ?? ''),
        to:            String(p.to ?? ''),
        weight:        String(p.weight ?? '<1 kg'),
        recipientName: p.recipientName ? String(p.recipientName) : undefined,
        matchedDriver: p.matchedDriver ? String(p.matchedDriver) : undefined,
        status:        p.status === 'matched' ? 'matched' : 'searching',
      });

    case 'bus_booking_confirmation':
      return busBookingConfirmationEmail({
        passengerName:  String(p.passengerName ?? ''),
        ticketCode:     String(p.ticketCode ?? ''),
        pickupStop:     String(p.pickupStop ?? ''),
        dropoffStop:    String(p.dropoffStop ?? ''),
        scheduleDate:   String(p.scheduleDate ?? ''),
        departureTime:  String(p.departureTime ?? ''),
        seats:          Number(p.seats ?? 1),
        seatPreference: String(p.seatPreference ?? 'any'),
        priceJod:       Number(p.priceJod ?? 0),
      });

    case 'ride_completed':
      return rideCompletedEmail({
        recipientName:   String(p.recipientName ?? ''),
        role:            p.role === 'driver' ? 'driver' : 'passenger',
        ticketCode:      String(p.ticketCode ?? ''),
        from:            String(p.from ?? ''),
        to:              String(p.to ?? ''),
        date:            String(p.date ?? ''),
        counterpartName: String(p.counterpartName ?? ''),
        amountJod:       Number(p.amountJod ?? 0),
        ratingUrl:       String(p.ratingUrl ?? `${BRAND.appUrl}/app/my-trips`),
      });

    case 'security_alert':
      return securityAlertEmail({
        name:        String(p.name ?? ''),
        eventType:   (['new_login','password_changed','email_changed'] as const)
                       .includes(p.eventType) ? p.eventType : 'new_login',
        ip:          p.ip ? String(p.ip) : undefined,
        userAgent:   p.userAgent ? String(p.userAgent) : undefined,
        time:        String(p.time ?? new Date().toISOString()),
        settingsUrl: String(p.settingsUrl ?? `${BRAND.appUrl}/app/settings?section=security`),
      });

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

// ── Send via Resend ───────────────────────────────────────────────────────────

async function sendViaResend(opts: {
  to:      string;
  subject: string;
  html:    string;
  text:    string;
}): Promise<SendResult> {
  if (!RESEND_API_KEY) return { ok: false, provider: 'none', error: 'RESEND_API_KEY not set' };

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:     BRAND.fromEmail,
      reply_to: BRAND.supportEmail,
      to:       [opts.to],
      subject:  opts.subject,
      html:     opts.html,
      text:     opts.text,
    }),
  });

  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: true, provider: 'resend', messageId: data?.id };
  }

  const err = await res.text().catch(() => res.statusText);
  return { ok: false, provider: 'resend', error: `Resend ${res.status}: ${err}` };
}

// ── Send via SendGrid (fallback) ──────────────────────────────────────────────

async function sendViaSendGrid(opts: {
  to:      string;
  subject: string;
  html:    string;
  text:    string;
}): Promise<SendResult> {
  if (!SENDGRID_API_KEY) return { ok: false, provider: 'none', error: 'SENDGRID_API_KEY not set' };

  const fromRaw  = BRAND.fromEmail;   // e.g. "Wasel <notifications@wasel14.online>"
  const match    = fromRaw.match(/<(.+?)>/);
  const fromEmail = match ? match[1] : fromRaw;
  const fromName  = match ? fromRaw.split('<')[0].trim() : BRAND.appName;

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to }] }],
      from:             { email: fromEmail, name: fromName },
      reply_to:         { email: BRAND.supportEmail },
      subject:          opts.subject,
      content: [
        { type: 'text/plain', value: opts.text },
        { type: 'text/html',  value: opts.html },
      ],
    }),
  });

  if (res.ok || res.status === 202) {
    return { ok: true, provider: 'sendgrid', messageId: res.headers.get('X-Message-Id') ?? undefined };
  }

  const err = await res.text().catch(() => res.statusText);
  return { ok: false, provider: 'sendgrid', error: `SendGrid ${res.status}: ${err}` };
}

// ── Send with auto-fallback ───────────────────────────────────────────────────

async function sendEmail(opts: {
  to:      string;
  subject: string;
  html:    string;
  text:    string;
}): Promise<SendResult> {
  // 1. Try Resend (primary)
  if (RESEND_API_KEY) {
    const result = await sendViaResend(opts);
    if (result.ok) return result;
    console.warn('[wasel-email] Resend failed, falling back to SendGrid:', result.error);
  }

  // 2. Fallback to SendGrid
  if (SENDGRID_API_KEY) {
    return sendViaSendGrid(opts);
  }

  return { ok: false, provider: 'none', error: 'No email provider configured.' };
}

// ── Log delivery to Supabase ──────────────────────────────────────────────────

async function logDelivery(opts: {
  userId?:     string;
  to:         string;
  type:       EmailType;
  subject:    string;
  result:     SendResult;
  notificationId?: string;
}): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !opts.userId) return;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from('communication_deliveries').insert({
      user_id:         opts.userId,
      channel:         'email',
      delivery_status: opts.result.ok ? 'sent' : 'failed',
      destination:     opts.to,
      subject:         opts.subject,
      notification_id: opts.notificationId ?? null,
      payload:         { type: opts.type },
      provider_name:   opts.result.provider,
      external_reference: opts.result.messageId ?? null,
      error_message:   opts.result.error ?? null,
    });
  } catch (error) {
    console.error('[wasel-email] Failed to log delivery:', error);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  // Auth check
  const authorized = await isAuthorized(req);
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  // Parse body
  let body: EmailRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers });
  }

  const { type, to, payload } = body;

  // Validate
  if (!type || !to || !payload) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: type, to, payload' }),
      { status: 400, headers },
    );
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers });
  }

  // Resolve template
  let emailOutput: { subject: string; html: string; text: string };
  try {
    emailOutput = resolveTemplate(type, payload);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Template error';
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers });
  }

  // Send
  const result = await sendEmail({ to, ...emailOutput });

  // Log asynchronously — don't block the response
  void logDelivery({
    userId: payload.userId ? String(payload.userId) : undefined,
    to,
    type,
    subject:        emailOutput.subject,
    result,
    notificationId: payload.notificationId ? String(payload.notificationId) : undefined,
  });

  if (!result.ok) {
    console.error('[wasel-email] Send failed:', result.error);
    return new Response(
      JSON.stringify({ success: false, provider: result.provider, error: result.error }),
      { status: 502, headers },
    );
  }

  return new Response(
    JSON.stringify({ success: true, provider: result.provider, messageId: result.messageId }),
    { status: 200, headers },
  );
});
