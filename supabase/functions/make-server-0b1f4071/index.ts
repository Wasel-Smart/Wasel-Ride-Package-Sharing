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
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const STRIPE_API_VERSION = Deno.env.get('STRIPE_API_VERSION') ?? '2026-02-25.clover';
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') ?? 'https://wasel14.online').replace(/\/$/, '');
const CLIQ_CHECKOUT_URL_TEMPLATE = Deno.env.get('CLIQ_CHECKOUT_URL_TEMPLATE') ?? '';
const STRIPE_WASEL_PLUS_PRICE_ID = Deno.env.get('STRIPE_WASEL_PLUS_PRICE_ID') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-communication-worker-secret, stripe-signature',
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

const CONTENT_MODERATION_SQL = `
create or replace function public.moderate_text_input(raw_value text)
returns text
language plpgsql
immutable
as $$
declare
  cleaned text := coalesce(raw_value, '');
begin
  cleaned := regexp_replace(cleaned, '<[^>]*>', '', 'g');
  cleaned := regexp_replace(cleaned, '(?i)(javascript:|data:|vbscript:)', '', 'g');
  cleaned := regexp_replace(cleaned, '[\\u0000-\\u001F\\u007F]', ' ', 'g');
  cleaned := regexp_replace(cleaned, '\\s+', ' ', 'g');
  cleaned := regexp_replace(cleaned, '(?i)\\b(damn|shit|fuck|bitch|asshole|bastard)\\b', '[redacted]', 'g');
  cleaned := btrim(cleaned);
  return nullif(cleaned, '');
end;
$$;

create or replace function public.apply_content_moderation()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'users' then
    new.full_name := coalesce(public.moderate_text_input(new.full_name), new.full_name);
  elsif tg_table_name = 'trips' then
    new.origin_name := public.moderate_text_input(new.origin_name);
    new.destination_name := public.moderate_text_input(new.destination_name);
    new.notes := public.moderate_text_input(new.notes);
  elsif tg_table_name = 'packages' then
    new.receiver_name := coalesce(public.moderate_text_input(new.receiver_name), new.receiver_name);
    new.origin_name := coalesce(public.moderate_text_input(new.origin_name), new.origin_name);
    new.destination_name := coalesce(public.moderate_text_input(new.destination_name), new.destination_name);
    new.description := public.moderate_text_input(new.description);
    new.return_reason := public.moderate_text_input(new.return_reason);
  elsif tg_table_name = 'bookings' then
    new.pickup_name := public.moderate_text_input(new.pickup_name);
    new.dropoff_name := public.moderate_text_input(new.dropoff_name);
    new.driver_review := public.moderate_text_input(new.driver_review);
    new.passenger_review := public.moderate_text_input(new.passenger_review);
  end if;

  return new;
end;
$$;

drop trigger if exists users_content_moderation on public.users;
create trigger users_content_moderation
before insert or update on public.users
for each row execute function public.apply_content_moderation();

drop trigger if exists trips_content_moderation on public.trips;
create trigger trips_content_moderation
before insert or update on public.trips
for each row execute function public.apply_content_moderation();

drop trigger if exists packages_content_moderation on public.packages;
create trigger packages_content_moderation
before insert or update on public.packages
for each row execute function public.apply_content_moderation();

drop trigger if exists bookings_content_moderation on public.bookings;
create trigger bookings_content_moderation
before insert or update on public.bookings
for each row execute function public.apply_content_moderation();
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
    .select('id, auth_user_id, email, phone_number, full_name')
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
      .select('id, auth_user_id, email, phone_number, full_name')
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

function getAppBaseUrl(request: Request): string {
  const origin = request.headers.get('origin')?.trim();
  if (origin) {
    return origin.replace(/\/$/, '');
  }
  return APP_BASE_URL;
}

function matchesAuthenticatedUser(
  auth: Awaited<ReturnType<typeof authenticateRequest>>,
  requestedUserId: string,
): boolean {
  if ('error' in auth) return false;
  return requestedUserId === auth.canonicalUser.id || requestedUserId === auth.authUser.id;
}

function parseWalletRoute(path: string) {
  const match = /^\/wallet\/([^/]+)\/([^/]+)$/.exec(path);
  if (!match) return null;
  return {
    userId: decodeURIComponent(match[1]),
    action: decodeURIComponent(match[2]),
  };
}

function mapWalletPaymentMethod(paymentMethod: string): string {
  switch (paymentMethod) {
    case 'card':
    case 'apple_pay':
    case 'google_pay':
      return 'card_payment';
    case 'cliq':
    case 'bank_transfer':
      return 'local_gateway';
    default:
      return 'card_payment';
  }
}

function toMoneyNumber(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Number(amount.toFixed(3)) : 0;
}

function toStripeMinorAmount(amountJod: number): string {
  return String(Math.round(amountJod * 1000));
}

function buildCliqCheckoutUrl(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => (
    encodeURIComponent(values[key] ?? '')
  ));
}

function mapSubscriptionPlan(planName: string): 'basic' | 'premium' | 'enterprise' {
  const normalized = planName.trim().toLowerCase();
  if (normalized.includes('enterprise')) return 'enterprise';
  if (normalized.includes('basic') || normalized.includes('starter')) return 'basic';
  return 'premium';
}

function toIsoFromUnix(value: unknown): string | null {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

async function stripeApiRequest(
  path: string,
  init?: {
    method?: 'GET' | 'POST';
    params?: URLSearchParams;
  },
) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured on the server');
  }

  const method = init?.method ?? 'POST';
  const params = init?.params;
  const body = method === 'POST' ? params : undefined;
  const query = method === 'GET' && params ? `?${params.toString()}` : '';
  const response = await fetch(`https://api.stripe.com${path}${query}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Stripe-Version': STRIPE_API_VERSION,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : `Stripe returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function getExistingStripeCustomerId(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.stripe_customer_id ? String(data.stripe_customer_id) : null;
}

