/**
 * Wasel Email Service  —  src/services/emailService.ts
 *
 * Thin frontend client that calls the wasel-email Supabase edge function.
 * Every transactional email in the app flows through here.
 * Falls back silently on error so UI flows are never blocked by email.
 */

import { getConfig } from '../utils/env';
import { getAuthDetails, supabase } from './core';

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

interface EmailSendResult {
  success:    boolean;
  provider?:  'resend' | 'sendgrid' | 'none';
  messageId?: string;
  error?:     string;
}

// ── Edge function URL ─────────────────────────────────────────────────────────

function getEmailFunctionUrl(): string {
  const base =
    import.meta.env.VITE_EDGE_FUNCTIONS_BASE_URL ||
    (import.meta.env.VITE_SUPABASE_URL
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
      : '');
  return `${base}/wasel-email`;
}

// ── Core sender ───────────────────────────────────────────────────────────────

async function sendEmail(opts: {
  type:    EmailType;
  to:      string;
  payload: Record<string, unknown>;
}): Promise<EmailSendResult> {
  if (!getConfig().enableEmailNotifications) {
    return { success: false, error: 'Email notifications are disabled' };
  }

  if (!opts.to || !opts.to.includes('@')) {
    return { success: false, error: 'Invalid recipient email' };
  }

  const functionUrl = getEmailFunctionUrl();
  if (!functionUrl) {
    return { success: false, error: 'Email function is not configured' };
  }

  let authToken: string | null = null;
  try {
    const auth = await getAuthDetails();
    authToken = auth.token;
  } catch {
    // No session available — use anon key if set
    authToken = import.meta.env.VITE_SUPABASE_ANON_KEY ?? null;
  }

  // Also try Supabase session directly as fallback
  if (!authToken && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      authToken = data.session?.access_token ?? null;
    } catch {
      // ignore
    }
  }

  if (!authToken) {
    console.warn('[emailService] No auth token — email send skipped');
    return { success: false, error: 'No auth token available' };
  }

  try {
    const response = await fetch(functionUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ type: opts.type, to: opts.to, payload: opts.payload }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error ?? `HTTP ${response.status}` };
    }

    return await response.json();
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Network error';
    console.error('[emailService] Failed to send email:', msg);
    return { success: false, error: msg };
  }
}

// ── Public API — one typed method per email type ───────────────────────────────

