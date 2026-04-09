import { timingSafeEqual } from './security-runtime.ts';

export type DeliveryChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app';
export type DeliveryLifecycleStatus = 'queued' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled';

export type CommunicationDeliveryRecord = {
  delivery_id: string;
  channel: DeliveryChannel | string;
  destination: string | null;
  subject: string | null;
  payload: Record<string, unknown> | null;
  provider_name: string | null;
  external_reference: string | null;
  attempts_count: number | null;
};

export type DeliveryProcessorEnv = {
  resendApiKey?: string;
  resendFromEmail?: string;
  resendReplyToEmail?: string;
  sendgridApiKey?: string;
  sendgridFromEmail?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioMessagingServiceSid?: string;
  twilioSmsFrom?: string;
  twilioWhatsappFrom?: string;
  communicationWebhookToken?: string;
  functionBaseUrl?: string;
  maxDeliveryAttempts?: number;
};

export function determineProviderName(channel: string): string {
  if (channel === 'email') return 'email_provider';
  if (channel === 'sms' || channel === 'whatsapp') return 'twilio';
  if (channel === 'push') return 'push_runtime';
  return 'app_queue';
}

export function normalizePhoneDestination(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('whatsapp:')) return trimmed;
  const normalized = trimmed.replace(/[^\d+]/g, '');
  if (!normalized) return '';
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
}

export function buildIdempotencyKey(args: {
  deliveryId: string;
  channel: string;
  destination: string | null;
  body: string;
}): string {
  const source = [
    args.deliveryId,
    args.channel,
    args.destination ?? 'no-destination',
    args.body.trim().slice(0, 120),
  ].join(':');
  let hash = 2166136261;
  for (const char of source) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `delivery:${Math.abs(hash >>> 0).toString(16)}`;
}

export function buildRetrySchedule(args: {
  attemptsCount: number;
  now?: Date;
  maxAttempts?: number;
}) {
  const maxAttempts = args.maxAttempts ?? 5;
  const attempts = Math.max(1, args.attemptsCount);
  const now = args.now ?? new Date();

  if (attempts >= maxAttempts) {
    return {
      shouldRetry: false,
      nextAttemptAt: null,
    };
  }

  const backoffMinutes = Math.min(60, Math.pow(2, attempts - 1) * 5);
  return {
    shouldRetry: true,
    nextAttemptAt: new Date(now.getTime() + backoffMinutes * 60_000).toISOString(),
  };
}

export function buildFailurePatch(args: {
  attemptsCount: number;
  errorMessage: string;
  now?: Date;
  maxAttempts?: number;
}) {
  const now = args.now ?? new Date();
  const schedule = buildRetrySchedule({
    attemptsCount: args.attemptsCount,
    now,
    maxAttempts: args.maxAttempts,
  });

  return schedule.shouldRetry
    ? {
        delivery_status: 'queued' satisfies DeliveryLifecycleStatus,
        error_message: args.errorMessage,
        next_attempt_at: schedule.nextAttemptAt,
        failed_at: null,
        locked_at: null,
      }
    : {
        delivery_status: 'failed' satisfies DeliveryLifecycleStatus,
        error_message: args.errorMessage,
        next_attempt_at: null,
        failed_at: now.toISOString(),
        locked_at: null,
      };
}