async function ensureStripeCustomer(input: {
  admin: ReturnType<typeof getAdminClient>;
  canonicalUser: { id: string; email?: string | null; full_name?: string | null; phone_number?: string | null };
}): Promise<string> {
  const existingCustomerId = await getExistingStripeCustomerId(input.admin, input.canonicalUser.id);
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const params = new URLSearchParams();
  if (input.canonicalUser.email) params.set('email', input.canonicalUser.email);
  if (input.canonicalUser.full_name) params.set('name', input.canonicalUser.full_name);
  if (input.canonicalUser.phone_number) params.set('phone', input.canonicalUser.phone_number);
  params.set('metadata[user_id]', input.canonicalUser.id);

  const payload = await stripeApiRequest('/v1/customers', { params });
  if (!payload?.id) {
    throw new Error('Stripe customer creation did not return an id');
  }

  return String(payload.id);
}

async function fetchStripeSubscription(subscriptionId: string) {
  const params = new URLSearchParams();
  params.append('expand[]', 'items.data.price.product');
  return stripeApiRequest(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'GET',
    params,
  });
}

function buildSubscriptionRecord(
  userId: string,
  subscription: Record<string, unknown>,
  planOverride?: string | null,
) {
  const items = Array.isArray((subscription.items as { data?: unknown[] } | undefined)?.data)
    ? (subscription.items as { data: Array<Record<string, unknown>> }).data
    : [];
  const firstItem = items[0] ?? {};
  const price = (firstItem.price as Record<string, unknown> | undefined) ?? {};
  const metadata = (subscription.metadata as Record<string, unknown> | undefined) ?? {};
  const plan = mapSubscriptionPlan(
    String(planOverride ?? metadata.plan ?? metadata.plan_name ?? 'premium'),
  );

  return {
    user_id: userId,
    stripe_subscription_id: String(subscription.id ?? ''),
    stripe_customer_id: String(subscription.customer ?? ''),
    stripe_price_id: String(price.id ?? ''),
    stripe_product_id:
      typeof price.product === 'string'
        ? price.product
        : typeof (price.product as Record<string, unknown> | undefined)?.id === 'string'
          ? String((price.product as Record<string, unknown>).id)
          : null,
    status: String(subscription.status ?? 'incomplete'),
    plan,
    current_period_start: toIsoFromUnix(subscription.current_period_start),
    current_period_end: toIsoFromUnix(subscription.current_period_end),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    cancelled_at: toIsoFromUnix(subscription.canceled_at),
    ended_at: toIsoFromUnix(subscription.ended_at),
    trial_start: toIsoFromUnix(subscription.trial_start),
    trial_end: toIsoFromUnix(subscription.trial_end),
    updated_at: new Date().toISOString(),
  };
}

