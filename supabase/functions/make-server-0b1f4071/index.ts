import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';
import {
  buildFailurePatch,
  buildIdempotencyKey,
  buildResendPayload,
  buildSendgridPayload,
  buildTwilioRequest,
  determineProviderName,
  hasValidWebhookToken,
  mapResendEventToStatus,
  mapTwilioStatusToLifecycle,
  type CommunicationDeliveryRecord,
  type DeliveryProcessorEnv,
} from './_shared/communication-runtime.ts';
import {
  generateBackupCodes,
  generateQRCode,
  generateTOTPSecret,
  hashBackupCode,
  hashBackupCodes,
  verifyTwoFactorChallenge,
} from './_shared/two-factor-runtime.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('VITE_SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_DB_URL = Deno.env.get('SUPABASE_DB_URL') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-communication-worker-secret',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

const deliveryEnv: DeliveryProcessorEnv = {
  resendApiKey: Deno.env.get('RESEND_API_KEY') ?? undefined,
  resendFromEmail: Deno.env.get('RESEND_FROM_EMAIL') ?? undefined,
  resendReplyToEmail: Deno.env.get('RESEND_REPLY_TO_EMAIL') ?? undefined,
  sendgridApiKey: Deno.env.get('SENDGRID_API_KEY') ?? undefined,
  sendgridFromEmail: Deno.env.get('SENDGRID_FROM_EMAIL') ?? undefined,
  twilioAccountSid: Deno.env.get('TWILIO_ACCOUNT_SID') ?? undefined,
  twilioAuthToken: Deno.env.get('TWILIO_AUTH_TOKEN') ?? undefined,
  twilioMessagingServiceSid: Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') ?? undefined,
  twilioSmsFrom: Deno.env.get('TWILIO_SMS_FROM') ?? undefined,
  twilioWhatsappFrom: Deno.env.get('TWILIO_WHATSAPP_FROM') ?? undefined,
  communicationWebhookToken: Deno.env.get('COMMUNICATION_WEBHOOK_TOKEN') ?? undefined,
  maxDeliveryAttempts: Number(Deno.env.get('COMMUNICATION_MAX_ATTEMPTS') ?? '5'),
};

const COMMUNICATIONS_RUNTIME_SQL = `
create table if not exists public.communication_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  trip_updates_enabled boolean not null default true,
  booking_requests_enabled boolean not null default true,
  messages_enabled boolean not null default true,
  promotions_enabled boolean not null default false,
  prayer_reminders_enabled boolean not null default true,
  critical_alerts_enabled boolean not null default true,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ar')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.communication_deliveries (
  delivery_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  notification_id uuid null references public.notifications(id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'push', 'in_app')),
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled')),
  destination text null,
  subject text null,
  payload jsonb null default '{}'::jsonb,
  provider_name text null default 'app_queue',
  external_reference text null,
  provider_response jsonb null,
  error_message text null,
  queued_at timestamptz null default timezone('utc', now()),
  sent_at timestamptz null,
  delivered_at timestamptz null,
  failed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists communication_deliveries_user_created_idx
  on public.communication_deliveries(user_id, created_at desc);

create index if not exists communication_deliveries_status_idx
  on public.communication_deliveries(delivery_status, channel, queued_at desc);

alter table public.communication_preferences enable row level security;
alter table public.communication_deliveries enable row level security;

drop policy if exists communication_preferences_select_own on public.communication_preferences;
create policy communication_preferences_select_own
  on public.communication_preferences
  for select
  to authenticated
  using (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));

drop policy if exists communication_preferences_insert_own on public.communication_preferences;
create policy communication_preferences_insert_own
  on public.communication_preferences
  for insert
  to authenticated
  with check (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));

drop policy if exists communication_preferences_update_own on public.communication_preferences;
create policy communication_preferences_update_own
  on public.communication_preferences
  for update
  to authenticated
  using (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text))
  with check (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));

drop policy if exists communication_deliveries_select_own on public.communication_deliveries;
create policy communication_deliveries_select_own
  on public.communication_deliveries
  for select
  to authenticated
  using (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));

drop policy if exists communication_deliveries_insert_own on public.communication_deliveries;
create policy communication_deliveries_insert_own
  on public.communication_deliveries
  for insert
  to authenticated
  with check (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));
`;

