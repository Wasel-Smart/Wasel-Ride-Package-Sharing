/**
 * Wasel Email Templates
 * One exported function per transactional email type.
 * Every template uses the shared layout system and renders
 * the Wasel SVG logo inline — no remote image dependencies.
 */

import { BRAND } from './brand.ts';
import {
  bodyText, ctaButton, detailTable, divider,
  emailShell, esc, fmt, fmtDate,
  infoCard, sectionHeading, statusPill, ticketBadge,
} from './layout.ts';

// ─────────────────────────────────────────────────────────────────────────────
// 1. WELCOME — sent immediately after signup
// ─────────────────────────────────────────────────────────────────────────────

export function welcomeEmail(opts: {
  name:    string;
  email:   string;
  confirmUrl?: string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.name.split(' ')[0] || 'Traveler';
  const subject   = `Welcome to Wasel, ${firstName} 👋`;
  const preheader = 'Your Wasel account is ready. Explore rides, packages, and live corridors across Jordan.';

  const body = `
    ${sectionHeading(`Welcome aboard, ${firstName}.`)}
    ${bodyText(`
      Your Wasel account is live. Wasel connects riders, drivers, and package senders
      across Jordan's busiest corridors — with live pricing, trust-verified profiles,
      and prayer-time-aware scheduling built in.
    `)}

    ${opts.confirmUrl ? `
    ${infoCard({
      accent: BRAND.amber,
      icon:   '📧',
      title:  'Confirm your email address',
      body:   `One quick step to unlock full account features — booking, wallet,
               and driver mode all require a verified email.`,
    })}
    ${ctaButton({ label: 'Confirm my email', url: opts.confirmUrl, color: BRAND.cyan })}
    ${divider()}
    ` : ''}

    <!-- What you can do -->
    <h3 style="font-family:${BRAND.font};font-size:14px;font-weight:800;
                color:${BRAND.textMuted};text-transform:uppercase;
                letter-spacing:0.1em;margin:0 0 14px;">
      What you can do on Wasel
    </h3>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      ${[
        { icon:'🛣️', label:'Find a Ride',    desc:'Compare live departures on popular Jordan corridors.',      path:'/app/find-ride'  },
        { icon:'🚘', label:'Offer a Route',  desc:'Post seats, earn on your commute, carry packages.',         path:'/app/offer-ride' },
        { icon:'📦', label:'Send a Package', desc:'Move parcels with a trusted rider on the same route.',      path:'/app/packages'   },
        { icon:'🚌', label:'Book a Bus',     desc:'Fixed intercity departures with clear schedules.',          path:'/app/bus'        },
      ].map(f => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:20px;padding-right:12px;vertical-align:middle;">${f.icon}</td>
                <td style="vertical-align:middle;">
                  <div style="font-family:${BRAND.font};font-size:14px;font-weight:800;
                              color:${BRAND.textPrimary};margin-bottom:2px;">
                    <a href="${BRAND.appUrl}${f.path}" style="color:${BRAND.textPrimary};text-decoration:none;">
                      ${esc(f.label)}
                    </a>
                  </div>
                  <div style="font-family:${BRAND.font};font-size:12px;color:${BRAND.textMuted};
                              line-height:1.5;">
                    ${esc(f.desc)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`).join('')}
    </table>

    ${ctaButton({ label: 'Open Wasel', url: `${BRAND.appUrl}/app/find-ride` })}

    ${bodyText(`
      If you have questions, reply to this email or contact us at
      <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a>.
      We typically respond within a few hours.
    `)}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `Welcome to Wasel, ${firstName}!\n\n` +
          (opts.confirmUrl ? `Confirm your email: ${opts.confirmUrl}\n\n` : '') +
          `Open the app: ${BRAND.appUrl}/app/find-ride\n\n` +
          `Questions? ${BRAND.supportEmail}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EMAIL CONFIRMATION — triggered by Supabase auth.confirm
// ─────────────────────────────────────────────────────────────────────────────

export function emailConfirmationEmail(opts: {
  name:       string;
  confirmUrl: string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.name.split(' ')[0] || 'Traveler';
  const subject   = 'Confirm your Wasel email address';
  const preheader = 'Click to verify your email and unlock full Wasel features.';

  const body = `
    ${sectionHeading('Confirm your email.')}
    ${bodyText(`
      Hi ${esc(firstName)}, you're almost in. Click the button below to verify
      <strong style="color:${BRAND.textPrimary};">${esc(opts.name)}</strong>'s
      Wasel account and unlock booking, wallet, and driver features.
    `)}
    ${ctaButton({ label: 'Confirm email address', url: opts.confirmUrl })}
    ${infoCard({
      accent: BRAND.textMuted,
      icon:   '⏱️',
      title:  'Link expires in 24 hours',
      body:   `If you didn't create a Wasel account you can safely ignore this email.
               No action is needed and your email address won't be used.`,
    })}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `Hi ${firstName},\n\nConfirm your Wasel email:\n${opts.confirmUrl}\n\nLink expires in 24 hours.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PASSWORD RESET
// ─────────────────────────────────────────────────────────────────────────────

export function passwordResetEmail(opts: {
  name:     string;
  resetUrl: string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.name.split(' ')[0] || 'Traveler';
  const subject   = 'Reset your Wasel password';
  const preheader = 'We received a request to reset your Wasel account password.';

  const body = `
    ${sectionHeading('Password reset request.')}
    ${bodyText(`
      Hi ${esc(firstName)}, we received a request to reset the password for your Wasel account.
      Click the button below to choose a new password.
    `)}
    ${ctaButton({ label: 'Reset my password', url: opts.resetUrl, color: BRAND.gold })}
    ${infoCard({
      accent: BRAND.red,
      icon:   '🔒',
      title:  'Didn\'t request this?',
      body:   `If you didn't ask to reset your password, you can safely ignore this email.
               Your account remains secure and your password hasn't changed.
               This link expires in 1 hour.`,
    })}
    ${bodyText(`
      For security questions, contact us at
      <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a>.
    `)}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `Hi ${firstName},\n\nReset your Wasel password:\n${opts.resetUrl}\n\nExpires in 1 hour.\n\nDidn't request this? Ignore this email.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BOOKING CONFIRMATION — passenger receives this after booking a ride
// ─────────────────────────────────────────────────────────────────────────────

export function bookingConfirmationEmail(opts: {
  passengerName:  string;
  ticketCode:     string;
  from:           string;
  to:             string;
  date:           string;
  time:           string;
  driverName:     string;
  driverPhone?:   string;
  seats:          number;
  priceJod:       number;
  status:         'confirmed' | 'pending_driver';
}): { subject: string; html: string; text: string } {
  const firstName = opts.passengerName.split(' ')[0] || 'Traveler';
  const isPending = opts.status === 'pending_driver';
  const subject   = isPending
    ? `Ride request sent — ${opts.from} to ${opts.to}`
    : `Ride confirmed — ${opts.from} to ${opts.to}`;
  const preheader = isPending
    ? `Your request to ${opts.driverName} is waiting for approval. Ticket ${opts.ticketCode}.`
    : `Your ride from ${opts.from} to ${opts.to} on ${opts.date} is confirmed.`;

  const statusLabel = isPending ? 'Pending driver approval' : 'Confirmed';
  const statusColor = isPending ? BRAND.amber : BRAND.green;

  const body = `
    ${sectionHeading(isPending ? 'Ride request sent.' : 'Ride confirmed.')}
    ${bodyText(`
      Hi ${esc(firstName)},
      ${isPending
        ? `your ride request from <strong style="color:${BRAND.textPrimary};">${esc(opts.from)}</strong>
           to <strong style="color:${BRAND.textPrimary};">${esc(opts.to)}</strong>
           has been sent to ${esc(opts.driverName)} for approval.
           We'll email you as soon as they respond.`
        : `your ride from <strong style="color:${BRAND.textPrimary};">${esc(opts.from)}</strong>
           to <strong style="color:${BRAND.textPrimary};">${esc(opts.to)}</strong> is confirmed.
           Your ticket and journey details are below.`}
    `)}

    <!-- Ticket code -->
    <div style="text-align:left;margin:8px 0 20px;">
      ${ticketBadge(opts.ticketCode)}
      &nbsp;${statusPill(statusLabel, statusColor)}
    </div>

    ${detailTable([
      { label: 'Route',        value: `${esc(opts.from)} → ${esc(opts.to)}` },
      { label: 'Date',         value: esc(fmtDate(opts.date)) },
      { label: 'Time',         value: esc(opts.time) },
      { label: 'Seats',        value: String(opts.seats) },
      { label: 'Total',        value: `<strong style="color:${BRAND.cyan};">${fmt(opts.priceJod)}</strong>` },
      { label: 'Captain',      value: esc(opts.driverName) },
      ...(opts.driverPhone ? [{ label: 'Captain phone', value: `<a href="tel:${esc(opts.driverPhone)}">${esc(opts.driverPhone)}</a>` }] : []),
      { label: 'Ticket',       value: `<code style="color:${BRAND.cyan};letter-spacing:0.1em;">${esc(opts.ticketCode)}</code>` },
    ])}

    ${infoCard({
      accent: isPending ? BRAND.amber : BRAND.green,
      icon:   isPending ? '⏳' : '✅',
      title:  isPending ? 'What happens next' : 'You\'re all set',
      body:   isPending
        ? `${esc(opts.driverName)} will accept or decline within a few hours.
           You'll receive another email the moment there's an update.
           Your seat is held while pending.`
        : `Show your ticket code <strong>${esc(opts.ticketCode)}</strong> to your captain at pickup.
           You can track the trip in the Wasel app under My Trips.`,
    })}

    ${ctaButton({ label: 'View my trips', url: `${BRAND.appUrl}/app/my-trips?tab=rides` })}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `${subject}\n\nTicket: ${opts.ticketCode}\nRoute: ${opts.from} → ${opts.to}\n` +
          `Date: ${opts.date}  Time: ${opts.time}\nCaptain: ${opts.driverName}\n` +
          `Total: ${fmt(opts.priceJod)}\n\nView trips: ${BRAND.appUrl}/app/my-trips`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DRIVER BOOKING REQUEST — driver receives this when someone requests a ride
// ─────────────────────────────────────────────────────────────────────────────

export function driverBookingRequestEmail(opts: {
  driverName:     string;
  passengerName:  string;
  ticketCode:     string;
  from:           string;
  to:             string;
  date:           string;
  time:           string;
  seats:          number;
  priceJod:       number;
  acceptUrl:      string;
  declineUrl:     string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.driverName.split(' ')[0] || 'Captain';
  const subject   = `New ride request — ${opts.from} to ${opts.to}`;
  const preheader = `${opts.passengerName} wants to join your ${opts.from} to ${opts.to} route.`;

  const body = `
    ${sectionHeading('New ride request.')}
    ${bodyText(`
      Hi ${esc(firstName)},
      <strong style="color:${BRAND.textPrimary};">${esc(opts.passengerName)}</strong>
      wants to join your route from
      <strong style="color:${BRAND.textPrimary};">${esc(opts.from)}</strong>
      to <strong style="color:${BRAND.textPrimary};">${esc(opts.to)}</strong>.
      Review the details and respond below.
    `)}

    ${ticketBadge(opts.ticketCode)}

    ${detailTable([
      { label: 'Passenger',   value: esc(opts.passengerName) },
      { label: 'Route',       value: `${esc(opts.from)} → ${esc(opts.to)}` },
      { label: 'Date',        value: esc(fmtDate(opts.date)) },
      { label: 'Time',        value: esc(opts.time) },
      { label: 'Seats',       value: String(opts.seats) },
      { label: 'Earnings',    value: `<strong style="color:${BRAND.green};">${fmt(opts.priceJod)}</strong>` },
    ])}

    <!-- Accept / Decline side by side -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td style="padding-right:12px;">
          <a href="${opts.acceptUrl}"
             style="display:inline-block;padding:13px 28px;border-radius:14px;
                    background:${BRAND.green};
                    font-family:${BRAND.font};font-size:15px;font-weight:800;
                    color:#041018;text-decoration:none;">
            Accept request
          </a>
        </td>
        <td>
          <a href="${opts.declineUrl}"
             style="display:inline-block;padding:13px 28px;border-radius:14px;
                    background:rgba(255,255,255,0.06);border:1px solid rgba(255,100,106,0.4);
                    font-family:${BRAND.font};font-size:15px;font-weight:800;
                    color:${BRAND.red};text-decoration:none;">
            Decline
          </a>
        </td>
      </tr>
    </table>

    ${infoCard({
      accent: BRAND.cyan,
      icon:   '📱',
      title:  'Or respond in the app',
      body:   `Open Wasel and go to Offer Route → Incoming Requests to manage this and
               future booking requests in one place.`,
    })}

    ${bodyText(`
      This request expires after 12 hours if no response is received.
      The passenger will be notified automatically.
    `)}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `${subject}\n\nPassenger: ${opts.passengerName}\nRoute: ${opts.from} → ${opts.to}\n` +
          `Date: ${opts.date}  Time: ${opts.time}\nEarnings: ${fmt(opts.priceJod)}\n\n` +
          `Accept: ${opts.acceptUrl}\nDecline: ${opts.declineUrl}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. BOOKING STATUS UPDATE — passenger notified when driver accepts/declines
// ─────────────────────────────────────────────────────────────────────────────

export function bookingStatusUpdateEmail(opts: {
  passengerName: string;
  ticketCode:    string;
  from:          string;
  to:            string;
  date:          string;
  time:          string;
  driverName:    string;
  newStatus:     'confirmed' | 'rejected' | 'cancelled';
  priceJod:      number;
}): { subject: string; html: string; text: string } {
  const firstName = opts.passengerName.split(' ')[0] || 'Traveler';
  const accepted  = opts.newStatus === 'confirmed';
  const subject   = accepted
    ? `Your ride is confirmed — ${opts.from} to ${opts.to}`
    : `Ride request update — ${opts.from} to ${opts.to}`;
  const preheader = accepted
    ? `${opts.driverName} confirmed your seat. Ticket ${opts.ticketCode}.`
    : `Your ride request was ${opts.newStatus}. We'll help you find an alternative.`;

  const body = `
    ${sectionHeading(accepted ? '🎉 Ride confirmed!' : opts.newStatus === 'rejected' ? 'Request not accepted.' : 'Booking cancelled.')}
    ${bodyText(accepted
      ? `Hi ${esc(firstName)}, great news — <strong style="color:${BRAND.textPrimary};">${esc(opts.driverName)}</strong>
         has accepted your ride from <strong style="color:${BRAND.textPrimary};">${esc(opts.from)}</strong>
         to <strong style="color:${BRAND.textPrimary};">${esc(opts.to)}</strong>.`
      : `Hi ${esc(firstName)}, ${esc(opts.driverName)} was unable to accommodate your request
         for the ${esc(opts.from)} to ${esc(opts.to)} route.
         Other available rides are waiting for you.`
    )}

    ${accepted ? ticketBadge(opts.ticketCode) : ''}

    ${detailTable([
      { label: 'Route',   value: `${esc(opts.from)} → ${esc(opts.to)}` },
      { label: 'Date',    value: esc(fmtDate(opts.date)) },
      { label: 'Time',    value: esc(opts.time) },
      { label: 'Captain', value: esc(opts.driverName) },
      { label: 'Status',  value: statusPill(
          accepted ? 'Confirmed' : opts.newStatus === 'rejected' ? 'Not accepted' : 'Cancelled',
          accepted ? BRAND.green : BRAND.red)
      },
      ...(accepted ? [{ label: 'Total', value: `<strong style="color:${BRAND.cyan};">${fmt(opts.priceJod)}</strong>` }] : []),
    ])}

    ${accepted
      ? infoCard({
          accent: BRAND.green,
          icon:   '✅',
          title:  'Ready to travel',
          body:   `Show your ticket code <strong>${esc(opts.ticketCode)}</strong> to your captain at pickup.
                   Boarding and prayer stop reminders will appear in the Wasel app.`,
        })
      : infoCard({
          accent: BRAND.cyan,
          icon:   '🔍',
          title:  'Find another ride',
          body:   `Wasel has multiple departures on this corridor daily.
                   Open Find a Ride to see all available seats on your route.`,
        })
    }

    ${ctaButton({
      label: accepted ? 'View my trips' : 'Find another ride',
      url:   accepted
        ? `${BRAND.appUrl}/app/my-trips?tab=rides`
        : `${BRAND.appUrl}/app/find-ride?from=${encodeURIComponent(opts.from)}&to=${encodeURIComponent(opts.to)}`,
      color: accepted ? BRAND.green : BRAND.cyan,
    })}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `${subject}\n\nRoute: ${opts.from} → ${opts.to}\nDate: ${opts.date}\n` +
          `Status: ${opts.newStatus}\n\n${BRAND.appUrl}/app/my-trips`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PAYMENT RECEIPT — sent after a wallet top-up or ride payment capture
// ─────────────────────────────────────────────────────────────────────────────

export function paymentReceiptEmail(opts: {
  name:          string;
  transactionId: string;
  type:          'top_up' | 'ride_payment' | 'package_payment' | 'withdrawal';
  amountJod:     number;
  balanceJod:    number;
  description:   string;
  createdAt:     string;
  paymentMethod?: string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.name.split(' ')[0] || 'Traveler';
  const typeLabels: Record<typeof opts.type, string> = {
    top_up:          'Wallet top-up',
    ride_payment:    'Ride payment',
    package_payment: 'Package payment',
    withdrawal:      'Wallet withdrawal',
  };
  const typeLabel  = typeLabels[opts.type];
  const isCredit   = opts.type === 'top_up';
  const subject    = `${typeLabel} receipt — ${fmt(opts.amountJod)}`;
  const preheader  = `${typeLabel} of ${fmt(opts.amountJod)} processed. Balance: ${fmt(opts.balanceJod)}.`;

  const body = `
    ${sectionHeading(`${typeLabel} receipt.`)}
    ${bodyText(`
      Hi ${esc(firstName)}, here is your receipt for a
      ${esc(typeLabel.toLowerCase())} of
      <strong style="color:${isCredit ? BRAND.green : BRAND.cyan};">${fmt(opts.amountJod)}</strong>
      processed on ${esc(fmtDate(opts.createdAt))}.
    `)}

    <!-- Amount display -->
    <div style="text-align:center;padding:28px 0;margin:20px 0;
                background:rgba(22,199,242,0.05);border-radius:16px;
                border:1px solid ${BRAND.border};">
      <div style="font-family:${BRAND.font};font-size:11px;font-weight:700;
                  text-transform:uppercase;letter-spacing:0.1em;
                  color:${BRAND.textMuted};margin-bottom:8px;">
        ${esc(typeLabel)}
      </div>
      <div style="font-family:${BRAND.font};font-size:38px;font-weight:900;
                  color:${isCredit ? BRAND.green : BRAND.cyan};letter-spacing:-0.03em;">
        ${isCredit ? '+' : '−'}${fmt(opts.amountJod)}
      </div>
    </div>

    ${detailTable([
      { label: 'Description',     value: esc(opts.description) },
      { label: 'Date',            value: esc(fmtDate(opts.createdAt)) },
      { label: 'Transaction ID',  value: `<code style="font-size:12px;color:${BRAND.textSub};">${esc(opts.transactionId)}</code>` },
      ...(opts.paymentMethod ? [{ label: 'Method', value: esc(opts.paymentMethod) }] : []),
      { label: 'Wallet balance',  value: `<strong style="color:${BRAND.cyan};">${fmt(opts.balanceJod)}</strong>` },
    ])}

    ${infoCard({
      accent: BRAND.textMuted,
      icon:   '🧾',
      title:  'Keep this receipt',
      body:   `This email is your official transaction receipt. Your full transaction history
               is always available in the Wasel wallet under the Transactions tab.`,
    })}

    ${ctaButton({ label: 'Open my wallet', url: `${BRAND.appUrl}/app/wallet` })}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `${subject}\n\nAmount: ${fmt(opts.amountJod)}\nBalance: ${fmt(opts.balanceJod)}\n` +
          `Transaction ID: ${opts.transactionId}\nDate: ${opts.createdAt}\n\n` +
          `Open wallet: ${BRAND.appUrl}/app/wallet`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. PACKAGE CONFIRMATION — sender receives this when a package is created
// ─────────────────────────────────────────────────────────────────────────────

export function packageConfirmationEmail(opts: {
  senderName:    string;
  trackingId:    string;
  handoffCode:   string;
  from:          string;
  to:            string;
  weight:        string;
  recipientName?: string;
  matchedDriver?: string;
  status:        'searching' | 'matched';
}): { subject: string; html: string; text: string } {
  const firstName = opts.senderName.split(' ')[0] || 'Sender';
  const matched   = opts.status === 'matched';
  const subject   = matched
    ? `Package matched — ${opts.trackingId}`
    : `Package request received — ${opts.trackingId}`;
  const preheader = matched
    ? `Your package from ${opts.from} to ${opts.to} has been matched with a rider.`
    : `Your package request is live. Tracking ID: ${opts.trackingId}.`;

  const body = `
    ${sectionHeading(matched ? 'Package matched to a rider.' : 'Package request live.')}
    ${bodyText(matched
      ? `Hi ${esc(firstName)}, your package from
         <strong style="color:${BRAND.textPrimary};">${esc(opts.from)}</strong>
         to <strong style="color:${BRAND.textPrimary};">${esc(opts.to)}</strong>
         has been matched with a trusted Wasel rider.`
      : `Hi ${esc(firstName)}, your package request from
         <strong style="color:${BRAND.textPrimary};">${esc(opts.from)}</strong>
         to <strong style="color:${BRAND.textPrimary};">${esc(opts.to)}</strong>
         is live on the network. We'll notify you the moment it's matched.`
    )}

    <div style="text-align:left;margin:8px 0 20px;">
      ${ticketBadge(opts.trackingId)}
      &nbsp;${statusPill(matched ? 'Matched' : 'Searching', matched ? BRAND.green : BRAND.amber)}
    </div>

    ${detailTable([
      { label: 'From',           value: esc(opts.from) },
      { label: 'To',             value: esc(opts.to) },
      { label: 'Weight',         value: esc(opts.weight) },
      { label: 'Tracking ID',    value: `<code style="color:${BRAND.cyan};letter-spacing:0.1em;">${esc(opts.trackingId)}</code>` },
      { label: 'Handoff code',   value: `<code style="color:${BRAND.gold};letter-spacing:0.12em;font-size:18px;">${esc(opts.handoffCode)}</code>` },
      ...(opts.recipientName ? [{ label: 'Recipient', value: esc(opts.recipientName) }] : []),
      ...(opts.matchedDriver  ? [{ label: 'Rider',    value: esc(opts.matchedDriver) }] : []),
    ])}

    ${infoCard({
      accent: BRAND.gold,
      icon:   '🔐',
      title:  'Your handoff code is confidential',
      body:   `Share the code <strong>${esc(opts.handoffCode)}</strong> only with your rider at pickup.
               It confirms the handoff and unlocks the delivery flow in the Wasel app.
               Never share it before the rider arrives.`,
    })}

    ${ctaButton({ label: 'Track my package', url: `${BRAND.appUrl}/app/packages` })}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `${subject}\n\nTracking: ${opts.trackingId}\nHandoff code: ${opts.handoffCode}\n` +
          `Route: ${opts.from} → ${opts.to}\nWeight: ${opts.weight}\n\n` +
          `Track: ${BRAND.appUrl}/app/packages`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. BUS BOOKING CONFIRMATION
// ─────────────────────────────────────────────────────────────────────────────

export function busBookingConfirmationEmail(opts: {
  passengerName:  string;
  ticketCode:     string;
  pickupStop:     string;
  dropoffStop:    string;
  scheduleDate:   string;
  departureTime:  string;
  seats:          number;
  seatPreference: string;
  priceJod:       number;
}): { subject: string; html: string; text: string } {
  const firstName = opts.passengerName.split(' ')[0] || 'Traveler';
  const subject   = `Bus booking confirmed — ${opts.pickupStop} to ${opts.dropoffStop}`;
  const preheader = `Ticket ${opts.ticketCode}. Bus on ${opts.scheduleDate} at ${opts.departureTime}.`;

  const body = `
    ${sectionHeading('Bus booking confirmed.')}
    ${bodyText(`
      Hi ${esc(firstName)}, your bus booking from
      <strong style="color:${BRAND.textPrimary};">${esc(opts.pickupStop)}</strong>
      to <strong style="color:${BRAND.textPrimary};">${esc(opts.dropoffStop)}</strong>
      is confirmed. Present your ticket code on boarding.
    `)}

    ${ticketBadge(opts.ticketCode)}

    ${detailTable([
      { label: 'Pickup stop',    value: esc(opts.pickupStop) },
      { label: 'Drop-off stop',  value: esc(opts.dropoffStop) },
      { label: 'Date',           value: esc(fmtDate(opts.scheduleDate)) },
      { label: 'Departure',      value: esc(opts.departureTime) },
      { label: 'Seats',          value: String(opts.seats) },
      { label: 'Seat preference',value: esc(opts.seatPreference) },
      { label: 'Total',          value: `<strong style="color:${BRAND.cyan};">${fmt(opts.priceJod)}</strong>` },
    ])}

    ${infoCard({
      accent: BRAND.green,
      icon:   '🚌',
      title:  'Boarding instructions',
      body:   `Arrive at ${esc(opts.pickupStop)} at least 10 minutes before departure.
               Show ticket code <strong>${esc(opts.ticketCode)}</strong> to the driver.
               The bus departs on schedule — no waiting for late passengers.`,
    })}

    ${ctaButton({ label: 'View my trip', url: `${BRAND.appUrl}/app/my-trips?tab=buses` })}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `${subject}\n\nTicket: ${opts.ticketCode}\n` +
          `Route: ${opts.pickupStop} → ${opts.dropoffStop}\n` +
          `Date: ${opts.scheduleDate}  Time: ${opts.departureTime}\n` +
          `Total: ${fmt(opts.priceJod)}\n\n${BRAND.appUrl}/app/my-trips`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. RIDE COMPLETED — sent to both passenger and driver post-trip
// ─────────────────────────────────────────────────────────────────────────────

export function rideCompletedEmail(opts: {
  recipientName: string;
  role:          'passenger' | 'driver';
  ticketCode:    string;
  from:          string;
  to:            string;
  date:          string;
  counterpartName: string;
  amountJod:     number;
  ratingUrl:     string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.recipientName.split(' ')[0] || 'Traveler';
  const subject   = `Trip completed — ${opts.from} to ${opts.to}`;
  const preheader = opts.role === 'passenger'
    ? `Rate your experience with ${opts.counterpartName}.`
    : `${opts.amountJod > 0 ? fmt(opts.amountJod) + ' earned.' : 'Trip complete.'} Leave a note for ${opts.counterpartName}.`;

  const body = `
    ${sectionHeading('Trip complete.')}
    ${bodyText(opts.role === 'passenger'
      ? `Hi ${esc(firstName)}, your ride from
         <strong style="color:${BRAND.textPrimary};">${esc(opts.from)}</strong>
         to <strong style="color:${BRAND.textPrimary};">${esc(opts.to)}</strong>
         with ${esc(opts.counterpartName)} is complete.
         Take a moment to rate your experience.`
      : `Hi ${esc(firstName)}, your route from
         <strong style="color:${BRAND.textPrimary};">${esc(opts.from)}</strong>
         to <strong style="color:${BRAND.textPrimary};">${esc(opts.to)}</strong>
         is complete. ${opts.amountJod > 0 ? `Earnings of <strong style="color:${BRAND.green};">${fmt(opts.amountJod)}</strong> have been added to your wallet.` : ''}
         Rate your passenger to help build trust on the network.`
    )}

    ${detailTable([
      { label: 'Route',      value: `${esc(opts.from)} → ${esc(opts.to)}` },
      { label: 'Date',       value: esc(fmtDate(opts.date)) },
      { label: 'Ticket',     value: `<code style="color:${BRAND.cyan};">${esc(opts.ticketCode)}</code>` },
      { label: opts.role === 'passenger' ? 'Captain' : 'Passenger',
        value: esc(opts.counterpartName) },
      ...(opts.role === 'driver' && opts.amountJod > 0
        ? [{ label: 'Earnings', value: `<strong style="color:${BRAND.green};">${fmt(opts.amountJod)}</strong>` }]
        : []),
    ])}

    ${ctaButton({ label: 'Rate your experience', url: opts.ratingUrl, color: BRAND.gold })}

    ${bodyText(`
      Thank you for travelling with Wasel.
      Your feedback keeps the network safe and trustworthy for everyone.
    `)}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `${subject}\n\nRoute: ${opts.from} → ${opts.to}\nDate: ${opts.date}\n` +
          `Ticket: ${opts.ticketCode}\n\nRate now: ${opts.ratingUrl}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. ACCOUNT SECURITY ALERT — login from new device / password changed
// ─────────────────────────────────────────────────────────────────────────────

export function securityAlertEmail(opts: {
  name:      string;
  eventType: 'new_login' | 'password_changed' | 'email_changed';
  ip?:       string;
  userAgent?: string;
  time:      string;
  settingsUrl: string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.name.split(' ')[0] || 'Traveler';
  const labels = {
    new_login:        'New login detected',
    password_changed: 'Password changed',
    email_changed:    'Email address changed',
  };
  const subject   = `Security alert: ${labels[opts.eventType]}`;
  const preheader = `Your Wasel account had a security event on ${fmtDate(opts.time)}.`;

  const body = `
    ${sectionHeading('Security notice.')}
    ${bodyText(`
      Hi ${esc(firstName)}, we detected a
      <strong style="color:${BRAND.textPrimary};">${esc(labels[opts.eventType].toLowerCase())}</strong>
      on your Wasel account.
    `)}

    ${detailTable([
      { label: 'Event',   value: esc(labels[opts.eventType]) },
      { label: 'Time',    value: esc(fmtDate(opts.time)) },
      ...(opts.ip        ? [{ label: 'IP address', value: esc(opts.ip) }] : []),
      ...(opts.userAgent ? [{ label: 'Device',     value: esc(opts.userAgent.substring(0, 60)) }] : []),
    ])}

    ${infoCard({
      accent: BRAND.red,
      icon:   '🚨',
      title:  'Wasn\'t you?',
      body:   `If you didn't perform this action, secure your account immediately by
               changing your password and reviewing active sessions in your account settings.`,
    })}

    ${ctaButton({ label: 'Secure my account', url: opts.settingsUrl, color: BRAND.red })}

    ${bodyText(`
      If this was you, no action is needed.
      Contact us at <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a>
      if you need help.
    `)}
  `;

  return {
    subject,
    html: emailShell({ subject, preheader, bodyHtml: body }),
    text: `${subject}\n\nEvent: ${labels[opts.eventType]}\nTime: ${opts.time}\n\n` +
          `Secure your account: ${opts.settingsUrl}\n\n` +
          `Contact: ${BRAND.supportEmail}`,
  };
}