async function getCanonicalUserIdForSubscription(
  admin: ReturnType<typeof getAdminClient>,
  subscription: Record<string, unknown>,
): Promise<string | null> {
  const metadata = (subscription.metadata as Record<string, unknown> | undefined) ?? {};
  if (typeof metadata.user_id === 'string' && metadata.user_id.trim()) {
    return metadata.user_id.trim();
  }

  const subscriptionId = String(subscription.id ?? '');
  if (!subscriptionId) return null;

  const { data, error } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.user_id ? String(data.user_id) : null;
}

async function syncStripeSubscriptionRecord(input: {
  admin: ReturnType<typeof getAdminClient>;
  subscription: Record<string, unknown>;
  planOverride?: string | null;
}) {
  const userId = await getCanonicalUserIdForSubscription(input.admin, input.subscription);
  if (!userId) {
    return { synced: false, reason: 'missing_user_id' as const };
  }

  const record = buildSubscriptionRecord(userId, input.subscription, input.planOverride ?? null);
  if (!record.stripe_subscription_id || !record.stripe_customer_id || !record.stripe_price_id) {
    return { synced: false, reason: 'missing_subscription_fields' as const };
  }

  const { error } = await input.admin
    .from('subscriptions')
    .upsert(record, { onConflict: 'stripe_subscription_id' });

  if (error) {
    throw new Error(error.message);
  }

  return { synced: true, userId, subscriptionId: record.stripe_subscription_id };
}

async function getWalletSubscription(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    id: String(data.stripe_subscription_id ?? data.id ?? ''),
    status: String(data.status ?? 'inactive'),
    plan: String(data.plan ?? 'premium'),
    stripeCustomerId: data.stripe_customer_id ? String(data.stripe_customer_id) : null,
    stripePriceId: data.stripe_price_id ? String(data.stripe_price_id) : null,
    stripeProductId: data.stripe_product_id ? String(data.stripe_product_id) : null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    currentPeriodStart: data.current_period_start ? String(data.current_period_start) : null,
    currentPeriodEnd: data.current_period_end ? String(data.current_period_end) : null,
    cancelledAt: data.cancelled_at ? String(data.cancelled_at) : null,
    trialStart: data.trial_start ? String(data.trial_start) : null,
    trialEnd: data.trial_end ? String(data.trial_end) : null,
  };
}

async function createPendingTopUpTransaction(
  admin: ReturnType<typeof getAdminClient>,
  walletId: string,
  amountJod: number,
  paymentMethod: string,
) {
  const { data, error } = await admin
    .from('transactions')
    .insert({
      wallet_id: walletId,
      amount: amountJod,
      transaction_type: 'add_funds',
      payment_method: mapWalletPaymentMethod(paymentMethod),
      transaction_status: 'pending',
      direction: 'credit',
      reference_type: 'payment_session',
      metadata: {
        top_up_flow: 'hosted_checkout',
        requested_method: paymentMethod,
      },
    })
    .select('transaction_id, metadata')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    transactionId: String(data.transaction_id),
    metadata: data.metadata ?? {},
  };
}