const COMMUNICATIONS_OPERATIONS_SQL = `
alter table public.communication_deliveries
  add column if not exists idempotency_key text,
  add column if not exists attempts_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz null,
  add column if not exists next_attempt_at timestamptz null,
  add column if not exists locked_at timestamptz null,
  add column if not exists processed_by text null;

create unique index if not exists communication_deliveries_idempotency_key_idx
  on public.communication_deliveries (idempotency_key)
  where idempotency_key is not null;

create index if not exists communication_deliveries_retry_queue_idx
  on public.communication_deliveries (delivery_status, next_attempt_at, queued_at);

create index if not exists communication_deliveries_provider_ref_idx
  on public.communication_deliveries (provider_name, external_reference)
  where external_reference is not null;
`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function noContent(status = 204) {
  return new Response(null, {
    status,
    headers: corsHeaders,
  });
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticateRequest(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) {
    return { error: json({ error: 'Missing bearer token' }, 401) };
  }

  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: json({ error: 'Invalid auth token' }, 401) };
  }

  const { data: byAuthUser, error: byAuthError } = await admin
    .from('users')
    .select('id, auth_user_id, email, phone_number')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (byAuthError) {
    return { error: json({ error: byAuthError.message }, 500) };
  }

  let canonicalUser = byAuthUser;
  let userError = null;
  if (!canonicalUser) {
    const fallback = await admin
      .from('users')
      .select('id, auth_user_id, email, phone_number')
      .eq('id', authData.user.id)
      .maybeSingle();
    canonicalUser = fallback.data;
    userError = fallback.error;
  }

  if (userError || !canonicalUser) {
    return { error: json({ error: 'Canonical user profile was not found' }, 404) };
  }

  return { admin, authUser: authData.user, canonicalUser };
}

function getWorkerSecret() {
  return Deno.env.get('COMMUNICATION_WORKER_SECRET') ?? '';
}

function hasWorkerAccess(request: Request): boolean {
  const secret = getWorkerSecret();
  if (!secret) return false;
  return request.headers.get('x-communication-worker-secret') === secret;
}

function getFunctionBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return url.href.replace(/\/communications\/.*$/, '').replace(/\/health$/, '');
}

async function executeSqlStatements(sql: string) {
  if (!SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is not configured');
  }

  const client = new Client(SUPABASE_DB_URL);
  await client.connect();
  try {
    await client.queryObject(sql);
  } finally {
    await client.end();
  }
}

async function handleHealth() {
  return json({
    ok: true,
    service: 'make-server-0b1f4071',
    twoFactor: {
      enabled: true,
      serverVerified: true,
    },
    communications: {
      resendConfigured: Boolean(deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail),
      sendgridConfigured: Boolean(deliveryEnv.sendgridApiKey && deliveryEnv.sendgridFromEmail),
      twilioConfigured: Boolean(
        deliveryEnv.twilioAccountSid &&
        deliveryEnv.twilioAuthToken &&
        (deliveryEnv.twilioMessagingServiceSid || deliveryEnv.twilioSmsFrom || deliveryEnv.twilioWhatsappFrom),
      ),
      workerSecretConfigured: Boolean(getWorkerSecret()),
      webhookTokenConfigured: Boolean(deliveryEnv.communicationWebhookToken),
    },
  });
}

async function handleGetCommunicationPreferences(request: Request) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  const { data, error } = await auth.admin
    .from('communication_preferences')
    .select('*')
    .eq('user_id', auth.canonicalUser.id)
    .maybeSingle();

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ preferences: data ?? null });
}