export const emailService = {

  // ── 1. Welcome ─────────────────────────────────────────────────────────────
  async sendWelcome(opts: {
    to:         string;
    name:       string;
    confirmUrl?: string;
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'welcome',
      to:   opts.to,
      payload: { name: opts.name, email: opts.to, confirmUrl: opts.confirmUrl },
    });
  },

  // ── 2. Email confirmation ──────────────────────────────────────────────────
  async sendEmailConfirmation(opts: {
    to:         string;
    name:       string;
    confirmUrl: string;
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'email_confirmation',
      to:   opts.to,
      payload: { name: opts.name, confirmUrl: opts.confirmUrl },
    });
  },

  // ── 3. Password reset ──────────────────────────────────────────────────────
  async sendPasswordReset(opts: {
    to:       string;
    name:     string;
    resetUrl: string;
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'password_reset',
      to:   opts.to,
      payload: { name: opts.name, resetUrl: opts.resetUrl },
    });
  },

  // ── 4. Booking confirmation (passenger) ────────────────────────────────────
  async sendBookingConfirmation(opts: {
    to:            string;
    passengerName: string;
    ticketCode:    string;
    from:          string;
    to_city:       string;
    date:          string;
    time:          string;
    driverName:    string;
    driverPhone?:  string;
    seats:         number;
    priceJod:      number;
    status:        'confirmed' | 'pending_driver';
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'booking_confirmation',
      to:   opts.to,
      payload: {
        passengerName: opts.passengerName,
        ticketCode:    opts.ticketCode,
        from:          opts.from,
        to:            opts.to_city,
        date:          opts.date,
        time:          opts.time,
        driverName:    opts.driverName,
        driverPhone:   opts.driverPhone,
        seats:         opts.seats,
        priceJod:      opts.priceJod,
        status:        opts.status,
      },
    });
  },

  // ── 5. Driver booking request ─────────────────────────────────────────────
  async sendDriverBookingRequest(opts: {
    to:            string;
    driverName:    string;
    passengerName: string;
    ticketCode:    string;
    from:          string;
    to_city:       string;
    date:          string;
    time:          string;
    seats:         number;
    priceJod:      number;
    acceptUrl:     string;
    declineUrl:    string;
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'driver_booking_request',
      to:   opts.to,
      payload: {
        driverName:    opts.driverName,
        passengerName: opts.passengerName,
        ticketCode:    opts.ticketCode,
        from:          opts.from,
        to:            opts.to_city,
        date:          opts.date,
        time:          opts.time,
        seats:         opts.seats,
        priceJod:      opts.priceJod,
        acceptUrl:     opts.acceptUrl,
        declineUrl:    opts.declineUrl,
      },
    });
  },

  // ── 6. Booking status update (driver accepted/declined) ───────────────────
  async sendBookingStatusUpdate(opts: {
    to:            string;
    passengerName: string;
    ticketCode:    string;
    from:          string;
    to_city:       string;
    date:          string;
    time:          string;
    driverName:    string;
    newStatus:     'confirmed' | 'rejected' | 'cancelled';
    priceJod:      number;
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'booking_status_update',
      to:   opts.to,
      payload: {
        passengerName: opts.passengerName,
        ticketCode:    opts.ticketCode,
        from:          opts.from,
        to:            opts.to_city,
        date:          opts.date,
        time:          opts.time,
        driverName:    opts.driverName,
        newStatus:     opts.newStatus,
        priceJod:      opts.priceJod,
      },
    });
  },

  // ── 7. Payment receipt ────────────────────────────────────────────────────
  async sendPaymentReceipt(opts: {
    to:            string;
    name:          string;
    transactionId: string;
    type:          'top_up' | 'ride_payment' | 'package_payment' | 'withdrawal';
    amountJod:     number;
    balanceJod:    number;
    description:   string;
    createdAt?:    string;
    paymentMethod?: string;
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'payment_receipt',
      to:   opts.to,
      payload: {
        name:          opts.name,
        transactionId: opts.transactionId,
        type:          opts.type,
        amountJod:     opts.amountJod,
        balanceJod:    opts.balanceJod,
        description:   opts.description,
        createdAt:     opts.createdAt ?? new Date().toISOString(),
        paymentMethod: opts.paymentMethod,
      },
    });
  },

  // ── 8. Package confirmation ───────────────────────────────────────────────
  async sendPackageConfirmation(opts: {
    to:            string;
    senderName:    string;
    trackingId:    string;
    handoffCode:   string;
    from:          string;
    to_city:       string;
    weight:        string;
    recipientName?: string;
    matchedDriver?: string;
    status:        'searching' | 'matched';
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'package_confirmation',
      to:   opts.to,
      payload: {
        senderName:    opts.senderName,
        trackingId:    opts.trackingId,
        handoffCode:   opts.handoffCode,
        from:          opts.from,
        to:            opts.to_city,
        weight:        opts.weight,
        recipientName: opts.recipientName,
        matchedDriver: opts.matchedDriver,
        status:        opts.status,
      },
    });
  },

  // ── 9. Bus booking confirmation ───────────────────────────────────────────
  async sendBusBookingConfirmation(opts: {
    to:             string;
    passengerName:  string;
    ticketCode:     string;
    pickupStop:     string;
    dropoffStop:    string;
    scheduleDate:   string;
    departureTime:  string;
    seats:          number;
    seatPreference: string;
    priceJod:       number;
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'bus_booking_confirmation',
      to:   opts.to,
      payload: opts,
    });
  },

  // ── 10. Ride completed ─────────────────────────────────────────────────────
  async sendRideCompleted(opts: {
    to:              string;
    recipientName:   string;
    role:            'passenger' | 'driver';
    ticketCode:      string;
    from:            string;
    to_city:         string;
    date:            string;
    counterpartName: string;
    amountJod:       number;
    ratingUrl:       string;
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'ride_completed',
      to:   opts.to,
      payload: {
        recipientName:   opts.recipientName,
        role:            opts.role,
        ticketCode:      opts.ticketCode,
        from:            opts.from,
        to:              opts.to_city,
        date:            opts.date,
        counterpartName: opts.counterpartName,
        amountJod:       opts.amountJod,
        ratingUrl:       opts.ratingUrl,
      },
    });
  },

  // ── 11. Security alert ─────────────────────────────────────────────────────
  async sendSecurityAlert(opts: {
    to:        string;
    name:      string;
    eventType: 'new_login' | 'password_changed' | 'email_changed';
    ip?:       string;
    userAgent?: string;
    time?:     string;
    settingsUrl?: string;
  }): Promise<EmailSendResult> {
    return sendEmail({
      type: 'security_alert',
      to:   opts.to,
      payload: {
        name:        opts.name,
        eventType:   opts.eventType,
        ip:          opts.ip,
        userAgent:   opts.userAgent,
        time:        opts.time ?? new Date().toISOString(),
        settingsUrl: opts.settingsUrl,
      },
    });
  },
};