export function buildResendPayload(
  delivery: CommunicationDeliveryRecord,
  env: DeliveryProcessorEnv,
) {
  const to = delivery.destination?.trim();
  if (!env.resendApiKey) throw new Error('RESEND_API_KEY is not configured');
  if (!env.resendFromEmail) throw new Error('RESEND_FROM_EMAIL is not configured');
  if (!to) throw new Error('Delivery destination is missing');

  const body = String(delivery.payload?.body ?? '');
  const subject = delivery.subject?.trim() || 'Wasel notification';
  const escapeHtml = (value: string) => value.replace(/[<>&"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[char] ?? char));
  const html = body
    .split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');

  return {
    url: 'https://api.resend.com/emails',
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.resendApiKey}`,
      },
      body: JSON.stringify({
        from: env.resendFromEmail,
        to: [to],
        subject,
        text: body,
        html,
        reply_to: env.resendReplyToEmail || undefined,
      }),
    },
  };
}

export function buildSendgridPayload(
  delivery: CommunicationDeliveryRecord,
  env: DeliveryProcessorEnv,
) {
  const to = delivery.destination?.trim();
  if (!env.sendgridApiKey) throw new Error('SENDGRID_API_KEY is not configured');
  if (!env.sendgridFromEmail) throw new Error('SENDGRID_FROM_EMAIL is not configured');
  if (!to) throw new Error('Delivery destination is missing');

  const body = String(delivery.payload?.body ?? '');
  const subject = delivery.subject?.trim() || 'Wasel notification';
  const escapeHtml = (value: string) => value.replace(/[<>&"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[char] ?? char));

  return {
    url: 'https://api.sendgrid.com/v3/mail/send',
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.sendgridApiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: env.sendgridFromEmail },
        reply_to: env.resendReplyToEmail ? { email: env.resendReplyToEmail } : undefined,
        content: [
          { type: 'text/plain', value: body },
          { type: 'text/html', value: body.split('\n').map((line) => `<p>${escapeHtml(line)}</p>`).join('') },
        ],
      }),
    },
  };
}

export function buildTwilioRequest(
  delivery: CommunicationDeliveryRecord,
  env: DeliveryProcessorEnv,
) {
  if (!env.twilioAccountSid || !env.twilioAuthToken) {
    throw new Error('Twilio credentials are not configured');
  }

  const destination = normalizePhoneDestination(delivery.destination ?? '');
  if (!destination) throw new Error('Delivery destination is missing');

  const body = String(delivery.payload?.body ?? '');
  const params = new URLSearchParams({
    To: delivery.channel === 'whatsapp' ? `whatsapp:${destination.replace(/^whatsapp:/, '')}` : destination,
    Body: body,
  });

  if (delivery.channel === 'whatsapp') {
    if (!env.twilioWhatsappFrom) throw new Error('TWILIO_WHATSAPP_FROM is not configured');
    params.set('From', env.twilioWhatsappFrom.startsWith('whatsapp:')
      ? env.twilioWhatsappFrom
      : `whatsapp:${env.twilioWhatsappFrom}`);
  } else if (env.twilioMessagingServiceSid) {
    params.set('MessagingServiceSid', env.twilioMessagingServiceSid);
  } else if (env.twilioSmsFrom) {
    params.set('From', env.twilioSmsFrom);
  } else {
    throw new Error('TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM is required');
  }

  if (env.communicationWebhookToken && env.functionBaseUrl) {
    params.set(
      'StatusCallback',
      `${env.functionBaseUrl.replace(/\/$/, '')}/communications/webhooks/twilio?token=${encodeURIComponent(env.communicationWebhookToken)}`,
    );
  }

  return {
    url: `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`,
    init: {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${env.twilioAccountSid}:${env.twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  };
}

export function mapResendEventToStatus(eventType: string): DeliveryLifecycleStatus {
  const normalized = eventType.toLowerCase();
  if (normalized.includes('delivered') || normalized.includes('opened') || normalized.includes('clicked')) return 'delivered';
  if (normalized.includes('sent') || normalized.includes('queued') || normalized.includes('processed')) return 'sent';
  if (normalized.includes('bounced') || normalized.includes('complained') || normalized.includes('failed')) return 'failed';
  return 'sent';
}

export function mapTwilioStatusToLifecycle(status: string): DeliveryLifecycleStatus {
  const normalized = status.toLowerCase();
  if (normalized === 'delivered' || normalized === 'read') return 'delivered';
  if (normalized === 'sent' || normalized === 'queued' || normalized === 'accepted' || normalized === 'scheduled') return 'sent';
  if (normalized === 'failed' || normalized === 'undelivered' || normalized === 'canceled') return 'failed';
  return 'processing';
}

export function hasValidWebhookToken(url: URL, expectedToken?: string): boolean {
  if (!expectedToken) return false;
  const provided = url.searchParams.get('token') ?? '';
  return timingSafeEqual(provided, expectedToken);
}