async function handleTwoFactorSetup(request: Request) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  const label = auth.canonicalUser.email || auth.authUser.email || auth.canonicalUser.id;
  const secret = generateTOTPSecret();
  const backupCodes = generateBackupCodes(10);
  const backupCodeHashes = await hashBackupCodes(backupCodes);

  const { error } = await auth.admin
    .from('users')
    .update({
      two_factor_enabled: false,
      two_factor_secret: secret,
      two_factor_backup_codes: backupCodeHashes,
    })
    .eq('id', auth.canonicalUser.id);

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({
    setup: {
      secret,
      qrCode: generateQRCode(secret, label),
      backupCodes,
    },
    pendingVerification: true,
  });
}

async function handleTwoFactorVerify(request: Request) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code : '';
  if (!code.trim()) {
    return json({ error: 'Verification code is required' }, 400);
  }

  const { data: userRow, error } = await auth.admin
    .from('users')
    .select('two_factor_secret, two_factor_backup_codes, two_factor_enabled')
    .eq('id', auth.canonicalUser.id)
    .single();

  if (error) {
    return json({ error: error.message }, 500);
  }

  const result = await verifyTwoFactorChallenge({
    secret: userRow.two_factor_secret,
    code,
    backupCodeHashes: userRow.two_factor_backup_codes,
    allowBackupCode: false,
  });

  if (!result.ok) {
    return json({ valid: false }, 401);
  }

  const normalizedCodeHash = result.usedBackupCode ? await hashBackupCode(code) : null;
  const nextBackupCodes = result.usedBackupCode
    ? (userRow.two_factor_backup_codes ?? []).filter((hashed) => hashed !== normalizedCodeHash)
    : userRow.two_factor_backup_codes;

  const { error: updateError } = await auth.admin
    .from('users')
    .update({
      two_factor_enabled: true,
      two_factor_backup_codes: nextBackupCodes,
    })
    .eq('id', auth.canonicalUser.id);

  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  return json({
    valid: true,
    enabled: true,
    usedBackupCode: result.usedBackupCode,
  });
}

async function handleTwoFactorDisable(request: Request) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code : '';
  if (!code.trim()) {
    return json({ error: 'Verification code is required' }, 400);
  }

  const { data: userRow, error } = await auth.admin
    .from('users')
    .select('two_factor_secret, two_factor_backup_codes')
    .eq('id', auth.canonicalUser.id)
    .single();

  if (error) {
    return json({ error: error.message }, 500);
  }

  const result = await verifyTwoFactorChallenge({
    secret: userRow.two_factor_secret,
    code,
    backupCodeHashes: userRow.two_factor_backup_codes,
    allowBackupCode: true,
  });

  if (!result.ok) {
    return json({ valid: false }, 401);
  }

  const { error: updateError } = await auth.admin
    .from('users')
    .update({
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: null,
    })
    .eq('id', auth.canonicalUser.id);

  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  return json({ disabled: true });
}

async function handlePatchCommunicationPreferences(request: Request) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const patch = {
    user_id: auth.canonicalUser.id,
    in_app_enabled: body.inApp,
    push_enabled: body.push,
    email_enabled: body.email,
    sms_enabled: body.sms,
    whatsapp_enabled: body.whatsapp,
    trip_updates_enabled: body.tripUpdates,
    booking_requests_enabled: body.bookingRequests,
    messages_enabled: body.messages,
    promotions_enabled: body.promotions,
    prayer_reminders_enabled: body.prayerReminders,
    critical_alerts_enabled: body.criticalAlerts,
    preferred_language: body.preferredLanguage === 'ar' ? 'ar' : 'en',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await auth.admin
    .from('communication_preferences')
    .upsert(patch, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ preferences: data });
}