async function updateTopUpTransactionMetadata(
  admin: ReturnType<typeof getAdminClient>,
  transactionId: string,
  metadataPatch: Record<string, unknown>,
) {
  const { data: existing } = await admin
    .from('transactions')
    .select('metadata')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  const mergedMetadata = {
    ...((existing?.metadata && typeof existing.metadata === 'object') ? existing.metadata : {}),
    ...metadataPatch,
  };

  const { error } = await admin
    .from('transactions')
    .update({
      metadata: mergedMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq('transaction_id', transactionId);

  if (error) {
    throw new Error(error.message);
  }
}

async function markTopUpTransactionFailed(
  admin: ReturnType<typeof getAdminClient>,
  transactionId: string,
  externalReference: string | null,
  provider: string,
  reason: string,
  providerPayload: unknown,
) {
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from('transactions')
    .select('metadata, transaction_status')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (!existing || existing.transaction_status === 'posted') {
    return;
  }

  const metadata = {
    ...((existing.metadata && typeof existing.metadata === 'object') ? existing.metadata : {}),
    provider,
    failure_reason: reason,
    provider_payload: providerPayload,
  };

  const { error } = await admin
    .from('transactions')
    .update({
      transaction_status: 'failed',
      reference_id: externalReference,
      metadata,
      updated_at: now,
    })
    .eq('transaction_id', transactionId);

  if (error) {
    throw new Error(error.message);
  }
}

async function finalizeTopUpTransaction(
  transactionId: string,
  externalReference: string,
  providerPayload: unknown,
) {
  if (!SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is not configured');
  }

  const client = new Client(SUPABASE_DB_URL);
  await client.connect();

  try {
    await client.queryArray('begin');

    const transactionResult = await client.queryObject<{
      wallet_id: string;
      amount: number;
      transaction_status: string;
      metadata: unknown;
    }>(
      'select wallet_id, amount, transaction_status, metadata from public.transactions where transaction_id = $1 for update',
      [transactionId],
    );

    const transaction = transactionResult.rows[0];
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} was not found`);
    }

    if (transaction.transaction_status === 'posted') {
      await client.queryArray('commit');
      return { applied: false, reason: 'already_posted' };
    }

    if (transaction.transaction_status === 'failed') {
      await client.queryArray('commit');
      return { applied: false, reason: 'already_failed' };
    }

    await client.queryObject(
      'update public.wallets set balance = balance + $1, updated_at = timezone(\'utc\', now()) where wallet_id = $2',
      [transaction.amount, transaction.wallet_id],
    );

    const nextMetadata = {
      ...((transaction.metadata && typeof transaction.metadata === 'object') ? transaction.metadata as Record<string, unknown> : {}),
      provider: 'stripe',
      provider_payload: providerPayload,
      credited_via: 'stripe_webhook',
    };

    await client.queryObject(
      'update public.transactions set transaction_status = $1, reference_id = $2, metadata = $3::jsonb, updated_at = timezone(\'utc\', now()) where transaction_id = $4',
      ['posted', externalReference, JSON.stringify(nextMetadata), transactionId],
    );

    await client.queryArray('commit');
    return { applied: true };
  } catch (error) {
    await client.queryArray('rollback').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function createStripeCheckoutSession(input: {
  amountJod: number;
  paymentMethod: string;
  transactionId: string;
  canonicalUserId: string;
  walletId: string;
  request: Request;
}) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured on the server');
  }

  const baseUrl = getAppBaseUrl(input.request);
  const successUrl = `${baseUrl}/app/wallet?payment=success&tx=${encodeURIComponent(input.transactionId)}`;
  const cancelUrl = `${baseUrl}/app/wallet?payment=cancelled&tx=${encodeURIComponent(input.transactionId)}`;
  const params = new URLSearchParams();

  params.set('mode', 'payment');
  params.set('success_url', successUrl);
  params.set('cancel_url', cancelUrl);
  params.set('client_reference_id', input.transactionId);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'jod');
  params.set('line_items[0][price_data][unit_amount]', toStripeMinorAmount(input.amountJod));
  params.set('line_items[0][price_data][product_data][name]', 'Wasel Wallet Top-Up');
  params.set('line_items[0][price_data][product_data][description]', `Wallet credit via ${input.paymentMethod}`);
  params.set('metadata[transaction_id]', input.transactionId);
  params.set('metadata[user_id]', input.canonicalUserId);
  params.set('metadata[wallet_id]', input.walletId);
  params.set('metadata[requested_method]', input.paymentMethod);

  return stripeApiRequest('/v1/checkout/sessions', { params });
}

async function createStripeSubscriptionCheckoutSession(input: {
  admin: ReturnType<typeof getAdminClient>;
  canonicalUser: { id: string; email?: string | null; full_name?: string | null; phone_number?: string | null };
  planName: string;
  request: Request;
}) {
  if (!STRIPE_WASEL_PLUS_PRICE_ID) {
    throw new Error('Stripe Wasel Plus price is not configured on the server');
  }

  const customerId = await ensureStripeCustomer({
    admin: input.admin,
    canonicalUser: input.canonicalUser,
  });

  const baseUrl = getAppBaseUrl(input.request);
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('customer', customerId);
  params.set('success_url', `${baseUrl}/app/wallet?subscription=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${baseUrl}/app/wallet?subscription=cancelled`);
  params.set('line_items[0][price]', STRIPE_WASEL_PLUS_PRICE_ID);
  params.set('line_items[0][quantity]', '1');
  params.set('allow_promotion_codes', 'true');
  params.set('metadata[user_id]', input.canonicalUser.id);
  params.set('metadata[plan]', mapSubscriptionPlan(input.planName));
  params.set('metadata[plan_name]', input.planName);
  params.set('subscription_data[metadata][user_id]', input.canonicalUser.id);
  params.set('subscription_data[metadata][plan]', mapSubscriptionPlan(input.planName));
  params.set('subscription_data[metadata][plan_name]', input.planName);

  return stripeApiRequest('/v1/checkout/sessions', { params });
}

function constantTimeEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function computeStripeSignature(secret: string, payload: string, timestamp: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));
  return Array.from(new Uint8Array(signature))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null): Promise<boolean> {
  if (!STRIPE_WEBHOOK_SECRET || !signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(',').map((segment) => segment.trim());
  const timestamp = parts.find((segment) => segment.startsWith('t='))?.slice(2) ?? '';
  const candidates = parts
    .filter((segment) => segment.startsWith('v1='))
    .map((segment) => segment.slice(3))
    .filter(Boolean);

  if (!timestamp || candidates.length === 0) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - Number(timestamp)) > 300) {
    return false;
  }

  const expected = await computeStripeSignature(STRIPE_WEBHOOK_SECRET, payload, timestamp);
  return candidates.some((candidate) => constantTimeEquals(candidate, expected));
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
    payments: {
      stripeConfigured: Boolean(STRIPE_SECRET_KEY),
      stripeWebhookConfigured: Boolean(STRIPE_WEBHOOK_SECRET),
      cliqConfigured: Boolean(CLIQ_CHECKOUT_URL_TEMPLATE),
      waselPlusPriceConfigured: Boolean(STRIPE_WASEL_PLUS_PRICE_ID),
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

async function handleApplyModerationMigrations(request: Request) {
  if (!hasWorkerAccess(request)) {
    return json({ error: 'Missing worker secret' }, 401);
  }

  await executeSqlStatements(CONTENT_MODERATION_SQL);

  return json({
    applied: [
      '20260503010000_content_moderation_runtime.sql',
    ],
  });
}

async function handleGetWalletSubscription(request: Request, requestedUserId: string) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;
  if (!matchesAuthenticatedUser(auth, requestedUserId)) {
    return json({ error: 'Wallet route is not authorized for this user.' }, 403);
  }

  try {
    const subscription = await getWalletSubscription(auth.admin, auth.canonicalUser.id);
    return json({ subscription });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}

async function handleWalletTopUp(request: Request, requestedUserId: string) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;
  if (!matchesAuthenticatedUser(auth, requestedUserId)) {
    return json({ error: 'Wallet route is not authorized for this user.' }, 403);
  }

  const body = await request.json().catch(() => ({}));
  const amountJod = toMoneyNumber(body.amount);
  const paymentMethod = String(body.paymentMethod ?? 'card').trim() || 'card';

  if (amountJod <= 0) {
    return json({ error: 'Amount must be greater than zero.' }, 400);
  }

  const { data: wallet, error: walletError } = await auth.admin
    .from('wallets')
    .select('wallet_id, user_id, currency_code')
    .eq('user_id', auth.canonicalUser.id)
    .maybeSingle();

  if (walletError) {
    return json({ error: walletError.message }, 500);
  }
  if (!wallet?.wallet_id) {
    return json({ error: 'Wallet not found.' }, 404);
  }

  const pending = await createPendingTopUpTransaction(
    auth.admin,
    String(wallet.wallet_id),
    amountJod,
    paymentMethod,
  );

  if (paymentMethod === 'cliq') {
    if (!CLIQ_CHECKOUT_URL_TEMPLATE) {
      await markTopUpTransactionFailed(
        auth.admin,
        pending.transactionId,
        null,
        'cliq',
        'CliQ provider is not configured on the server',
        { requested_method: paymentMethod },
      );
      return json({ error: 'CliQ provider is not configured on the server.' }, 503);
    }

    const checkoutUrl = buildCliqCheckoutUrl(CLIQ_CHECKOUT_URL_TEMPLATE, {
      transactionId: pending.transactionId,
      amount: amountJod.toFixed(3),
      currency: String(wallet.currency_code ?? 'JOD').toUpperCase(),
      returnUrl: `${getAppBaseUrl(request)}/app/wallet?payment=success&tx=${encodeURIComponent(pending.transactionId)}`,
    });

    await updateTopUpTransactionMetadata(auth.admin, pending.transactionId, {
      provider: 'cliq',
      checkout_url: checkoutUrl,
      provider_status: 'requires_action',
    });

    return json({
      payment: {
        transactionId: pending.transactionId,
        provider: 'cliq',
        status: 'requires_action',
        checkoutUrl,
      },
    }, 202);
  }

  try {
    const session = await createStripeCheckoutSession({
      amountJod,
      paymentMethod,
      transactionId: pending.transactionId,
      canonicalUserId: auth.canonicalUser.id,
      walletId: String(wallet.wallet_id),
      request,
    });

    await updateTopUpTransactionMetadata(auth.admin, pending.transactionId, {
      provider: 'stripe',
      provider_status: 'requires_action',
      checkout_session_id: session.id,
      checkout_url: session.url ?? null,
    });

    return json({
      payment: {
        transactionId: pending.transactionId,
        provider: 'stripe',
        status: 'requires_action',
        checkoutUrl: session.url ?? null,
        sessionId: session.id,
      },
    }, 202);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markTopUpTransactionFailed(
      auth.admin,
      pending.transactionId,
      null,
      'stripe',
      message,
      { requested_method: paymentMethod },
    ).catch(() => undefined);
    return json({ error: message }, 502);
  }
}

async function handleWalletSubscribe(request: Request, requestedUserId: string) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;
  if (!matchesAuthenticatedUser(auth, requestedUserId)) {
    return json({ error: 'Wallet route is not authorized for this user.' }, 403);
  }

  const body = await request.json().catch(() => ({}));
  const planName = String(body.planName ?? 'Wasel Plus').trim() || 'Wasel Plus';

  try {
    const existingSubscription = await getWalletSubscription(auth.admin, auth.canonicalUser.id);
    if (existingSubscription && ['active', 'trialing', 'past_due'].includes(existingSubscription.status)) {
      return json({
        subscription: {
          ...existingSubscription,
          provider: 'stripe',
        },
      });
    }

    const session = await createStripeSubscriptionCheckoutSession({
      admin: auth.admin,
      canonicalUser: {
        id: auth.canonicalUser.id,
        email: auth.canonicalUser.email ?? auth.authUser.email ?? null,
        full_name: auth.canonicalUser.full_name ?? null,
        phone_number: auth.canonicalUser.phone_number ?? null,
      },
      planName,
      request,
    });

    return json({
      subscription: {
        provider: 'stripe',
        status: 'requires_action',
        checkoutUrl: session.url ?? null,
        sessionId: session.id,
        plan: mapSubscriptionPlan(planName),
      },
    }, 202);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 502);
  }
}

async function handleStripeWebhook(request: Request) {
  if (!STRIPE_WEBHOOK_SECRET) {
    return json({ error: 'Stripe webhook secret is not configured.' }, 503);
  }

  const rawPayload = await request.text();
  const signatureOk = await verifyStripeWebhookSignature(
    rawPayload,
    request.headers.get('stripe-signature'),
  );

  if (!signatureOk) {
    return json({ error: 'Invalid Stripe signature.' }, 401);
  }

  const event = JSON.parse(rawPayload);
  const admin = getAdminClient();

  if (event?.type === 'checkout.session.completed') {
    const session = event?.data?.object ?? {};
    if (String(session?.mode ?? '') === 'subscription') {
      const subscriptionId = String(session?.subscription ?? '');
      if (!subscriptionId) {
        return json({ received: true, ignored: true, reason: 'missing_subscription_id' });
      }

      const subscription = await fetchStripeSubscription(subscriptionId);
      const synced = await syncStripeSubscriptionRecord({
        admin,
        subscription,
        planOverride: String(session?.metadata?.plan ?? session?.metadata?.plan_name ?? 'premium'),
      });
      return json({ received: true, subscriptionId, synced });
    }

    const transactionId = String(session?.metadata?.transaction_id ?? session?.client_reference_id ?? '');
    if (!transactionId) {
      return json({ received: true, ignored: true });
    }

    await finalizeTopUpTransaction(transactionId, String(session?.id ?? ''), event);
    return json({ received: true, transactionId, finalized: true });
  }

  if (event?.type === 'checkout.session.expired') {
    const session = event?.data?.object ?? {};
    if (String(session?.mode ?? '') === 'subscription') {
      return json({ received: true, sessionId: String(session?.id ?? ''), expired: true });
    }

    const transactionId = String(session?.metadata?.transaction_id ?? session?.client_reference_id ?? '');
    if (transactionId) {
      await markTopUpTransactionFailed(
        admin,
        transactionId,
        String(session?.id ?? ''),
        'stripe',
        'Checkout session expired',
        event,
      );
    }
    return json({ received: true, transactionId, expired: true });
  }

  if (event?.type === 'customer.subscription.created' || event?.type === 'customer.subscription.updated') {
    const subscription = event?.data?.object ?? {};
    const synced = await syncStripeSubscriptionRecord({ admin, subscription });
    return json({ received: true, subscriptionId: String(subscription?.id ?? ''), synced });
  }

  if (event?.type === 'customer.subscription.deleted') {
    const subscription = event?.data?.object ?? {};
    const synced = await syncStripeSubscriptionRecord({ admin, subscription });
    return json({ received: true, subscriptionId: String(subscription?.id ?? ''), deleted: true, synced });
  }

  if (event?.type === 'invoice.paid' || event?.type === 'invoice.payment_failed') {
    const invoice = event?.data?.object ?? {};
    const subscriptionId = String(invoice?.subscription ?? '');
    if (!subscriptionId) {
      return json({ received: true, ignored: true, reason: 'missing_subscription_id' });
    }

    const subscription = await fetchStripeSubscription(subscriptionId);
    const synced = await syncStripeSubscriptionRecord({ admin, subscription });
    return json({
      received: true,
      subscriptionId,
      invoiceId: String(invoice?.id ?? ''),
      synced,
      invoiceStatus: String(invoice?.status ?? ''),
    });
  }

  if (event?.type === 'invoice.created') {
    return json({ received: true, invoiceId: String(event?.data?.object?.id ?? ''), acknowledged: true });
  }

  if (event?.type === 'payment_intent.payment_failed') {
    const intent = event?.data?.object ?? {};
    const transactionId = String(intent?.metadata?.transaction_id ?? '');
    if (transactionId) {
      await markTopUpTransactionFailed(
        admin,
        transactionId,
        String(intent?.id ?? ''),
        'stripe',
        String(intent?.last_payment_error?.message ?? 'Payment failed'),
        event,
      );
    }
    return json({ received: true, transactionId, failed: true });
  }

  return json({ received: true, ignored: true });
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

    const walletRoute = parseWalletRoute(path);
    if (walletRoute) {
      if (request.method === 'GET' && walletRoute.action === 'subscription') {
        return await handleGetWalletSubscription(request, walletRoute.userId);
      }
      if (request.method === 'POST' && walletRoute.action === 'top-up') {
        return await handleWalletTopUp(request, walletRoute.userId);
      }
      if (request.method === 'POST' && walletRoute.action === 'subscribe') {
        return await handleWalletSubscribe(request, walletRoute.userId);
      }
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

    if (request.method === 'POST' && path === '/moderation/admin/apply-migrations') {
      return await handleApplyModerationMigrations(request);
    }

    if (request.method === 'POST' && path === '/payments/webhooks/stripe') {
      return await handleStripeWebhook(request);
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