async function handleQueueCommunicationDeliveries(request: Request) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const deliveries = Array.isArray(body.deliveries) ? body.deliveries : [];
  const now = new Date().toISOString();

  if (deliveries.length === 0) {
    return json({ queued: 0 });
  }

  const rows = deliveries.map((delivery: Record<string, unknown>, index: number) => {
    const payloadBody = String(delivery.body ?? '');
    return {
      user_id: auth.canonicalUser.id,
      notification_id: typeof body.notificationId === 'string' ? body.notificationId : null,
      channel: String(delivery.channel ?? 'email'),
      delivery_status: 'queued',
      destination: typeof delivery.destination === 'string' ? delivery.destination : null,
      subject: typeof delivery.subject === 'string' ? delivery.subject : null,
      payload: {
        body: payloadBody,
        metadata: delivery.metadata ?? null,
      },
      provider_name: determineProviderName(String(delivery.channel ?? 'email')),
      queued_at: now,
      updated_at: now,
      idempotency_key:
        typeof delivery.idempotencyKey === 'string' && delivery.idempotencyKey
          ? delivery.idempotencyKey
          : buildIdempotencyKey({
              deliveryId: `${body.notificationId ?? 'direct'}-${index}`,
              channel: String(delivery.channel ?? 'email'),
              destination: typeof delivery.destination === 'string' ? delivery.destination : null,
              body: payloadBody,
            }),
    };
  });

  const { data, error } = await auth.admin
    .from('communication_deliveries')
    .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true })
    .select('*');

  if (error) {
    return json({ error: error.message }, 500);
  }

  if (Deno.env.get('COMMUNICATION_PROCESS_INLINE') === 'true' && hasWorkerAccess(request)) {
    await processQueuedDeliveries(auth.admin, getFunctionBaseUrl(request));
  }

  return json({ queued: Array.isArray(data) ? data.length : rows.length, deliveries: data ?? [] }, 202);
}

async function sendDelivery(
  admin: ReturnType<typeof getAdminClient>,
  delivery: CommunicationDeliveryRecord,
  functionBaseUrl: string,
) {
  const now = new Date().toISOString();
  const env = { ...deliveryEnv, functionBaseUrl };
  const payload = delivery.payload ?? {};
  const attemptsCount = (delivery.attempts_count ?? 0) + 1;

  await admin
    .from('communication_deliveries')
    .update({
      delivery_status: 'processing',
      attempts_count: attemptsCount,
      last_attempt_at: now,
      locked_at: now,
      processed_by: 'edge:communications-process',
      updated_at: now,
    })
    .eq('delivery_id', delivery.delivery_id);

  try {
    let response: Response;
    if (delivery.channel === 'email') {
      const request = env.resendApiKey && env.resendFromEmail
        ? buildResendPayload(delivery, env)
        : buildSendgridPayload(delivery, env);
      response = await fetch(request.url, request.init);
    } else if (delivery.channel === 'sms' || delivery.channel === 'whatsapp') {
      const request = buildTwilioRequest(delivery, env);
      response = await fetch(request.url, request.init);
    } else {
      throw new Error(`Unsupported delivery channel: ${delivery.channel}`);
    }

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof responseBody?.message === 'string'
          ? responseBody.message
          : typeof responseBody?.error === 'string'
            ? responseBody.error
            : `Provider returned HTTP ${response.status}`,
      );
    }

    const externalReference = String(
      responseBody?.id ??
      responseBody?.data?.id ??
      responseBody?.sid ??
      responseBody?.messageSid ??
      '',
    ) || null;

    await admin
      .from('communication_deliveries')
      .update({
        delivery_status: 'sent',
        sent_at: now,
        locked_at: null,
        next_attempt_at: null,
        error_message: null,
        external_reference: externalReference,
        provider_name:
          delivery.channel === 'email'
            ? (env.resendApiKey && env.resendFromEmail ? 'resend' : 'sendgrid')
            : determineProviderName(String(delivery.channel)),
        provider_response: responseBody,
        updated_at: now,
      })
      .eq('delivery_id', delivery.delivery_id);

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const patch = buildFailurePatch({
      attemptsCount,
      errorMessage,
      maxAttempts: deliveryEnv.maxDeliveryAttempts,
    });

    await admin
      .from('communication_deliveries')
      .update({
        ...patch,
        provider_name:
          delivery.channel === 'email'
            ? (env.resendApiKey && env.resendFromEmail ? 'resend' : 'sendgrid')
            : determineProviderName(String(delivery.channel)),
        processed_by: 'edge:communications-process',
        updated_at: new Date().toISOString(),
      })
      .eq('delivery_id', delivery.delivery_id);

    return { ok: false, error: errorMessage };
  }
}

async function processQueuedDeliveries(
  admin: ReturnType<typeof getAdminClient>,
  functionBaseUrl: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('communication_deliveries')
    .select('*')
    .eq('delivery_status', 'queued')
    .order('queued_at', { ascending: true })
    .limit(25);

  if (error) {
    throw new Error(error.message);
  }

  const dueDeliveries = (Array.isArray(data) ? data : []).filter((delivery) => (
    !delivery.next_attempt_at || new Date(delivery.next_attempt_at).getTime() <= new Date(now).getTime()
  )) as CommunicationDeliveryRecord[];

  let sent = 0;
  let failed = 0;
  for (const delivery of dueDeliveries) {
    const result = await sendDelivery(admin, delivery, functionBaseUrl);
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return {
    processed: dueDeliveries.length,
    sent,
    failed,
    skipped: (Array.isArray(data) ? data.length : 0) - dueDeliveries.length,
  };
}

async function handleProcessCommunicationQueue(request: Request) {
  if (!hasWorkerAccess(request)) {
    return json({ error: 'Missing worker secret' }, 401);
  }

  const admin = getAdminClient();
  const result = await processQueuedDeliveries(admin, getFunctionBaseUrl(request));
  return json(result);
}

async function handleSendTestCommunication(request: Request) {
  if (!hasWorkerAccess(request)) {
    return json({ error: 'Missing worker secret' }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const channel = String(body.channel ?? 'email');

  if (channel !== 'email') {
    return json({ error: 'Only email test sends are enabled in the current live configuration.' }, 400);
  }

  const destination =
    typeof body.destination === 'string' && body.destination.trim()
      ? body.destination.trim()
      : deliveryEnv.sendgridFromEmail || deliveryEnv.resendFromEmail || null;

  if (!destination) {
    return json({ error: 'No destination was provided and no email sender address is configured.' }, 400);
  }

  const delivery: CommunicationDeliveryRecord = {
    delivery_id: crypto.randomUUID(),
    channel: 'email',
    destination,
    subject: typeof body.subject === 'string' && body.subject.trim()
      ? body.subject.trim()
      : 'Wasel live communications test',
    payload: {
      body:
        typeof body.message === 'string' && body.message.trim()
          ? body.message.trim()
          : `Live communications test from Wasel at ${new Date().toISOString()}`,
    },
    provider_name: deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail ? 'resend' : 'sendgrid',
    external_reference: null,
    attempts_count: 0,
  };

  try {
    const providerRequest = deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail
      ? buildResendPayload(delivery, deliveryEnv)
      : buildSendgridPayload(delivery, deliveryEnv);

    const response = await fetch(providerRequest.url, providerRequest.init);
    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      return json({
        success: false,
        channel,
        destination,
        provider: delivery.provider_name,
        error:
          typeof responseBody?.message === 'string'
            ? responseBody.message
            : typeof responseBody?.error === 'string'
              ? responseBody.error
              : `Provider returned HTTP ${response.status}`,
        response: responseBody,
      }, 502);
    }

    return json({
      success: true,
      channel,
      destination,
      provider: delivery.provider_name,
      response: responseBody,
    });
  } catch (error) {
    return json({
      success: false,
      channel,
      destination,
      provider: delivery.provider_name,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}

async function handleProviderDiagnostics(request: Request) {
  if (!hasWorkerAccess(request)) {
    return json({ error: 'Missing worker secret' }, 401);
  }

  const diagnostics: Record<string, unknown> = {
    resend: {
      configured: Boolean(deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail),
    },
    sendgrid: {
      configured: Boolean(deliveryEnv.sendgridApiKey && deliveryEnv.sendgridFromEmail),
    },
    twilio: {
      configured: Boolean(deliveryEnv.twilioAccountSid && deliveryEnv.twilioAuthToken),
      messagingServiceConfigured: Boolean(deliveryEnv.twilioMessagingServiceSid),
      smsFromConfigured: Boolean(deliveryEnv.twilioSmsFrom),
      whatsappFromConfigured: Boolean(deliveryEnv.twilioWhatsappFrom),
    },
  };

  if (deliveryEnv.sendgridApiKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/user/account', {
        headers: {
          Authorization: `Bearer ${deliveryEnv.sendgridApiKey}`,
        },
      });
      diagnostics.sendgrid = {
        ...(diagnostics.sendgrid as Record<string, unknown>),
        authOk: response.ok,
        status: response.status,
        response: await response.json().catch(() => null),
      };
    } catch (error) {
      diagnostics.sendgrid = {
        ...(diagnostics.sendgrid as Record<string, unknown>),
        authOk: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (deliveryEnv.twilioAccountSid && deliveryEnv.twilioAuthToken) {
    const authHeader = `Basic ${btoa(`${deliveryEnv.twilioAccountSid}:${deliveryEnv.twilioAuthToken}`)}`;
    try {
      const accountResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${deliveryEnv.twilioAccountSid}.json`,
        { headers: { Authorization: authHeader } },
      );

      const numbersResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${deliveryEnv.twilioAccountSid}/IncomingPhoneNumbers.json?PageSize=20`,
        { headers: { Authorization: authHeader } },
      );

      const messagingServicesResponse = await fetch(
        `https://messaging.twilio.com/v1/Services?PageSize=20`,
        { headers: { Authorization: authHeader } },
      );

      diagnostics.twilio = {
        ...(diagnostics.twilio as Record<string, unknown>),
        authOk: accountResponse.ok,
        accountStatus: accountResponse.status,
        incomingNumbersStatus: numbersResponse.status,
        messagingServicesStatus: messagingServicesResponse.status,
        incomingNumbers: numbersResponse.ok
          ? ((await numbersResponse.json().catch(() => ({})))?.incoming_phone_numbers ?? [])
              .map((item: Record<string, unknown>) => ({
                phone_number: item.phone_number,
                sms_url: item.sms_url,
                capabilities: item.capabilities,
              }))
          : [],
        messagingServices: messagingServicesResponse.ok
          ? ((await messagingServicesResponse.json().catch(() => ({})))?.services ?? [])
              .map((item: Record<string, unknown>) => ({
                sid: item.sid,
                friendly_name: item.friendly_name,
              }))
          : [],
      };
    } catch (error) {
      diagnostics.twilio = {
        ...(diagnostics.twilio as Record<string, unknown>),
        authOk: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return json(diagnostics);
}

async function handleApplyCommunicationMigrations(request: Request) {
  if (!hasWorkerAccess(request)) {
    return json({ error: 'Missing worker secret' }, 401);
  }

  await executeSqlStatements(COMMUNICATIONS_RUNTIME_SQL);
  await executeSqlStatements(COMMUNICATIONS_OPERATIONS_SQL);

  return json({
    applied: [
      '20260401223000_communications_runtime_contract.sql',
      '20260401233000_communication_delivery_operations.sql',
    ],
  });
}

async function handleResendWebhook(request: Request) {
  const url = new URL(request.url);
  if (!hasValidWebhookToken(url, deliveryEnv.communicationWebhookToken)) {
    return json({ error: 'Invalid webhook token' }, 401);
  }

  const payload = await request.json().catch(() => ({}));
  const eventType = String(payload?.type ?? '');
  const externalReference = String(
    payload?.data?.email_id ??
    payload?.data?.id ??
    payload?.data?.email?.id ??
    '',
  );

  if (!externalReference) {
    return json({ received: true, ignored: true });
  }

  const status = mapResendEventToStatus(eventType);
  const now = new Date().toISOString();
  const admin = getAdminClient();
  const patch = status === 'failed'
    ? { delivery_status: 'failed', failed_at: now, error_message: eventType, provider_response: payload, updated_at: now }
    : status === 'delivered'
      ? { delivery_status: 'delivered', delivered_at: now, provider_response: payload, updated_at: now }
      : { delivery_status: 'sent', provider_response: payload, updated_at: now };

  const { error } = await admin
    .from('communication_deliveries')
    .update(patch)
    .eq('external_reference', externalReference)
    .eq('provider_name', 'resend');

  if (error) return json({ error: error.message }, 500);
  return json({ received: true, status });
}

async function handleTwilioWebhook(request: Request) {
  const url = new URL(request.url);
  if (!hasValidWebhookToken(url, deliveryEnv.communicationWebhookToken)) {
    return json({ error: 'Invalid webhook token' }, 401);
  }

  const form = await request.formData();
  const externalReference = String(form.get('MessageSid') ?? '');
  const rawStatus = String(form.get('MessageStatus') ?? '');

  if (!externalReference) {
    return json({ received: true, ignored: true });
  }

  const status = mapTwilioStatusToLifecycle(rawStatus);
  const now = new Date().toISOString();
  const payload = Object.fromEntries(form.entries());
  const admin = getAdminClient();
  const patch = status === 'failed'
    ? { delivery_status: 'failed', failed_at: now, error_message: rawStatus, provider_response: payload, updated_at: now }
    : status === 'delivered'
      ? { delivery_status: 'delivered', delivered_at: now, provider_response: payload, updated_at: now }
      : { delivery_status: 'sent', provider_response: payload, updated_at: now };

  const { error } = await admin
    .from('communication_deliveries')
    .update(patch)
    .eq('external_reference', externalReference)
    .eq('provider_name', 'twilio');

  if (error) return json({ error: error.message }, 500);
  return json({ received: true, status });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return noContent();
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*make-server-0b1f4071/, '') || '/';

    if (request.method === 'GET' && path === '/health') {
      return await handleHealth();
    }

    if (request.method === 'GET' && path === '/communications/preferences') {
      return await handleGetCommunicationPreferences(request);
    }

    if (request.method === 'POST' && path === '/auth/2fa/setup') {
      return await handleTwoFactorSetup(request);
    }

    if (request.method === 'POST' && path === '/auth/2fa/verify') {
      return await handleTwoFactorVerify(request);
    }

    if (request.method === 'POST' && path === '/auth/2fa/disable') {
      return await handleTwoFactorDisable(request);
    }

    if (request.method === 'PATCH' && path === '/communications/preferences') {
      return await handlePatchCommunicationPreferences(request);
    }

    if (request.method === 'POST' && path === '/communications/deliver') {
      return await handleQueueCommunicationDeliveries(request);
    }

    if (request.method === 'POST' && path === '/communications/process') {
      return await handleProcessCommunicationQueue(request);
    }

    if (request.method === 'POST' && path === '/communications/admin/send-test') {
      return await handleSendTestCommunication(request);
    }

    if (request.method === 'GET' && path === '/communications/admin/provider-diagnostics') {
      return await handleProviderDiagnostics(request);
    }

    if (request.method === 'POST' && path === '/communications/admin/apply-migrations') {
      return await handleApplyCommunicationMigrations(request);
    }

    if (request.method === 'POST' && path === '/communications/webhooks/resend') {
      return await handleResendWebhook(request);
    }

    if (request.method === 'POST' && path === '/communications/webhooks/twilio') {
      return await handleTwilioWebhook(request);
    }

    return json({ error: 'Route not found', path }, 404);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
