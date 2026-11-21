
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';
import Stripe from 'https://esm.sh/stripe@12.12.0?target=deno';
import {
    buildFailurePatch,
    buildResendPayload,
    buildSendgridPayload,
    buildTwilioRequest,
    determineProviderName,
    type CommunicationDeliveryRecord,
    type DeliveryProcessorEnv,
} from '../_shared/communication-runtime.ts';
import {
    isRuntimeAdminEnabled,
    resolveAllowedOrigin,
} from '../_shared/request-security.ts';
import {
    MOBILITY_OS_SEED_SQL,
    MOBILITY_OS_RUNTIME_SQL,
} from '../_shared/mobility-os-runtime.ts';
import { toNumber } from '../_shared/pricing.ts';
import {
    hasPermission,
    isHighPrivilegeRole,
    resolveAccessRole,
    type AccessPermission,
} from '../_shared/rbac.ts';
import {
  buildSubscriptionRecord,
  firstStringValue,
  formatDate,
  formatTime,
  isExpired,
  isFailedProviderStatus,
  isOlderThanHours,
  isPhoneNumberUniqueViolation,
  isSuccessfulProviderStatus,
  isWebhookRoute,
  mapBookingRow,
  mapPackageRow,
  mapSubscriptionPlan,
  normalizeProviderStatus,
  parseEntityRoute,
  parseWalletRoute,
  toIsoFromUnix,
  WEBHOOK_PATH_PREFIXES,
} from '../_shared/pure-helpers.ts';


// ── Runtime barrel ───────────────────────────────────────────────────────────
// Every handler module imports its helpers from './shared.ts', so this module
// re-exports the pure runtimes from ../_shared/ as well. Keeping the barrel
// here means a handler never has to know whether a helper lives in shared.ts or
// in a sibling runtime module, and it keeps the import graph acyclic.
export {
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
} from '../_shared/communication-runtime.ts';

export {
  generateBackupCodes,
  generateQRCode,
  generateTOTPSecret,
  hashBackupCode,
  hashBackupCodes,
  verifyTwoFactorChallenge,
} from '../_shared/two-factor-runtime.ts';

export {
  buildPublicHealthPayload,
  isRuntimeAdminEnabled,
  resolveAllowedOrigin,
} from '../_shared/request-security.ts';

export {
  advanceCorridorAfterBooking,
  buildMobilitySnapshot,
  MOBILITY_OS_SEED_SQL,
  MOBILITY_OS_RUNTIME_SQL,
  EVENT_OUTBOX_SQL,
  type MobilityBookingType,
  type MobilityCorridorRow,
} from '../_shared/mobility-os-runtime.ts';

export { calculateDirectPrice, toNumber } from '../_shared/pricing.ts';
export { normalizePhoneNumber, isValidE164Phone } from '../_shared/phone.ts';

export {
  buildSubscriptionRecord,
  firstStringValue,
  formatDate,
  formatTime,
  isExpired,
  isFailedProviderStatus,
  isOlderThanHours,
  isPhoneNumberUniqueViolation,
  isSuccessfulProviderStatus,
  isWebhookRoute,
  mapBookingRow,
  mapPackageRow,
  mapSubscriptionPlan,
  normalizeProviderStatus,
  parseWalletRoute,
  parseEntityRoute,
  toIsoFromUnix,
  WEBHOOK_PATH_PREFIXES,
};

// Inline definitions kept here so static contract tests that read this file
// directly (tests/unit/frontendRouteContract.test.ts) can assert the function
// signatures without importing the Deno-only pure-helpers module.
export function sanitizePlainText ( value: unknown, maxLength = 500 ): string {
  return String( value ?? '' )
    .replace( /<[^>]*>/g, '' )
    .replace( /(javascript:|data:|vbscript:)/gi, '' )
    .replace( /\p{Cc}/gu, ' ' )
    .replace( /\s+/g, ' ' )
    .trim()
    .slice( 0, maxLength );
}

export function isPlainObject ( value: unknown ): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray( value );
}

export {
  checkRateLimit,
  getRateLimitKey,
  createRateLimitMiddleware,
  checkDbRateLimit,
  type RateLimitConfig,
  type DbRateLimitConfig,
} from '../_shared/rate-limiter.ts';

export { idempotencyMiddleware } from '../_shared/idempotency-middleware.ts';

export {
  resolveTraceContext,
  buildDownstreamTraceHeaders,
  type TraceContext,
} from '../_shared/pure-helpers.ts';

export {
  hasPermission,
  resolveAccessRole,
  getRolePermissions,
  getRolesWithPermission,
  userHasPermission,
  assertPermission,
  ROLE_PERMISSIONS,
  VALID_ROLES,
  type AccessRole,
  type AccessPermission,
} from '../_shared/rbac.ts';

// Alias for the service-role client returned by getAdminClient(). Handler
// modules that only need the client type should import this rather than
// threading `ReturnType<typeof getAdminClient>` through every signature.
export type AdminClient = ReturnType<typeof getAdminClient>;

/**
 * Row shape of the canonical `public.users` record that every request resolves
 * to. Typed explicitly so that `authenticateRequest` returns a properly
 * discriminated union â€” without it, `'error' in auth` cannot narrow and every
 * caller's `auth.error` becomes `Response | undefined`.
 */
export interface CanonicalUserRow {
  // The canonical `users` row is passed to helpers typed as
  // `Record<string, unknown>`, so the record must stay indexable.
  [column: string]: unknown;
  id: string;
  auth_user_id: string | null;
  email: string | null;
  phone_number: string | null;
  full_name: string | null;
  role: string | null;
  verification_level: string | null;
  phone_verified_at: string | null;
  profile_status: string | null;
  updated_at: string | null;
}

// getUser() resolves to a discriminated union whose data arm still allows a
// null user, so both levels are unwrapped here. authenticateRequest() has
// already bailed out when there is no user, so callers can rely on it.
export type SupabaseAuthUser = NonNullable<
  NonNullable<Awaited<ReturnType<AdminClient['auth']['getUser']>>['data']>['user']
>;

/**
 * Failure arm. `error` is declared only here, so the `if ('error' in auth)`
 * guard every handler uses narrows to this arm and to nothing else.
 */
export type AuthFailure = { error: Response };

/** Success arm. Declares no `error` property, which is what makes the union discriminable. */
export type AuthSuccess = {
  admin: AdminClient;
  authUser: SupabaseAuthUser;
  canonicalUser: CanonicalUserRow;
};

export type AuthResult = AuthFailure | AuthSuccess;

/** Column list used by every canonical-user lookup; kept next to the type. */
const CANONICAL_USER_COLUMNS =
  'id, auth_user_id, email, phone_number, full_name, role, verification_level, phone_verified_at, profile_status, updated_at';

// ── Domain limits and messages ───────────────────────────────────────────────
// A pending driver-document review that never resolves would leave the trust
// surface permanently in limbo, so stale pending rows are failed closed after
// this many hours.
export const DRIVER_DOCUMENT_TIMEOUT_HOURS = 72;

// Phone OTP lifetime and the message returned when a number is already bound to
// another account. Kept next to the code that enforces it.
export const PHONE_VERIFICATION_TTL_MINUTES = 10;
export const PHONE_NUMBER_IN_USE_MESSAGE = 'This phone number is already linked to another account.';

// JOD settles in 1/1000 minor units. The bounds keep a client from creating a
// payment intent for a dust amount or an amount no provider will accept.
export const MIN_PAYMENT_AMOUNT_MINOR = 50;
export const MAX_PAYMENT_AMOUNT_MINOR = 5_000_000;

/** ISO-4217 codes the platform settles in. Mirrors src/utils/currency/types.ts. */
export const ALLOWED_PAYMENT_CURRENCIES: ReadonlySet<string> = new Set( [
  'jod', 'usd', 'eur', 'gbp', 'aed', 'sar', 'egp',
  'kwd', 'bhd', 'qar', 'omr', 'mad', 'tnd', 'iqd',
] );

// ── Wallet row shapes ────────────────────────────────────────────────────────
// All three are read with `select('*')`, so the records carry more columns than
// the platform names. The index signature models that honestly instead of
// pretending the table has only the fields listed here.
export interface WalletRow {
  [column: string]: unknown;
  wallet_id: string;
  user_id: string;
  balance: number | string | null;
  currency_code: string | null;
  wallet_status: string | null;
  pending_balance: number | string | null;
  pin_hash: string | null;
  auto_top_up_enabled: boolean | null;
  auto_top_up_amount: number | string | null;
  auto_top_up_threshold: number | string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WalletTransactionRow {
  [column: string]: unknown;
  transaction_id: string;
  wallet_id: string | null;
  user_id: string | null;
  transaction_type: string;
  transaction_status: string | null;
  direction: string;
  amount: number | string | null;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface PaymentMethodRow {
  [column: string]: unknown;
  id: string;
  user_id: string | null;
  method_type: string | null;
  provider: string | null;
  provider_reference: string | null;
  last_four: string | null;
  is_default: boolean | null;
  created_at: string | null;
}

export const SUPABASE_URL = Deno.env.get( 'SUPABASE_URL' ) ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get( 'SUPABASE_SERVICE_ROLE_KEY' ) ?? '';
export const SUPABASE_DB_URL = Deno.env.get( 'SUPABASE_DB_URL' ) ?? '';
export const STRIPE_SECRET_KEY = Deno.env.get( 'STRIPE_SECRET_KEY' ) ?? '';
export const STRIPE_API_VERSION = '2024-11-20';
export const stripe = STRIPE_SECRET_KEY ? new Stripe( STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION } ) : null;
export const STRIPE_WEBHOOK_SECRET = Deno.env.get( 'STRIPE_WEBHOOK_SECRET' ) ?? '';
export const RESEND_WEBHOOK_SIGNING_SECRET = Deno.env.get( 'RESEND_WEBHOOK_SIGNING_SECRET' ) ?? '';
export const TWILIO_WEBHOOK_SIGNING_SECRET = Deno.env.get( 'TWILIO_WEBHOOK_SIGNING_SECRET' ) ?? '';
export const TWILIO_VERIFY_SERVICE_SID = Deno.env.get( 'TWILIO_VERIFY_SERVICE_SID' ) ?? '';
export const APP_BASE_URL = ( Deno.env.get( 'APP_BASE_URL' ) ?? 'https://wasel14.online' ).replace( /\/$/, '' );
export const CLIQ_API_BASE_URL = ( Deno.env.get( 'CLIQ_API_BASE_URL' ) ?? Deno.env.get( 'JOPACC_API_BASE_URL' ) ?? '' ).replace( /\/$/, '' );
export const CLIQ_MERCHANT_ID = Deno.env.get( 'CLIQ_MERCHANT_ID' ) ?? Deno.env.get( 'JOPACC_MERCHANT_ID' ) ?? '';
export const CLIQ_API_KEY = Deno.env.get( 'CLIQ_API_KEY' ) ?? Deno.env.get( 'JOPACC_API_KEY' ) ?? '';
export const CLIQ_WEBHOOK_SECRET = Deno.env.get( 'CLIQ_WEBHOOK_SECRET' ) ?? Deno.env.get( 'JOPACC_WEBHOOK_SECRET' ) ?? '';
export const CLIQ_WEBHOOK_AMOUNT_UNIT = Deno.env.get( 'CLIQ_WEBHOOK_AMOUNT_UNIT' )?.trim().toLowerCase() ?? '';
export const CLIQ_CHECKOUT_URL_TEMPLATE = Deno.env.get( 'CLIQ_CHECKOUT_URL_TEMPLATE' ) ?? Deno.env.get( 'JOPACC_CHECKOUT_URL_TEMPLATE' ) ?? '';
export const CLIQ_CHECKOUT_ENDPOINT = Deno.env.get( 'CLIQ_CHECKOUT_ENDPOINT' ) ?? '/payments';
export const STRIPE_WASEL_PLUS_PRICE_ID = Deno.env.get( 'STRIPE_WASEL_PLUS_PRICE_ID' ) ?? '';
// The Supabase CLI and dashboard refuse secret names that start with SUPABASE_, so the
// hook secret is read from SEND_SMS_HOOK_SECRET first. The old name is kept as a fallback
// for any environment that already provides it.
export const SUPABASE_AUTH_HOOK_SEND_SMS_SECRET =
  Deno.env.get( 'SEND_SMS_HOOK_SECRET' ) ?? Deno.env.get( 'SUPABASE_AUTH_HOOK_SEND_SMS_SECRET' ) ?? '';
export const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get( 'ALLOWED_ORIGINS' ) ?? '';
// Localhost origins are only permitted when explicitly enabled (local dev).
// In production this MUST stay false so dev origins cannot call the API.
export const ALLOW_LOCAL_ORIGINS = Deno.env.get( 'ALLOW_LOCAL_ORIGINS' ) === 'true';
export const RUNTIME_ADMIN_ENABLED = isRuntimeAdminEnabled( Deno.env.get( 'ENABLE_RUNTIME_ADMIN_ENDPOINTS' ) );
export const SERVICE_NAME = 'make-server-0b1f4071';

export const responseBaseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token, x-communication-worker-secret, stripe-signature, x-cliq-signature, x-cliq-timestamp, x-merchant-signature, x-merchant-timestamp',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

export const deliveryEnv: DeliveryProcessorEnv = {
  resendApiKey: Deno.env.get( 'RESEND_API_KEY' ) ?? undefined,
  resendFromEmail: Deno.env.get( 'RESEND_FROM_EMAIL' ) ?? undefined,
  resendReplyToEmail: Deno.env.get( 'RESEND_REPLY_TO_EMAIL' ) ?? undefined,
  sendgridApiKey: Deno.env.get( 'SENDGRID_API_KEY' ) ?? undefined,
  sendgridFromEmail: Deno.env.get( 'SENDGRID_FROM_EMAIL' ) ?? undefined,
  twilioAccountSid: Deno.env.get( 'TWILIO_ACCOUNT_SID' ) ?? undefined,
  twilioAuthToken: Deno.env.get( 'TWILIO_AUTH_TOKEN' ) ?? undefined,
  twilioApiKeySid: Deno.env.get( 'TWILIO_API_KEY_SID' ) ?? undefined,
  twilioApiKeySecret: Deno.env.get( 'TWILIO_API_KEY_SECRET' ) ?? undefined,
  twilioMessagingServiceSid: Deno.env.get( 'TWILIO_MESSAGING_SERVICE_SID' ) ?? undefined,
  twilioSmsFrom: Deno.env.get( 'TWILIO_SMS_FROM' ) ?? undefined,
  twilioWhatsappFrom: Deno.env.get( 'TWILIO_WHATSAPP_FROM' ) ?? undefined,
  communicationWebhookToken: Deno.env.get( 'COMMUNICATION_WEBHOOK_TOKEN' ) ?? undefined,
  resendWebhookSigningSecret: Deno.env.get( 'RESEND_WEBHOOK_SIGNING_SECRET' ) ?? undefined,
  twilioWebhookSigningSecret: Deno.env.get( 'TWILIO_WEBHOOK_SIGNING_SECRET' ) ?? undefined,
  maxDeliveryAttempts: Number( Deno.env.get( 'COMMUNICATION_MAX_ATTEMPTS' ) ?? '5' ),
};

export const COMMUNICATIONS_RUNTIME_SQL = `
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

-- Client INSERT is intentionally not granted: rows are queued by the edge function
-- (service role), which forces the destination to the caller's own verified contact.
-- A client-writable queue let any signed-in user send SMS/email to any address.
drop policy if exists communication_deliveries_insert_own on public.communication_deliveries;
`;

export const COMMUNICATIONS_OPERATIONS_SQL = `
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

export const CONTENT_MODERATION_SQL = `
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

export function json ( data: unknown, status = 200 ) {
  return new Response( JSON.stringify( data ), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  } );
}

export function addVersionHeader ( response: Response ): Response {
  const headers = new Headers( response.headers );
  headers.set( 'X-Api-Version', 'v1' );
  return new Response( response.body, {
    status: response.status,
    headers,
  } );
}

export function noContent ( status = 204 ) {
  return new Response( null, {
    status,
  } );
}

export function buildResponseHeaders ( request: Request, extra?: HeadersInit ) {
  const headers = new Headers( extra ?? {} );
  const allowedOrigin = resolveAllowedOrigin(
    request.headers.get( 'origin' ),
    APP_BASE_URL,
    ADDITIONAL_ALLOWED_ORIGINS,
  );

  Object.entries( responseBaseHeaders ).forEach( ( [ key, value ] ) => {
    headers.set( key, value );
  } );

  headers.set( 'Vary', 'Origin' );

  if ( allowedOrigin ) {
    headers.set( 'Access-Control-Allow-Origin', allowedOrigin );
  } else {
    headers.delete( 'Access-Control-Allow-Origin' );
  }

  return headers;
}

export function finalizeResponse ( request: Request, response: Response | undefined ): Response {
  const resolvedResponse = response ?? json( { error: 'Route not found' }, 404 );
  const headers = buildResponseHeaders( request, resolvedResponse.headers );
  headers.set( 'X-Api-Version', 'v1' );
  return new Response( resolvedResponse.body, {
    status: resolvedResponse.status,
    headers,
  } );
}

export function logUnhandledRouteError ( error: unknown, request: Request ): void {
  const { pathname } = new URL( request.url );
  console.error( '[Edge] Unhandled request error', {
    path: pathname,
    method: request.method,
    message: error instanceof Error ? error.message : String( error ),
  } );
}

export function sanitizedUnhandledErrorResponse (): Response {
  return json(
    {
      error: 'Internal server error',
      requestId: crypto.randomUUID(),
    },
    500,
  );
}

export function isOriginAllowed ( request: Request ): boolean {
  const origin = request.headers.get( 'origin' );
  return !origin || Boolean( resolveAllowedOrigin( origin, APP_BASE_URL, ADDITIONAL_ALLOWED_ORIGINS, ALLOW_LOCAL_ORIGINS ) );
}

// Server-side CSRF / request-security gate for state-changing requests.
// This API is bearer-token authenticated (not cookie based), so the primary
// CSRF defense is the Authorization header + same-origin enforcement. We
// additionally require the client-sent x-csrf-token header on every mutating,
// non-webhook request so that cross-site scripted requests without the token
// are rejected. Webhook routes are exempt (they use signature verification).
export function enforceRequestSecurity ( request: Request, path: string ): Response | null {
  const method = request.method;
  const isMutating =
    method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if ( !isMutating || isWebhookRoute( path ) ) {return null;}

  // Price calculation is a public, deterministic read operation exposed as
  // POST only to keep its structured input out of the URL. It performs no
  // writes and does not access user data, so it must work without a session.
  if ( method === 'POST' && path === '/trips/calculate-price' ) {return null;}

  const authHeader = request.headers.get( 'authorization' ) ?? '';
  const csrfToken = request.headers.get( 'x-csrf-token' );
  if ( !authHeader.startsWith( 'Bearer ' ) || !csrfToken ) {
    return json( { error: 'Missing authentication or CSRF token' }, 403 );
  }
  return null;
}

export function getAdminClient () {
  if ( !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY ) {
    throw new Error( 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured' );
  }

  return createClient( SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  } );
}

/**
 * Asserts that SUPABASE_DB_URL is configured before any code that requires a
 * direct Postgres connection (executeSqlStatements).
 * Called at the top of those functions so the failure is explicit and logged
 * rather than surfacing as a cryptic "client.connect() failed" deep in the stack.
 */
export function requireDbUrl ( context: string ): string {
  if ( !SUPABASE_DB_URL ) {
    const msg = `${ context }: SUPABASE_DB_URL is required but not configured. Set it in the edge function secrets.`;
    console.error( msg );
    throw new Error( msg );
  }
  return SUPABASE_DB_URL;
}

export async function authenticateRequest ( request: Request ): Promise<AuthResult> {
  const authorization = request.headers.get( 'Authorization' ) ?? '';
  const token = authorization.startsWith( 'Bearer ' ) ? authorization.slice( 7 ) : '';
  if ( !token ) {
    return { error: json( { error: 'Missing bearer token' }, 401 ) };
  }

  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser( token );
  if ( authError || !authData.user ) {
    return { error: json( { error: 'Invalid auth token' }, 401 ) };
  }

  const { data: byAuthUser, error: byAuthError } = await admin
    .from( 'users' )
    .select( CANONICAL_USER_COLUMNS )
    .eq( 'auth_user_id', authData.user.id )
    .maybeSingle();

  if ( byAuthError ) {
    console.error( '[auth] canonical user lookup failed', byAuthError.message );
    return { error: json( { error: 'Unable to load your profile. Please try again.' }, 500 ) };
  }

  let canonicalUser = byAuthUser as CanonicalUserRow | null;
  let userError = null;
  if ( !canonicalUser ) {
    const fallback = await admin
      .from( 'users' )
      .select( CANONICAL_USER_COLUMNS )
      .eq( 'id', authData.user.id )
      .maybeSingle();
    canonicalUser = fallback.data as CanonicalUserRow | null;
    userError = fallback.error;
  }

  if ( userError || !canonicalUser ) {
    return { error: json( { error: 'Canonical user profile was not found' }, 404 ) };
  }

  const role = resolveAccessRole(canonicalUser.role);
  if (isHighPrivilegeRole(role)) {
    const { data: claimsData, error: claimsError } = await admin.auth.getClaims(token);
    if (claimsError) {
      console.error('[auth] privileged assurance verification failed', claimsError.message);
      return {
        error: json(
          { error: 'Unable to verify privileged authentication. Please try again.' },
          503,
        ),
      };
    }
    if (claimsData?.claims.aal !== 'aal2') {
      return {
        error: json(
          { error: 'Multi-factor authentication is required', code: 'AAL2_REQUIRED' },
          403,
        ),
      };
    }
  }

  return { admin, authUser: authData.user, canonicalUser };
}

export function constantTimeEqual ( a: string, b: string ): boolean {
  if ( a.length !== b.length ) {return false;}
  let result = 0;
  for ( let i = 0; i < a.length; i++ ) {
    result |= a.charCodeAt( i ) ^ b.charCodeAt( i );
  }
  return result === 0;
}

export function getWorkerSecret () {
  return Deno.env.get( 'COMMUNICATION_WORKER_SECRET' ) ?? '';
}

export function hasWorkerAccess ( request: Request ): boolean {
  const secret = getWorkerSecret();
  if ( !secret ) {return false;}
  return constantTimeEqual( request.headers.get( 'x-communication-worker-secret' ) ?? '', secret );
}

export function ensureRuntimeAdminAccess ( request: Request ): Response | null {
  if ( !RUNTIME_ADMIN_ENABLED ) {
    return json( { error: 'Runtime admin endpoints are disabled.' }, 404 );
  }

  if ( !hasWorkerAccess( request ) ) {
    return json( { error: 'Missing worker secret' }, 401 );
  }

  return null;
}

export function enforcePermission (
  auth: Awaited<ReturnType<typeof authenticateRequest>>,
  permission: AccessPermission,
): Response | null {
  if ( 'error' in auth ) {return auth.error;}

  const role = resolveAccessRole( auth.canonicalUser.role );
  if ( !hasPermission( role, permission ) ) {
    return json( { error: 'Insufficient permissions' }, 403 );
  }

  return null;
}

/**
 * Fixed-window rate limit backed by `public.consume_rate_limit` (Postgres), so
 * the counter is shared by every edge isolate.
 *
 * Returns a ready-to-send 429 when the caller is over the limit, otherwise null.
 * `failClosed` decides what happens if the limiter itself is unavailable: money
 * and credential paths should refuse (503) rather than run unthrottled; everything
 * else fails open so a limiter outage cannot take the API down.
 */
export async function consumeRateLimit (
  admin: ReturnType<typeof getAdminClient>,
  key: string,
  limit: number,
  options: { windowSeconds: number; failClosed?: boolean },
): Promise<Response | null> {
  const { windowSeconds } = options;
  try {
    const { data, error } = await admin.rpc( 'consume_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    } );
    if ( error ) {throw new Error( error.message );}

    const row = Array.isArray( data ) ? data[ 0 ] : data;
    if ( row && row.allowed === false ) {
      const retryAfter = Math.max( Number( row.retry_after_seconds ?? options.windowSeconds ), 1 );
      return new Response(
        JSON.stringify( {
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: retryAfter,
        } ),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': String( retryAfter ) },
        },
      );
    }
    return null;
  } catch ( error ) {
    console.error( '[rate-limit] limiter unavailable', {
      key: key.split( ':' )[ 0 ],
      message: error instanceof Error ? error.message : String( error ),
    } );
    return options.failClosed
      ? json( { error: 'Service temporarily unavailable. Please try again shortly.' }, 503 )
      : null;
  }
}

export async function resetRateLimit (
  admin: ReturnType<typeof getAdminClient>,
  key: string,
): Promise<void> {
  try {
    await admin.rpc( 'reset_rate_limit', { p_key: key } );
  } catch ( error ) {
    console.error( '[rate-limit] reset failed', error instanceof Error ? error.message : String( error ) );
  }
}

export function hasAnyPermission (
  auth: Awaited<ReturnType<typeof authenticateRequest>>,
  permissions: AccessPermission[],
): boolean {
  if ( 'error' in auth ) {return false;}

  const role = resolveAccessRole( auth.canonicalUser.role );
  return permissions.some( ( permission ) => hasPermission( role, permission ) );
}

export function getFunctionBaseUrl ( request: Request ): string {
  const url = new URL( request.url );
  return url.href.replace( /\/communications\/.*$/, '' ).replace( /\/health$/, '' );
}

export async function executeSqlStatements ( sql: string ) {
  const dbUrl = requireDbUrl( 'executeSqlStatements' );
  const client = new Client( dbUrl );
  await client.connect();
  try {
    await client.queryObject( sql );
  } finally {
    await client.end();
  }
}

export function getAppBaseUrl ( request: Request ): string {
  // The Origin header is client-controlled. It is used to build Stripe/CliQ
  // success and cancel URLs, so only an allow-listed origin may be echoed back;
  // anything else falls back to the canonical app URL.
  const origin = request.headers.get( 'origin' )?.trim();
  if ( origin ) {
    const allowed = resolveAllowedOrigin( origin, APP_BASE_URL, ADDITIONAL_ALLOWED_ORIGINS, ALLOW_LOCAL_ORIGINS );
    if ( allowed ) {
      return allowed.replace( /\/$/, '' );
    }
  }
  return APP_BASE_URL;
}

export function matchesAuthenticatedUser (
  auth: Awaited<ReturnType<typeof authenticateRequest>>,
  requestedUserId: string,
): boolean {
  if ( 'error' in auth ) {return false;}
  return requestedUserId === auth.canonicalUser.id || requestedUserId === auth.authUser.id;
}

export async function authenticateAuthUser ( request: Request ) {
  const authorization = request.headers.get( 'Authorization' ) ?? '';
  const token = authorization.startsWith( 'Bearer ' ) ? authorization.slice( 7 ) : '';
  if ( !token ) {
    return { error: json( { error: 'Missing bearer token' }, 401 ) };
  }

  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser( token );
  if ( error || !data.user ) {
    return { error: json( { error: 'Invalid auth token' }, 401 ) };
  }

  return { admin, authUser: data.user, token };
}

 
export async function ensureCanonicalUserForAuth (
  admin: ReturnType<typeof getAdminClient>,
  authUser: Record<string, unknown>,
  body: Record<string, unknown> = {},
) {
  const authUserId = String( authUser.id ?? '' );
  const email = String(
    // The auth-provider email is the verified identity; a client-supplied body
    // email must never override it (it would let a caller claim someone else's
    // address, which wallet transfers resolve recipients by). Phone-only accounts
    // therefore get a placeholder until they confirm an email through the auth provider.
    authUser.email || `pending-${ authUserId }@wasel.local`
  ).trim();
  const fullName =
    String(
      body.fullName ??
      // `join` returns '' (never nullish) when both names are absent, so the old
      // `??` chain never reached user_metadata.full_name and OAuth users were all
      // named "Wasel User". Convert the empty string to undefined first.
      ( [ body.firstName, body.lastName ].filter( Boolean ).join( ' ' ) || undefined ) ??
      ( authUser.user_metadata as Record<string, unknown> | undefined )?.full_name ??
      authUser.phone ??
      'Wasel User'
    ).trim() || 'Wasel User';
  const phoneNumber = String(
    body.phone_number ??
      body.phone ??
      ( authUser.user_metadata as Record<string, unknown> | undefined )?.phone ??
      '',
  ).trim() || null;

  const { data: existing, error: selectError } = await admin
    .from( 'users' )
    .select( '*' )
    .eq( 'auth_user_id', authUserId )
    .maybeSingle();
  if ( selectError ) {throw selectError;}
  if ( existing ) {return existing;}

  const { data, error } = await admin
    .from( 'users' )
    .insert( {
      id: authUserId,
      auth_user_id: authUserId,
      email,
      full_name: fullName,
      phone_number: phoneNumber,
      role: 'passenger',
      verification_level: 'level_0',
      profile_status: 'active',
    } )
    .select( '*' )
    .single();
  if ( error ) {throw error;}

  try {
    await admin
      .from( 'wallets' )
      .insert( {
        user_id: data.id,
        balance: 0,
        pending_balance: 0,
        wallet_status: 'active',
        currency_code: 'JOD',
      } );
  } catch {
    // Wallet creation is best-effort; profile creation remains valid without it.
  }

  return data;
}

export async function getWalletForUser ( admin: ReturnType<typeof getAdminClient>, userId: string ) {
  const { data, error } = await admin
    .from( 'wallets' )
    .select( '*' )
    .eq( 'user_id', userId )
    .maybeSingle();
  if ( error ) {throw error;}
  return data;
}

export async function getVerificationForUser ( admin: ReturnType<typeof getAdminClient>, userId: string ) {
  const { data, error } = await admin
    .from( 'verification_records' )
    .select( '*' )
    .eq( 'user_id', userId )
    .order( 'updated_at', { ascending: false } )
    .limit( 1 )
    .maybeSingle();
  if ( error ) {return null;}
  return data;
}

export async function getDriverForUser ( admin: ReturnType<typeof getAdminClient>, userId: string ) {
  const { data, error } = await admin
    .from( 'drivers' )
    .select( '*' )
    .eq( 'user_id', userId )
    .maybeSingle();
  if ( error ) {return null;}
  return data;
}

export async function ensureDriverForUser ( admin: ReturnType<typeof getAdminClient>, user: Record<string, unknown> ) {
  const existing = await getDriverForUser( admin, String( user.id ) );
  if ( existing ) {return existing;}

  // Never insert a drivers row here. The live table requires license_number
  // (NOT NULL), and the operator approval queue lists every pending_approval row,
  // so a row created without documents would both fail and be approvable blind.
  // The real row is created when the driver submits documents. Until then return
  // an unsaved placeholder that is never approved.
  return {
    driver_id: null as string | null,
    user_id: user.id,
    driver_status: 'draft',
    background_check_status: 'pending',
    verification_level: user.verification_level ?? 'level_0',
  } as Record<string, unknown> & { driver_id: string | null };
}

export function isApprovedDriver (
  user: Record<string, unknown>,
  driver: Record<string, unknown>,
  emailConfirmed: boolean,
): boolean {
  const role = String( user.role ?? 'passenger' );
  const driverStatus = String( driver.driver_status ?? '' );
  const bgStatus = String( driver.background_check_status ?? '' );
  // A driver is cleared once an operator approves their documents.
  // `pending_approval` drivers have submitted docs and are awaiting review;
  // they may create trips so the route is live when approval comes through.
  const isCleared =
    ( driverStatus === 'approved' && [ 'approved', 'verified' ].includes( bgStatus ) ) ||
    driverStatus === 'pending_approval' ||
    driverStatus === 'online' ||
    driverStatus === 'offline' ||
    driverStatus === 'busy';
  return (
    ( role === 'driver' || role === 'both' ) &&
    Boolean( user.phone_verified_at ) &&
    emailConfirmed &&
    isCleared
  );
}

// eslint-disable-next-line complexity
export async function buildProfilePayload ( admin: ReturnType<typeof getAdminClient>, user: Record<string, unknown> ) {
  const [ wallet, verification, driver ] = await Promise.all( [
    getWalletForUser( admin, String( user.id ) ).catch( () => null ),
    getVerificationForUser( admin, String( user.id ) ).catch( () => null ),
    getDriverForUser( admin, String( user.id ) ).catch( () => null ),
  ] );
  let tripCount = 0;
  if ( driver?.driver_id ) {
    try {
      const { count } = await admin
        .from( 'trips' )
        .select( 'trip_id', { count: 'exact', head: true } )
        .eq( 'driver_id', driver.driver_id );
      tripCount = count ?? 0;
    } catch {
      tripCount = 0;
    }
  }
  // "Verified" means an approved driver: phone and email are confirmed and an
  // operator has cleared the submitted driver documents.
  const verified =
    String( driver?.driver_status ?? '' ) === 'approved' ||
    String( user.verification_level ?? '' ) === 'level_3';

  return {
    id: String( user.auth_user_id ?? user.id ),
    canonical_user_id: String( user.id ),
    email: user.email ?? null,
    full_name: user.full_name ?? null,
    role: user.role ?? null,
    phone: user.phone_number ?? null,
    phone_number: user.phone_number ?? null,
    phone_verified: Boolean( user.phone_verified_at ),
    email_verified: null,
    wallet_balance: toNumber( wallet?.balance, 0 ),
    total_trips: tripCount,
    trip_count: tripCount,
    verified,
    id_verified: verified,
    is_verified: verified,
    // Ratings are sourced from the persisted profile/driver record when present,
    // never faked. Missing ratings resolve to 0 (no rating yet).
    rating: toNumber( user.rating, 0 ),
    rating_as_driver: toNumber( driver?.rating, 0 ),
    verification_level:
      verification?.verification_level ??
      driver?.verification_level ??
      user.verification_level ??
      'level_0',
    wallet_status: wallet?.wallet_status ?? 'active',
    avatar_url: user.avatar_url ?? null,
    two_factor_enabled: Boolean( user.two_factor_enabled ),
    created_at: user.created_at ?? null,
  };
}

export function mapTripRow ( row: Record<string, unknown>, driverProfile?: Record<string, unknown> | null ) {
  const createdAt = String( row.created_at ?? new Date().toISOString() );
  return {
    id: String( row.trip_id ?? '' ),
    from: String( row.origin_city ?? '' ),
    to: String( row.destination_city ?? '' ),
    date: formatDate( row.departure_time, createdAt.slice( 0, 10 ) ),
    time: formatTime( row.departure_time ),
    seats: toNumber( row.available_seats, 0 ),
    price: toNumber( row.price_per_seat, 0 ),
    driver: {
      id: String( driverProfile?.id ?? row.driver_id ?? 'driver' ),
      name: String( driverProfile?.full_name ?? driverProfile?.email ?? 'Wasel Driver' ),
      rating: toNumber( driverProfile?.rating, 0 ),
      verified: Boolean( driverProfile?.verified ?? false ),
    },
  };
}

export async function fetchDriverProfiles (
  admin: ReturnType<typeof getAdminClient>,
  driverIds: string[],
): Promise<Record<string, Record<string, unknown>>> {
  const uniqueIds = Array.from( new Set( driverIds.filter( Boolean ) ) );
  if ( uniqueIds.length === 0 ) {return {};}

  const { data: drivers } = await admin.from( 'drivers' ).select( '*' ).in( 'driver_id', uniqueIds );
  const driverRows = Array.isArray( drivers ) ? drivers : [];
  const usersById = new Map<string, Record<string, unknown>>();

  const userIds = driverRows.map( ( driver: Record<string, unknown> ) => String( driver.user_id ?? '' ) );
  if ( userIds.length > 0 ) {
    const { data: users } = await admin.from( 'users' ).select( 'id, full_name, email, phone_number, role' ).in( 'id', userIds );
    ( Array.isArray( users ) ? users : [] ).forEach( ( user: Record<string, unknown> ) => {
      usersById.set( String( user.id ), user );
    } );
  }

  const result: Record<string, Record<string, unknown>> = {};
  for ( const driver of driverRows as Array<Record<string, unknown>> ) {
    const user = usersById.get( String( driver.user_id ?? '' ) );
    if ( user ) {
      result[ String( driver.driver_id ) ] = await buildProfilePayload( admin, user );
    }
  }
  return result;
}


export async function ensureMobilitySeed ( admin: ReturnType<typeof getAdminClient> ) {
  if ( SUPABASE_DB_URL ) {
    // MOBILITY_OS_RUNTIME_SQL carries the create-table DDL. Without running it
    // first the seed insert below targets a table that does not exist yet, and
    // the failure is swallowed, so the caller then 500s on the missing table.
    await executeSqlStatements( MOBILITY_OS_RUNTIME_SQL ).catch( () => undefined );
  }
  const { data } = await admin.from( 'mobility_corridors' ).select( 'id' ).limit( 1 );
  if ( Array.isArray( data ) && data.length > 0 ) {return;}
  if ( SUPABASE_DB_URL ) {
    await executeSqlStatements( MOBILITY_OS_SEED_SQL ).catch( () => undefined );
  }
}

export function mapWalletPaymentMethod ( paymentMethod: string ): string {
  switch ( paymentMethod ) {
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

export function toMoneyNumber ( value: unknown ): number {
  const amount = Number( value );
  return Number.isFinite( amount ) ? Number( amount.toFixed( 3 ) ) : 0;
}

/**
 * JOD is a three-decimal currency (1 JOD = 1000 fils). Stripe requires amounts for
 * three-decimal currencies to be a multiple of 10 (it rejects e.g. 5124), so the
 * value is rounded to the nearest 10 fils (0.01 JOD) before conversion. This must
 * only ever be paired with a JOD Stripe price: charging it against a two-decimal
 * currency bills ten times the intended amount.
 */
export function toStripeMinorAmount ( amountJod: number ): string {
  return String( Math.round( amountJod * 100 ) * 10 );
}

// Stripe's smallest-unit exponent differs by currency. Charging a three-decimal
// currency (KWD, BHD, OMR, TND, JOD) with the two-decimal x100 rule bills one tenth
// of the intended amount, so card amounts must go through toStripeMinorUnits().
const STRIPE_THREE_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set( [ 'jod', 'kwd', 'bhd', 'omr', 'tnd' ] );
const STRIPE_TWO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set( [
  'usd', 'eur', 'gbp', 'aed', 'sar', 'egp', 'qar', 'mad',
] );

/**
 * Converts a major-unit amount to the integer Stripe expects for `currency`.
 * Three-decimal currencies are rounded to a multiple of 10 (Stripe rejects the
 * last digit being non-zero); two-decimal currencies use x100. Returns null for a
 * currency whose Stripe exponent is not known here (e.g. IQD), so a money path
 * fails closed instead of guessing a unit.
 */
export function toStripeMinorUnits ( major: number, currency: string ): number | null {
  const code = String( currency ?? '' ).trim().toLowerCase();
  if ( !Number.isFinite( major ) || major <= 0 ) {return null;}
  if ( STRIPE_THREE_DECIMAL_CURRENCIES.has( code ) ) {return Number( toStripeMinorAmount( major ) );}
  if ( STRIPE_TWO_DECIMAL_CURRENCIES.has( code ) ) {return Math.round( major * 100 );}
  return null;
}

export function buildCliqCheckoutUrl ( template: string, values: Record<string, string> ): string {
  return template.replace( /\{([a-zA-Z0-9_]+)\}/g, ( _, key: string ) => (
    encodeURIComponent( values[ key ] ?? '' )
  ) );
}

export function joinProviderUrl ( baseUrl: string, endpoint: string ): string {
  if ( !baseUrl ) {return '';}
  if ( /^https?:\/\//i.test( endpoint ) ) {return endpoint;}
  return `${ baseUrl }${ endpoint.startsWith( '/' ) ? endpoint : `/${ endpoint }` }`;
}

export function generateOtpCode (): string {
  const random = crypto.getRandomValues( new Uint32Array( 1 ) )[ 0 ] % 900000;
  return String( random + 100000 ).padStart( 6, '0' );
}

const TWILIO_REQUEST_TIMEOUT_MS = 10_000;

interface TwilioJsonResult {
  ok: boolean;
  status: number;
  payload: Record<string, unknown>;
}

/**
 * Every Twilio call leaves the function over the public internet, so DNS, TLS
 * and connection failures surface as a thrown TypeError instead of a response.
 * Left unhandled that exception escapes the request handler and the top-level
 * catch in index.ts replaces it with a generic 500 "Internal server error",
 * which is indistinguishable from an application bug and hides the real cause.
 * Routing the call through here keeps transport failures structured and typed.
 */
async function requestTwilioJson (
  url: string,
  authPair: { user: string; password: string },
  params: URLSearchParams,
): Promise<TwilioJsonResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout( () => controller.abort(), TWILIO_REQUEST_TIMEOUT_MS );

  try {
    const response = await fetch( url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${ btoa( `${ authPair.user }:${ authPair.password }` ) }`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal,
    } );
    const payload = ( await response.json().catch( () => ( {} ) ) ) as Record<string, unknown>;

    return { ok: response.ok, status: response.status, payload };
  } catch ( error ) {
    const timedOut = controller.signal.aborted;
    console.error( '[Edge] Twilio request failed', {
      url,
      timedOut,
      reason: error instanceof Error ? error.message : String( error ),
    } );

    return {
      ok: false,
      status: timedOut ? 408 : 0,
      payload: {
        message: timedOut
          ? 'The SMS provider did not respond in time. Please try again.'
          : 'The SMS provider could not be reached. Please try again.',
      },
    };
  } finally {
    clearTimeout( timeoutId );
  }
}

export function getTwilioAuthPairs (): Array<{ user: string; password: string }> {
  const pairs: Array<{ user: string; password: string }> = [];
  // Keep credentials paired: an API key secret must never be combined with an
  // account SID or account auth token. Some deployments carry both modes.
  if ( deliveryEnv.twilioApiKeySid && deliveryEnv.twilioApiKeySecret ) {
    pairs.push( { user: deliveryEnv.twilioApiKeySid, password: deliveryEnv.twilioApiKeySecret } );
  }
  if ( deliveryEnv.twilioAccountSid && deliveryEnv.twilioAuthToken ) {
    pairs.push( { user: deliveryEnv.twilioAccountSid, password: deliveryEnv.twilioAuthToken } );
  }
  return pairs;
}

export function getTwilioAuthPair (): { user: string; password: string } | null {
  return getTwilioAuthPairs()[0] ?? null;
}

async function requestTwilioWithAuthFallback ( url: string, params: URLSearchParams ) {
  const authPairs = getTwilioAuthPairs();
  if ( authPairs.length === 0 ) {
    return { ok: false, status: 0, payload: { message: 'Twilio credentials are not configured.' } as Record<string, unknown> };
  }

  let result = await requestTwilioJson( url, authPairs[0], params );
  // Retry only authentication failures. Do not resend a message/verification
  // request for timeouts or provider errors, which could create duplicate codes.
  for ( const authPair of authPairs.slice( 1 ) ) {
    if ( result.status !== 401 ) { break; }
    result = await requestTwilioJson( url, authPair, params );
  }
  return result;
}

export function hasTwilioVerifyRuntime (): boolean {
  return Boolean( deliveryEnv.twilioAccountSid && TWILIO_VERIFY_SERVICE_SID && getTwilioAuthPair() );
}

export async function callTwilioVerify ( path: string, params: URLSearchParams ) {
  if ( getTwilioAuthPairs().length === 0 || !deliveryEnv.twilioAccountSid || !TWILIO_VERIFY_SERVICE_SID ) {
    return {
      ok: false,
      retryable: false,
      error: 'Twilio Verify is not configured.',
    };
  }

  const result = await requestTwilioWithAuthFallback(
    `https://verify.twilio.com/v2/Services/${ TWILIO_VERIFY_SERVICE_SID }${ path }`,
    params,
  );

  return {
    ok: result.ok,
    // Provider authentication/permission failures are server configuration
    // errors, never incorrect user codes.
    retryable: result.status >= 400 && result.status < 500 && result.status !== 401 && result.status !== 403,
    payload: result.payload,
    error:
      typeof result.payload?.message === 'string'
        ? result.payload.message
        : `Twilio Verify request failed (${ result.status }).`,
  };
}

export async function sendTwilioOtpSms ( phoneNumber: string, code: string ): Promise<{ ok: boolean; retryable: boolean; error?: string }> {
  if ( getTwilioAuthPairs().length === 0 || !deliveryEnv.twilioAccountSid ) {
    return { ok: false, retryable: false, error: 'Twilio is not configured.' };
  }

  const body = `Wasel | واصل: Your verification code is ${ code }. It expires in 10 minutes. Never share this code with anyone.`;
  const params = new URLSearchParams( { To: phoneNumber, Body: body } );

  if ( deliveryEnv.twilioMessagingServiceSid ) {
    params.set( 'MessagingServiceSid', deliveryEnv.twilioMessagingServiceSid );
  } else if ( deliveryEnv.twilioSmsFrom ) {
    params.set( 'From', deliveryEnv.twilioSmsFrom );
  } else {
    return { ok: false, retryable: false, error: 'TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM is required.' };
  }

  const result = await requestTwilioWithAuthFallback(
    `https://api.twilio.com/2010-04-01/Accounts/${ deliveryEnv.twilioAccountSid }/Messages.json`,
    params,
  );

  return {
    ok: result.ok,
    retryable: result.status === 0 || result.status >= 500,
    error: result.ok ? undefined : String( result.payload?.message ?? `Twilio SMS error ${ result.status }` ),
  };
}

export async function startTwilioPhoneVerification ( phoneNumber: string, channel: 'sms' | 'whatsapp' = 'sms' ) {
  // Use Twilio Verify when configured; fall back to direct SMS OTP.
  if ( hasTwilioVerifyRuntime() ) {
    const result = await callTwilioVerify(
      '/Verifications',
      new URLSearchParams( { To: phoneNumber, Channel: channel, Locale: 'ar' } ),
    );
    return { ok: result.ok, retryable: result.retryable, error: result.ok ? undefined : result.error, channel };
  }

  const code = generateOtpCode();
  const result = await sendTwilioOtpSms( phoneNumber, code );
  return { ok: result.ok, retryable: result.retryable, error: result.error, _code: result.ok ? code : undefined, channel: 'sms' as const };
}

export async function checkTwilioPhoneVerification ( phoneNumber: string, code: string ) {
  const result = await callTwilioVerify(
    '/VerificationCheck',
    new URLSearchParams( {
      To: phoneNumber,
      Code: code,
    } ),
  );
  const status = typeof result.payload?.status === 'string' ? result.payload.status : '';

  return {
    ok: result.ok && status === 'approved',
    retryable: result.retryable,
    error: result.ok ? 'That verification code is incorrect.' : result.error,
  };
}

export async function hashOtpCode ( code: string ): Promise<string> {
  const digest = await crypto.subtle.digest( 'SHA-256', new TextEncoder().encode( code ) );
  return Array.from( new Uint8Array( digest ) )
    .map( ( chunk ) => chunk.toString( 16 ).padStart( 2, '0' ) )
    .join( '' );
}

export function computeTrustStepSummary ( steps: Record<string, { id: string; state: string }> ) {
  const all = Object.values( steps );
  const completed = all.filter( s => s.state === 'completed' ).length;
  const failed = all.filter( s => s.state === 'failed' ).length;
  const inProgress = all.filter( s => s.state === 'in_progress' ).length;
  // The Trust Center reads nextStepId / blockedSteps directly from this payload.
  const ordered = [ steps.email, steps.phone, steps.driverDocuments, steps.walletStanding ].filter( Boolean );
  return {
    totalSteps: all.length,
    completedSteps: completed,
    failedSteps: failed,
    inProgressSteps: inProgress,
    nextStepId: ordered.find( s => s.state !== 'completed' )?.id ?? null,
    blockedSteps: all.filter( s => s.state === 'failed' ).map( s => s.id ),
    reviewHistory: [] as unknown[],
  };
}

// eslint-disable-next-line max-params
export function buildTrustStep ( id: string, state: string, detail: string, meta: Record<string, unknown>, options?: {
  failureReason?: string | null;
  updatedAt?: string | null;
} ) {
  return { id, state, detail, ...meta, meta, failureReason: options?.failureReason ?? null, updatedAt: options?.updatedAt ?? null };
}

// eslint-disable-next-line max-lines-per-function, complexity
export async function buildTrustStatus (
  auth: Awaited<ReturnType<typeof authenticateRequest>>,
) {
  if ( 'error' in auth ) {
    return null;
  }

  const [ verificationResult, driverResult, walletResult, otpResult ] = await Promise.all( [
    auth.admin
      .from( 'verification_records' )
      .select(
        'verification_id, document_status, verification_level, verification_timestamp, provider_reference, document_reference, failure_reason, updated_at',
      )
      .eq( 'user_id', auth.canonicalUser.id )
      .eq( 'provider_reference', 'driver_documents' )
      .order( 'verification_timestamp', { ascending: false } )
      .limit( 1 )
      .maybeSingle(),
    auth.admin
      .from( 'drivers' )
      .select(
        'driver_id, license_number, driver_status, verification_level, background_check_status, created_at, updated_at',
      )
      .eq( 'user_id', auth.canonicalUser.id )
      .maybeSingle(),
    auth.admin
      .from( 'wallets' )
      .select( 'wallet_id, wallet_status, updated_at' )
      .eq( 'user_id', auth.canonicalUser.id )
      .maybeSingle(),
    auth.admin
      .from( 'otp_sessions' )
      .select(
        'otp_session_id, phone_number, attempts, max_attempts, expires_at, consumed_at, created_at',
      )
      .eq( 'user_id', auth.canonicalUser.id )
      .eq( 'purpose', 'driver_action' )
      .order( 'created_at', { ascending: false } )
      .limit( 1 )
      .maybeSingle(),
  ] );

  if ( verificationResult.error ) {throw new Error( verificationResult.error.message );}
  if ( driverResult.error ) {throw new Error( driverResult.error.message );}
  if ( walletResult.error ) {throw new Error( walletResult.error.message );}
  if ( otpResult.error ) {throw new Error( otpResult.error.message );}

  const verification = verificationResult.data;
  const driver = driverResult.data;
  const wallet = walletResult.data;
  const otpSession = otpResult.data;
  const verificationLevel = String(
    verification?.verification_level ?? auth.canonicalUser.verification_level ?? 'level_0',
  );
  const canonicalRole = String( auth.canonicalUser.role ?? 'passenger' );
  const emailAddress = auth.authUser.email ?? auth.canonicalUser.email ?? null;
  const emailVerified = Boolean( auth.authUser.email_confirmed_at );
  const phoneVerified = Boolean( auth.canonicalUser.phone_verified_at );

  const email = buildTrustStep(
    'email',
    emailVerified ? 'completed' : emailAddress ? 'in_progress' : 'not_started',
    emailVerified
      ? 'Email is verified.'
      : emailAddress
        ? 'Email confirmation is still required.'
        : 'Add an email address to continue.',
    {
      email: emailAddress,
    },
  );

  const phoneFailureReason =
    otpSession && !otpSession.consumed_at && isExpired( otpSession.expires_at )
      ? 'The verification code expired. Send a new code.'
      : otpSession &&
        Number( otpSession.attempts ?? 0 ) >= Number( otpSession.max_attempts ?? 5 )
        ? 'Too many incorrect verification attempts. Send a new code.'
        : null;
  const phoneState =
    phoneVerified
      ? 'completed'
      : phoneFailureReason
        ? 'failed'
        : otpSession && !otpSession.consumed_at && !isExpired( otpSession.expires_at )
          ? 'in_progress'
          : auth.canonicalUser.phone_number
            ? 'not_started'
            : 'not_started';
  const phone = buildTrustStep(
    'phone',
    phoneState,
    phoneVerified
      ? 'Phone number is verified.'
      : otpSession && !otpSession.consumed_at && !isExpired( otpSession.expires_at )
        ? 'Enter the latest code sent to your phone.'
        : auth.canonicalUser.phone_number
          ? 'Send a verification code to confirm this phone number.'
          : 'Add a phone number to receive a verification code.',
    {
      phone: otpSession?.phone_number ?? auth.canonicalUser.phone_number ?? null,
      expiresAt:
        otpSession && !otpSession.consumed_at && !isExpired( otpSession.expires_at )
          ? otpSession.expires_at
          : null,
    },
    {
      failureReason: phoneFailureReason,
      updatedAt: otpSession?.created_at ?? auth.canonicalUser.phone_verified_at ?? null,
    },
  );

  const driverReviewUpdatedAt = String(
    driver?.updated_at ??
    verification?.updated_at ??
    verification?.verification_timestamp ??
    '',
  ) || null;
  const staleDriverReview =
    ( driver?.background_check_status === 'pending' ||
      verification?.document_status === 'pending' ||
      driver?.driver_status === 'pending_approval' ) &&
    isOlderThanHours( driverReviewUpdatedAt, DRIVER_DOCUMENT_TIMEOUT_HOURS );
  const driverFailureReason =
    staleDriverReview
      ? 'Driver document review timed out. Resubmit the documents.'
      : driver?.background_check_status === 'rejected' || driver?.driver_status === 'rejected'
        ? 'Driver documents were rejected. Review the failed items and resubmit.'
        : driver?.background_check_status === 'expired'
          ? 'Driver documents expired and must be submitted again.'
          : driver?.driver_status === 'suspended'
            ? 'Driver account is suspended and cannot be approved until reviewed.'
            : verification?.document_status === 'rejected'
              ? verification?.failure_reason ?? 'Driver documents were rejected.'
              : null;
  const isDriverRole = canonicalRole === 'driver' || canonicalRole === 'both';
  const driverDocuments =
    !isDriverRole
      ? buildTrustStep(
        'driver_documents',
        'not_started',
        'Enable Driver mode before submitting driver documents.',
        {
          role: canonicalRole === 'admin' ? 'driver' : 'rider',
          licenseNumber: driver?.license_number ?? null,
        },
      )
      : ( driver?.background_check_status === 'verified' &&
        [ 'approved', 'offline', 'online', 'busy' ].includes( String( driver?.driver_status ) ) ) ||
        verificationLevel === 'level_3'
        ? buildTrustStep(
          'driver_documents',
          'completed',
          'Driver documents are approved.',
          {
            role: 'driver',
            licenseNumber: driver?.license_number ?? null,
          },
          {
            updatedAt: driverReviewUpdatedAt,
          },
        )
        : driverFailureReason
          ? buildTrustStep(
            'driver_documents',
            'failed',
            'Driver documents need attention before approval can continue.',
            {
              role: 'driver',
              licenseNumber: driver?.license_number ?? null,
            },
            {
              failureReason: driverFailureReason,
              updatedAt: driverReviewUpdatedAt,
            },
          )
          : driver?.background_check_status === 'pending' ||
            verification?.document_status === 'pending' ||
            driver?.driver_status === 'pending_approval'
            ? buildTrustStep(
              'driver_documents',
              'in_progress',
              'Driver documents are under review.',
              {
                role: 'driver',
                licenseNumber: driver?.license_number ?? null,
              },
              {
                updatedAt: driverReviewUpdatedAt,
              },
            )
            : buildTrustStep(
              'driver_documents',
              'not_started',
              'Submit driver license and compliance documents.',
              {
                role: 'driver',
                licenseNumber: driver?.license_number ?? null,
              },
            );

  const walletStatus = String( wallet?.wallet_status ?? 'unavailable' );
  const walletStanding =
    walletStatus === 'active'
      ? buildTrustStep(
        'wallet_standing',
        'completed',
        'Wallet standing is healthy.',
        {
          walletStatus: 'active',
        },
        {
          updatedAt: wallet?.updated_at ?? null,
        },
      )
      : walletStatus === 'limited'
        ? buildTrustStep(
          'wallet_standing',
          'in_progress',
          'Wallet standing is limited and may block some actions.',
          {
            walletStatus: 'limited',
          },
          {
            updatedAt: wallet?.updated_at ?? null,
          },
        )
        : buildTrustStep(
          'wallet_standing',
          'failed',
          walletStatus === 'unavailable'
            ? 'Wallet is not provisioned yet.'
            : `Wallet standing is ${ walletStatus }.`,
          {
            walletStatus:
              walletStatus === 'frozen' || walletStatus === 'closed'
                ? walletStatus
                : 'unavailable',
          },
          {
            failureReason:
              walletStatus === 'closed'
                ? 'Wallet is closed and must be restored before payouts can continue.'
                : walletStatus === 'frozen'
                  ? 'Wallet is frozen and needs review before payouts can continue.'
                  : 'Wallet provisioning is missing for this account.',
            updatedAt: wallet?.updated_at ?? null,
          },
        );

  const steps = {
    email,
    phone,
    driverDocuments,
    walletStanding,
  };
  const summary = computeTrustStepSummary( steps );

  return {
    fetchedAt: new Date().toISOString(),
    verificationLevel,
    ...summary,
    steps,
  };
}

export async function stripeApiRequest (
  path: string,
  init?: {
    method?: 'GET' | 'POST';
    params?: URLSearchParams;
  },
): Promise<Record<string, unknown>> {
  if ( !STRIPE_SECRET_KEY ) {throw new Error( 'STRIPE_SECRET_KEY is not configured' );}
  const method = init?.method ?? 'GET';
  const url = `https://api.stripe.com${ path }${ method === 'GET' && init?.params ? `?${ init.params.toString() }` : '' }`;
  const response = await fetch( url, {
    method,
    headers: {
      Authorization: `Bearer ${ STRIPE_SECRET_KEY }`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': STRIPE_API_VERSION,
    },
    body: method === 'POST' && init?.params ? init.params.toString() : undefined,
  } );
  const data = await response.json().catch( () => ( {} ) );
  if ( !response.ok ) {throw new Error( String( data?.error?.message ?? `Stripe API error ${ response.status }` ) );}
  return data as Record<string, unknown>;
}

export async function getExistingStripeCustomerId (
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from( 'subscriptions' )
    .select( 'stripe_customer_id' )
    .eq( 'user_id', userId )
    .order( 'updated_at', { ascending: false } )
    .limit( 1 )
    .maybeSingle();

  if ( error ) {
    throw new Error( error.message );
  }

  return data?.stripe_customer_id ? String( data.stripe_customer_id ) : null;
}

export async function ensureStripeCustomer ( input: {
  admin: ReturnType<typeof getAdminClient>;
  canonicalUser: { id: string; email?: string | null; full_name?: string | null; phone_number?: string | null };
} ): Promise<string> {
  const existing = await getExistingStripeCustomerId( input.admin, input.canonicalUser.id );
  if ( existing ) {return existing;}
  const params = new URLSearchParams();
  if ( input.canonicalUser.email ) {params.append( 'email', input.canonicalUser.email );}
  if ( input.canonicalUser.full_name ) {params.append( 'name', input.canonicalUser.full_name );}
  params.append( 'metadata[user_id]', input.canonicalUser.id );
  const customer = await stripeApiRequest( '/v1/customers', { method: 'POST', params } );
  return String( customer.id );
}

export function fetchStripeSubscription ( subscriptionId: string ) {
  const params = new URLSearchParams();
  params.append( 'expand[]', 'items.data.price.product' );
  return stripeApiRequest( `/v1/subscriptions/${ encodeURIComponent( subscriptionId ) }`, {
    method: 'GET',
    params,
  } );
}

export async function getCanonicalUserIdForSubscription (
  admin: ReturnType<typeof getAdminClient>,
  subscription: Record<string, unknown>,
): Promise<string | null> {
  const metadata = ( subscription.metadata as Record<string, unknown> | undefined ) ?? {};
  if ( typeof metadata.user_id === 'string' && metadata.user_id.trim() ) {
    return metadata.user_id.trim();
  }

  const subscriptionId = String( subscription.id ?? '' );
  if ( !subscriptionId ) {return null;}

  const { data, error } = await admin
    .from( 'subscriptions' )
    .select( 'user_id' )
    .eq( 'stripe_subscription_id', subscriptionId )
    .maybeSingle();

  if ( error ) {
    throw new Error( error.message );
  }

  return data?.user_id ? String( data.user_id ) : null;
}

export async function syncStripeSubscriptionRecord ( input: {
  admin: ReturnType<typeof getAdminClient>;
  subscription: Record<string, unknown>;
  planOverride?: string | null;
} ) {
  const userId = await getCanonicalUserIdForSubscription( input.admin, input.subscription );
  if ( !userId ) {return null;}
  const record = buildSubscriptionRecord( userId, input.subscription, input.planOverride );
  const { error } = await input.admin.from( 'subscriptions' ).upsert( record, { onConflict: 'stripe_subscription_id' } );
  if ( error ) {throw new Error( error.message );}
  return record;
}

export async function getWalletSubscription (
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from( 'subscriptions' )
    .select( '*' )
    .eq( 'user_id', userId )
    .order( 'current_period_end', { ascending: false } )
    .limit( 1 )
    .maybeSingle();

  if ( error ) {
    const message = String( error.message ?? '' );
    if (
      message.includes( "Could not find the table 'public.subscriptions'" ) ||
      message.includes( 'relation "public.subscriptions" does not exist' )
    ) {
      return null;
    }
    throw new Error( error.message );
  }

  if ( !data ) {return null;}

  return {
    id: String( data.stripe_subscription_id ?? data.id ?? '' ),
    status: String( data.status ?? 'inactive' ),
    plan: String( data.plan ?? 'premium' ),
    stripeCustomerId: data.stripe_customer_id ? String( data.stripe_customer_id ) : null,
    stripePriceId: data.stripe_price_id ? String( data.stripe_price_id ) : null,
    stripeProductId: data.stripe_product_id ? String( data.stripe_product_id ) : null,
    cancelAtPeriodEnd: Boolean( data.cancel_at_period_end ),
    currentPeriodStart: data.current_period_start ? String( data.current_period_start ) : null,
    currentPeriodEnd: data.current_period_end ? String( data.current_period_end ) : null,
    cancelledAt: data.cancelled_at ? String( data.cancelled_at ) : null,
    trialStart: data.trial_start ? String( data.trial_start ) : null,
    trialEnd: data.trial_end ? String( data.trial_end ) : null,
  };
}

export function describeWalletTransaction ( row: WalletTransactionRow ): string {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const metadataDescription = metadata.description ?? metadata.note;
  if ( metadataDescription ) {return String( metadataDescription );}

  switch ( row.transaction_type ) {
    case 'add_funds':
      return 'Wallet top-up';
    case 'transfer_funds':
      return row.direction === 'credit' ? 'Wallet transfer received' : 'Wallet transfer sent';
    case 'withdraw_funds':
    case 'withdrawal':
      return 'Wallet withdrawal';
    case 'driver_earning':
      return 'Driver earnings';
    case 'ride_payment':
      return 'Ride payment';
    case 'package_payment':
      return 'Package payment';
    case 'refund':
      return 'Wallet refund';
    default:
      return 'Wallet transaction';
  }
}

export function toWalletTransaction ( row: WalletTransactionRow ) {
  const amount = toNumber( row.amount, 0 );
  const signedAmount = row.direction === 'debit' ? -Math.abs( amount ) : Math.abs( amount );

  return {
    id: String( row.transaction_id ?? crypto.randomUUID() ),
    type: String( row.transaction_type ?? 'wallet' ),
    description: describeWalletTransaction( row ),
    amount: signedAmount,
    createdAt: String( row.created_at ?? new Date().toISOString() ),
    status: row.transaction_status ? String( row.transaction_status ) : undefined,
  };
}

const UNSETTLED_TRANSACTION_STATUSES: ReadonlySet<string> = new Set( [
  'pending', 'processing', 'requires_action', 'failed', 'cancelled', 'canceled', 'expired',
] );

/** True for ledger rows that represent money that actually moved. */
function isSettledStatus ( status: unknown ): boolean {
  return !UNSETTLED_TRANSACTION_STATUSES.has( String( status ?? '' ).trim().toLowerCase() );
}

export function buildWalletInsights ( allTransactions: ReturnType<typeof toWalletTransaction>[] ) {
  // Pending/failed top-ups are not money movements; counting them inflated every
  // total below (each abandoned checkout added a phantom credit).
  const transactions = allTransactions.filter( ( tx ) => isSettledStatus( tx.status ) );
  const now = new Date();
  const currentMonthKey = `${ now.getUTCFullYear() }-${ String( now.getUTCMonth() + 1 ).padStart( 2, '0' ) }`;
  const previousMonthDate = new Date( Date.UTC( now.getUTCFullYear(), now.getUTCMonth() - 1, 1 ) );
  const previousMonthKey = `${ previousMonthDate.getUTCFullYear() }-${ String( previousMonthDate.getUTCMonth() + 1 ).padStart( 2, '0' ) }`;
  const thisMonth = transactions.filter( tx => tx.createdAt.startsWith( currentMonthKey ) );
  const lastMonth = transactions.filter( tx => tx.createdAt.startsWith( previousMonthKey ) );
  const thisMonthSpent = thisMonth.filter( tx => tx.amount < 0 ).reduce( ( total, tx ) => total + Math.abs( tx.amount ), 0 );
  const lastMonthSpent = lastMonth.filter( tx => tx.amount < 0 ).reduce( ( total, tx ) => total + Math.abs( tx.amount ), 0 );
  const thisMonthEarned = thisMonth.filter( tx => tx.amount > 0 ).reduce( ( total, tx ) => total + tx.amount, 0 );
  const categoryBreakdown = transactions.reduce<Record<string, number>>( ( acc, tx ) => {
    const key = tx.type || 'wallet';
    acc[ key ] = Number( ( ( acc[ key ] ?? 0 ) + Math.abs( tx.amount ) ).toFixed( 2 ) );
    return acc;
  }, {} );
  const monthlyBuckets = new Map<string, { spent: number; earned: number }>();
  for ( const tx of transactions ) {
    const date = new Date( tx.createdAt );
    if ( Number.isNaN( date.getTime() ) ) {continue;}
    const month = date.toLocaleDateString( 'en-US', { month: 'short', timeZone: 'UTC' } );
    const bucket = monthlyBuckets.get( month ) ?? { spent: 0, earned: 0 };
    if ( tx.amount < 0 ) {bucket.spent += Math.abs( tx.amount );}
    if ( tx.amount > 0 ) {bucket.earned += tx.amount;}
    monthlyBuckets.set( month, bucket );
  }

  return {
    thisMonthSpent: Number( thisMonthSpent.toFixed( 2 ) ),
    lastMonthSpent: Number( lastMonthSpent.toFixed( 2 ) ),
    thisMonthEarned: Number( thisMonthEarned.toFixed( 2 ) ),
    changePercent: lastMonthSpent > 0
      ? Number( ( ( ( thisMonthSpent - lastMonthSpent ) / lastMonthSpent ) * 100 ).toFixed( 1 ) )
      : thisMonthSpent > 0 ? 100 : 0,
    categoryBreakdown,
    monthlyTrend: Array.from( monthlyBuckets.entries() ).map( ( [ month, bucket ] ) => ( {
      month,
      spent: Number( bucket.spent.toFixed( 2 ) ),
      earned: Number( bucket.earned.toFixed( 2 ) ),
    } ) ),
    totalTransactions: transactions.length,
    carbonSaved: Math.max( 0, Math.round( transactions.length * 1.5 ) ),
  };
}

export function normalizeWalletPaymentMethod ( method: unknown ): string {
  const value = String( method ?? 'card' ).trim();
  return [ 'card_payment', 'local_gateway', 'wallet_balance', 'government_api' ].includes( value )
    ? value
    : mapWalletPaymentMethod( value );
}

export function mapReferenceTypeToTransactionType ( referenceType: string ): string {
  switch ( referenceType ) {
    case 'ride_booking': return 'ride_payment';
    case 'package_delivery': return 'package_payment';
    case 'bus_booking': return 'bus_payment';
    case 'subscription': return 'subscription_payment';
    default: return 'purchase';
  }
}

export function buildWalletPayload (
  wallet: WalletRow,
  transactions: WalletTransactionRow[],
  paymentMethods: PaymentMethodRow[],
  subscription: Awaited<ReturnType<typeof getWalletSubscription>>,
) {
  const normalizedTransactions = transactions.map( toWalletTransaction );
  const settledRows = transactions.filter( ( row ) => isSettledStatus( row.transaction_status ) );
  const totalEarned = settledRows
    .filter( row => row.direction === 'credit' )
    .reduce( ( total, row ) => total + toNumber( row.amount, 0 ), 0 );
  const totalSpent = settledRows
    .filter( row => row.direction === 'debit' )
    .reduce( ( total, row ) => total + toNumber( row.amount, 0 ), 0 );
  const totalDeposited = settledRows
    .filter( row => row.transaction_type === 'add_funds' && row.direction === 'credit' )
    .reduce( ( total, row ) => total + toNumber( row.amount, 0 ), 0 );
  const currency = String( wallet.currency_code ?? 'JOD' ).toUpperCase();

  return {
    wallet: {
      id: wallet.wallet_id ?? null,
      userId: wallet.user_id ?? null,
      walletType: 'user',
      status: wallet.wallet_status ?? 'active',
      currency,
      autoTopUp: Boolean( wallet.auto_top_up_enabled ),
      autoTopUpAmount: toNumber( wallet.auto_top_up_amount, 20 ),
      autoTopUpThreshold: toNumber( wallet.auto_top_up_threshold, 5 ),
      paymentMethods,
      createdAt: wallet.created_at ?? null,
    },
    balance: toNumber( wallet.balance, 0 ),
    pendingBalance: toNumber( wallet.pending_balance, 0 ),
    rewardsBalance: 0,
    total_earned: Number( totalEarned.toFixed( 2 ) ),
    total_spent: Number( totalSpent.toFixed( 2 ) ),
    total_deposited: Number( totalDeposited.toFixed( 2 ) ),
    currency,
    pinSet: Boolean( wallet.pin_hash ),
    autoTopUp: Boolean( wallet.auto_top_up_enabled ),
    transactions: normalizedTransactions,
    activeEscrows: [],
    activeRewards: [],
    subscription,
  };
}

export async function ensureWalletForUser ( admin: ReturnType<typeof getAdminClient>, userId: string ): Promise<WalletRow> {
  const { data: existing, error: existingError } = await admin
    .from( 'wallets' )
    .select( '*' )
    .eq( 'user_id', userId )
    .maybeSingle();

  if ( existingError ) {
    throw new Error( existingError.message );
  }
  if ( existing?.wallet_id ) {
    return existing as WalletRow;
  }

  const { data: created, error: createError } = await admin
    .from( 'wallets' )
    .insert( { user_id: userId } )
    .select( '*' )
    .single();

  if ( createError ) {
    throw new Error( createError.message );
  }

  return created as WalletRow;
}

export async function loadWalletDetails ( admin: ReturnType<typeof getAdminClient>, userId: string ) {
  const wallet = await ensureWalletForUser( admin, userId );
  const [ { data: transactions, error: transactionsError }, { data: paymentMethods, error: paymentMethodsError }, subscription ] = await Promise.all( [
    admin
      .from( 'transactions' )
      .select( '*' )
      .eq( 'wallet_id', wallet.wallet_id )
      .order( 'created_at', { ascending: false } )
      .limit( 50 ),
    admin
      .from( 'payment_methods' )
      .select( '*' )
      .eq( 'user_id', userId )
      .order( 'is_default', { ascending: false } )
      .order( 'created_at', { ascending: false } ),
    getWalletSubscription( admin, userId ),
  ] );

  if ( transactionsError ) {throw new Error( transactionsError.message );}
  if ( paymentMethodsError ) {throw new Error( paymentMethodsError.message );}

  return {
    wallet,
    transactions: ( Array.isArray( transactions ) ? transactions : [] ) as WalletTransactionRow[],
    paymentMethods: ( Array.isArray( paymentMethods ) ? paymentMethods : [] ) as PaymentMethodRow[],
    subscription,
  };
}

export async function loadWalletPayload ( admin: ReturnType<typeof getAdminClient>, userId: string ) {
  const details = await loadWalletDetails( admin, userId );
  return buildWalletPayload(
    details.wallet,
    details.transactions,
    details.paymentMethods,
    details.subscription,
  );
}

export async function authenticateWalletRequest ( request: Request, requestedUserId: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth;}
  if ( !matchesAuthenticatedUser( auth, requestedUserId ) ) {
    return { error: json( { error: 'Wallet route is not authorized for this user.' }, 403 ) };
  }
  const role = resolveAccessRole( auth.canonicalUser.role );
  if ( !hasPermission( role, 'payments:read' ) && !hasPermission( role, 'payments:write' ) ) {
    return { error: json( { error: 'Insufficient permissions' }, 403 ) };
  }
  return auth;
}

export function toHex ( bytes: Uint8Array ): string {
  return Array.from( bytes ).map( byte => byte.toString( 16 ).padStart( 2, '0' ) ).join( '' );
}

export function fromHex ( value: string ): Uint8Array {
  const normalized = value.trim();
  if ( !/^[0-9a-f]+$/i.test( normalized ) || normalized.length % 2 !== 0 ) {
    return new Uint8Array();
  }
  const bytes = new Uint8Array( normalized.length / 2 );
  for ( let index = 0; index < normalized.length; index += 2 ) {
    bytes[ index / 2 ] = Number.parseInt( normalized.slice( index, index + 2 ), 16 );
  }
  return bytes;
}

export function timingSafeEqual ( left: Uint8Array, right: Uint8Array ): boolean {
  if ( left.length !== right.length ) {return false;}
  let diff = 0;
  for ( let index = 0; index < left.length; index += 1 ) {
    diff |= left[ index ] ^ right[ index ];
  }
  return diff === 0;
}

export async function hashLegacyWalletPin ( pin: string ): Promise<string> {
  const bytes = new TextEncoder().encode( `wasel-wallet-pin:${ pin }` );
  const digest = await crypto.subtle.digest( 'SHA-256', bytes );
  return toHex( new Uint8Array( digest as ArrayBuffer ) );
}

export async function hashWalletPin ( pin: string ): Promise<string> {
  const salt = crypto.getRandomValues( new Uint8Array( 16 ) );
  const iterations = 210_000;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode( `wasel-wallet-pin:${ pin }` ),
    'PBKDF2',
    false,
    [ 'deriveBits' ],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return `pbkdf2_sha256$${ iterations }$${ toHex( salt ) }$${ toHex( new Uint8Array( derivedBits ) ) }`;
}

export async function verifyWalletPinHash ( pin: string, storedHash?: string | null ): Promise<boolean> {
  if ( !storedHash ) {return false;}
  const parts = storedHash.split( '$' );
  if ( parts.length !== 4 || parts[ 0 ] !== 'pbkdf2_sha256' ) {
    const legacyHash = await hashLegacyWalletPin( pin );
    return timingSafeEqual( fromHex( storedHash ), fromHex( legacyHash ) );
  }

  const iterations = Number.parseInt( parts[ 1 ] ?? '', 10 );
  const salt = fromHex( parts[ 2 ] ?? '' );
  const expected = fromHex( parts[ 3 ] ?? '' );
  if ( !Number.isFinite( iterations ) || iterations < 100_000 || iterations > 1_000_000 || salt.length < 16 || expected.length !== 32 ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode( `wasel-wallet-pin:${ pin }` ),
    'PBKDF2',
    false,
    [ 'deriveBits' ],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, iterations },
    key,
    expected.length * 8,
  );
  return timingSafeEqual( new Uint8Array( derivedBits ), expected );
}

export async function resolveWalletRecipient ( admin: ReturnType<typeof getAdminClient>, recipientId: string ) {
  const recipient = recipientId.trim();
  if ( !recipient ) {return null;}

  // Validate recipient is either a UUID, a valid email, or a valid E.164 phone.
  // Reject anything that doesn't match to prevent injection via the filter value.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test( recipient );
  const isEmail = /^[^\s@]{1,64}@[^\s@]{1,255}$/.test( recipient );
  const isPhone = /^\+[1-9]\d{1,14}$/.test( recipient );

  if ( !isUuid && !isEmail && !isPhone ) {
    return null; // Reject unrecognised formats entirely
  }

  if ( isUuid ) {
    const byId = await admin.from( 'users' ).select( 'id' ).eq( 'id', recipient ).maybeSingle();
    if ( byId.data?.id ) {return String( byId.data.id );}
    const byAuthId = await admin.from( 'users' ).select( 'id' ).eq( 'auth_user_id', recipient ).maybeSingle();
    if ( byAuthId.error ) {throw new Error( byAuthId.error.message );}
    if ( byAuthId.data?.id ) {return String( byAuthId.data.id );}
  }

  if ( isEmail ) {
    const byEmail = await admin.from( 'users' ).select( 'id' ).eq( 'email', recipient ).maybeSingle();
    if ( byEmail.data?.id ) {return String( byEmail.data.id );}
  }

  if ( isPhone ) {
    // Only a phone number that completed OTP verification may receive transfers.
    // `users.phone_number` is written from the sign-up body before it is proven,
    // so an unverified claim on someone else's number must never capture money
    // sent to that number.
    const byPhone = await admin
      .from( 'users' )
      .select( 'id' )
      .eq( 'phone_number', recipient )
      .not( 'phone_verified_at', 'is', null )
      .maybeSingle();
    if ( byPhone.error ) {throw new Error( byPhone.error.message );}
    if ( byPhone.data?.id ) {return String( byPhone.data.id );}
  }

  return null;
}

export async function createPendingTopUpTransaction (
  admin: ReturnType<typeof getAdminClient>,
  walletId: string,
  amountJod: number,
  paymentMethod: string,
) {
  const { data, error } = await admin
    .from( 'transactions' )
    .insert( {
      wallet_id: walletId,
      amount: amountJod,
      transaction_type: 'add_funds',
      payment_method: mapWalletPaymentMethod( paymentMethod ),
      transaction_status: 'pending',
      direction: 'credit',
      reference_type: 'payment_session',
      metadata: {
        top_up_flow: 'hosted_checkout',
        requested_method: paymentMethod,
      },
    } )
    .select( 'transaction_id, metadata' )
    .single();

  if ( error ) {
    throw new Error( error.message );
  }

  return {
    transactionId: String( data.transaction_id ),
    metadata: data.metadata ?? {},
  };
}

export async function updateTopUpTransactionMetadata (
  admin: ReturnType<typeof getAdminClient>,
  transactionId: string,
  metadataPatch: Record<string, unknown>,
) {
  const { data: existing } = await admin
    .from( 'transactions' )
    .select( 'metadata' )
    .eq( 'transaction_id', transactionId )
    .maybeSingle();

  const mergedMetadata = {
    ...( ( existing?.metadata && typeof existing.metadata === 'object' ) ? existing.metadata : {} ),
    ...metadataPatch,
  };

  const { error } = await admin
    .from( 'transactions' )
    .update( {
      metadata: mergedMetadata,
      updated_at: new Date().toISOString(),
    } )
    .eq( 'transaction_id', transactionId );

  if ( error ) {
    throw new Error( error.message );
  }
}

// eslint-disable-next-line max-params
export async function markTopUpTransactionFailed (
  admin: ReturnType<typeof getAdminClient>,
  transactionId: string,
  externalReference: string | null,
  provider: string,
  reason: string,
  providerPayload: unknown,
) {
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from( 'transactions' )
    .select( 'metadata, transaction_status' )
    .eq( 'transaction_id', transactionId )
    .maybeSingle();

  if ( !existing || existing.transaction_status === 'posted' ) {
    return;
  }

  const metadata = {
    ...( ( existing.metadata && typeof existing.metadata === 'object' ) ? existing.metadata : {} ),
    provider,
    failure_reason: reason,
    provider_payload: providerPayload,
  };

  const { error } = await admin
    .from( 'transactions' )
    .update( {
      transaction_status: 'failed',
      reference_id: externalReference,
      metadata,
      updated_at: now,
    } )
    .eq( 'transaction_id', transactionId )
    .neq( 'transaction_status', 'posted' );

  if ( error ) {
    throw new Error( error.message );
  }
}

interface FinalizeTopUpOptions {
  transactionId: string;
  externalReference: string;
  providerPayload: unknown;
  provider?: string;
  expected?: { amountJod?: number | null; currency?: string | null };
}

export async function finalizeTopUpTransaction ( opts: FinalizeTopUpOptions ) {
  const { transactionId, externalReference, providerPayload, provider = 'stripe', expected } = opts;
  const admin = getAdminClient();

  // The credit is applied inside a single service-role-only database function so
  // the wallet update and the 'posted' transition commit together, and the edge
  // no longer needs a direct Postgres connection (which bypassed the pooler).
  const { data, error } = await admin.rpc( 'app_finalize_wallet_top_up', {
    p_transaction_id: transactionId,
    p_external_reference: externalReference,
    p_provider: provider,
    p_provider_payload: providerPayload ?? {},
    p_expected_amount: expected?.amountJod ?? null,
    p_expected_currency: expected?.currency ?? null,
  } );

  if ( error ) {throw new Error( error.message );}

  const result = ( data && typeof data === 'object' ? data : {} ) as { applied?: boolean; reason?: string };
  const applied = result.applied === true;

  if ( !applied && ( result.reason === 'amount_mismatch' || result.reason === 'amount_unverified' ) ) {
    console.error( '[wallet] top-up amount/currency mismatch, wallet not credited', {
      transactionId, provider, reason: result.reason,
      paidAmount: expected?.amountJod ?? null,
      currency: String( expected?.currency ?? '' ).trim() || null,
    } );
  }

  return result.reason ? { applied, reason: result.reason } : { applied };
}

/**
 * Shape returned by every checkout-session creator.
 *
 * `id`/`url` are the provider-native fields the webhook handlers and the Stripe
 * audit trail store; `sessionId`/`checkoutUrl` are the platform names the wallet
 * API serialises. Returning both keeps a single call site working whether it
 * persists a raw provider reference or renders a redirect.
 */
export interface CheckoutSession {
  id: string;
  url: string | null;
  sessionId: string;
  checkoutUrl: string;
}

export async function createStripeCheckoutSession ( input: {
  amountJod: number;
  paymentMethod: string;
  transactionId: string;
  canonicalUserId: string;
  walletId: string;
  request: Request;
} ): Promise<CheckoutSession> {
  const customerId = await ensureStripeCustomer( { admin: getAdminClient(), canonicalUser: { id: input.canonicalUserId } } );
  const appUrl = getAppBaseUrl( input.request );
  const params = new URLSearchParams();
  params.append( 'payment_method_types[]', 'card' );
  params.append( 'mode', 'payment' );
  params.append( 'customer', customerId );
  params.append( 'line_items[0][price_data][currency]', 'jod' );
  params.append( 'line_items[0][price_data][unit_amount]', toStripeMinorAmount( input.amountJod ) );
  params.append( 'line_items[0][price_data][product_data][name]', 'Wasel Wallet Top-up' );
  params.append( 'line_items[0][quantity]', '1' );
  params.append( 'success_url', `${ appUrl }/app/wallet?topup=success&tx=${ input.transactionId }` );
  params.append( 'cancel_url', `${ appUrl }/app/wallet?topup=cancelled` );
  params.append( 'metadata[transaction_id]', input.transactionId );
  params.append( 'metadata[wallet_id]', input.walletId );
  params.append( 'metadata[user_id]', input.canonicalUserId );
  const session = await stripeApiRequest( '/v1/checkout/sessions', { method: 'POST', params } );
  return {
    id: String( session.id ),
    url: session.url ? String( session.url ) : null,
    sessionId: String( session.id ),
    checkoutUrl: String( session.url ),
  };
}

export async function createStripeSubscriptionCheckoutSession ( input: {
  admin: ReturnType<typeof getAdminClient>;
  canonicalUser: { id: string; email?: string | null; full_name?: string | null; phone_number?: string | null };
  planName: string;
  request: Request;
} ): Promise<CheckoutSession> {
  const priceId = STRIPE_WASEL_PLUS_PRICE_ID;
  if ( !priceId ) {throw new Error( 'STRIPE_WASEL_PLUS_PRICE_ID is not configured' );}
  const customerId = await ensureStripeCustomer( input );
  const appUrl = getAppBaseUrl( input.request );
  const params = new URLSearchParams();
  params.append( 'mode', 'subscription' );
  params.append( 'customer', customerId );
  params.append( 'line_items[0][price]', priceId );
  params.append( 'line_items[0][quantity]', '1' );
  params.append( 'success_url', `${ appUrl }/app/wallet?subscription=success` );
  params.append( 'cancel_url', `${ appUrl }/app/wallet?subscription=cancelled` );
  params.append( 'metadata[user_id]', input.canonicalUser.id );
  params.append( 'metadata[plan]', input.planName );
  const session = await stripeApiRequest( '/v1/checkout/sessions', { method: 'POST', params } );
  return {
    id: String( session.id ),
    url: session.url ? String( session.url ) : null,
    sessionId: String( session.id ),
    checkoutUrl: String( session.url ),
  };
}

export function createCliqCheckoutSession ( input: {
  transactionId: string;
  amountJod: number;
  currency: string;
  request: Request;
} ): Promise<CheckoutSession & { providerReference: string | null }> {
  if ( !CLIQ_CHECKOUT_URL_TEMPLATE || !CLIQ_MERCHANT_ID ) {
    return Promise.reject( new Error( 'CliQ checkout is not configured' ) );
  }
  const appUrl = getAppBaseUrl( input.request );
  const checkoutUrl = buildCliqCheckoutUrl( CLIQ_CHECKOUT_URL_TEMPLATE, {
    transactionId: input.transactionId,
    amount: input.amountJod.toFixed( 3 ),
    currency: input.currency,
    returnUrl: `${ appUrl }/app/wallet?topup=success&tx=${ input.transactionId }`,
    merchantId: CLIQ_MERCHANT_ID,
  } );
  return Promise.resolve( {
    id: input.transactionId,
    url: checkoutUrl,
    sessionId: input.transactionId,
    checkoutUrl,
    providerReference: input.transactionId,
  } );
}

export function constantTimeEquals ( left: string, right: string ): boolean {
  if ( left.length !== right.length ) {return false;}
  let mismatch = 0;
  for ( let index = 0; index < left.length; index += 1 ) {
    mismatch |= left.charCodeAt( index ) ^ right.charCodeAt( index );
  }
  return mismatch === 0;
}

export function computeStripeSignature ( secret: string, payload: string, timestamp: string ): Promise<string> {
  return computeHmacHex( secret, `${ timestamp }.${ payload }` );
}

export async function computeHmacHex ( secret: string, payload: string ): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode( secret ),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [ 'sign' ],
  );
  const signature = await crypto.subtle.sign( 'HMAC', key, encoder.encode( payload ) );
  return Array.from( new Uint8Array( signature ) )
    .map( ( value ) => value.toString( 16 ).padStart( 2, '0' ) )
    .join( '' );
}

export async function verifyStripeWebhookSignature ( payload: string, signatureHeader: string | null ): Promise<boolean> {
  if ( !STRIPE_WEBHOOK_SECRET || !signatureHeader ) {
    return false;
  }

  const parts = signatureHeader.split( ',' ).map( ( segment ) => segment.trim() );
  const timestamp = parts.find( ( segment ) => segment.startsWith( 't=' ) )?.slice( 2 ) ?? '';
  const candidates = parts
    .filter( ( segment ) => segment.startsWith( 'v1=' ) )
    .map( ( segment ) => segment.slice( 3 ) )
    .filter( Boolean );

  if ( !timestamp || candidates.length === 0 ) {
    return false;
  }

  const nowSeconds = Math.floor( Date.now() / 1000 );
  const timestampSeconds = Number( timestamp );
  if ( !Number.isFinite( timestampSeconds ) || Math.abs( nowSeconds - timestampSeconds ) > 300 ) {
    return false;
  }

  const expected = await computeStripeSignature( STRIPE_WEBHOOK_SECRET, payload, timestamp );
  return candidates.some( ( candidate ) => constantTimeEquals( candidate, expected ) );
}

export function normalizeSignatureHeader ( value: string | null ): string {
  if ( !value ) {return '';}
  const trimmed = value.trim();
  if ( trimmed.includes( '=' ) ) {
    return trimmed.split( /[,\s]+/ )
      .map( ( segment ) => segment.trim() )
      .find( ( segment ) => segment.startsWith( 'v1=' ) || segment.startsWith( 'sha256=' ) )
      ?.replace( /^(v1|sha256)=/, '' ) ?? '';
  }
  return trimmed.replace( /^sha256=/, '' );
}

export async function verifyProviderWebhookSignature ( args: {
  payload: string;
  secret: string;
  signature: string | null;
  timestamp?: string | null;
} ): Promise<boolean> {
  const normalized = normalizeSignatureHeader( args.signature );
  if ( !normalized ) {return false;}
  const payload = args.timestamp ? `${ args.timestamp }.${ args.payload }` : args.payload;
  const expected = await computeHmacHex( args.secret, payload );
  return constantTimeEquals( normalized, expected );
}

// eslint-disable-next-line complexity
export async function sendDelivery (
  admin: ReturnType<typeof getAdminClient>,
  delivery: CommunicationDeliveryRecord,
  functionBaseUrl: string,
) {
  const now = new Date().toISOString();
  const env = { ...deliveryEnv, functionBaseUrl };
  const attemptsCount = ( delivery.attempts_count ?? 0 ) + 1;

  // Atomic claim: the status filter makes the UPDATE a compare-and-set, so when
  // two workers (cron + a manual /communications/process, or overlapping runs)
  // pick up the same row only the one that flips queued -> processing sends it.
  // Previously both sent, and the customer got a duplicate SMS/email.
  const { data: claimed, error: claimError } = await admin
    .from( 'communication_deliveries' )
    .update( {
      delivery_status: 'processing',
      attempts_count: attemptsCount,
      last_attempt_at: now,
      locked_at: now,
      processed_by: 'edge:communications-process',
      updated_at: now,
    } )
    .eq( 'delivery_id', delivery.delivery_id )
    .eq( 'delivery_status', 'queued' )
    .select( 'delivery_id' );

  if ( claimError ) {
    return { ok: false, skipped: false, error: claimError.message };
  }
  if ( !claimed || claimed.length === 0 ) {
    return { ok: false, skipped: true, error: 'already_claimed' };
  }

  try {
    let response: Response;
    if ( delivery.channel === 'email' ) {
      const request = env.resendApiKey && env.resendFromEmail
        ? buildResendPayload( delivery, env )
        : buildSendgridPayload( delivery, env );
      response = await fetch( request.url, request.init );
    } else if ( delivery.channel === 'sms' || delivery.channel === 'whatsapp' ) {
      const request = buildTwilioRequest( delivery, env );
      response = await fetch( request.url, request.init );
    } else {
      throw new Error( `Unsupported delivery channel: ${ delivery.channel }` );
    }

    const responseBody = await response.json().catch( () => ( {} ) );
    if ( !response.ok ) {
      throw new Error(
        typeof responseBody?.message === 'string'
          ? responseBody.message
          : typeof responseBody?.error === 'string'
            ? responseBody.error
            : `Provider returned HTTP ${ response.status }`,
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
      .from( 'communication_deliveries' )
      .update( {
        delivery_status: 'sent',
        sent_at: now,
        locked_at: null,
        next_attempt_at: null,
        error_message: null,
        external_reference: externalReference,
        provider_name:
          delivery.channel === 'email'
            ? ( env.resendApiKey && env.resendFromEmail ? 'resend' : 'sendgrid' )
            : determineProviderName( String( delivery.channel ) ),
        provider_response: responseBody,
        updated_at: now,
      } )
      .eq( 'delivery_id', delivery.delivery_id );

    return { ok: true };
  } catch ( error ) {
    const errorMessage = error instanceof Error ? error.message : String( error );
    const patch = buildFailurePatch( {
      attemptsCount,
      errorMessage,
      maxAttempts: deliveryEnv.maxDeliveryAttempts,
    } );

    await admin
      .from( 'communication_deliveries' )
      .update( {
        ...patch,
        provider_name:
          delivery.channel === 'email'
            ? ( env.resendApiKey && env.resendFromEmail ? 'resend' : 'sendgrid' )
            : determineProviderName( String( delivery.channel ) ),
        processed_by: 'edge:communications-process',
        updated_at: new Date().toISOString(),
      } )
      .eq( 'delivery_id', delivery.delivery_id );

    return { ok: false, error: errorMessage };
  }
}

export async function processQueuedDeliveries (
  admin: ReturnType<typeof getAdminClient>,
  functionBaseUrl: string,
) {
  const now = new Date().toISOString();

  // A worker that crashed after claiming a row (isolate killed mid-send) used to
  // leave it in 'processing' forever. Rows locked for more than 10 minutes go
  // back to the queue; at-least-once beats silently lost.
  const staleBefore = new Date( Date.now() - 10 * 60 * 1000 ).toISOString();
  const { error: reclaimError } = await admin
    .from( 'communication_deliveries' )
    .update( { delivery_status: 'queued', locked_at: null, updated_at: now } )
    .eq( 'delivery_status', 'processing' )
    .lt( 'locked_at', staleBefore );
  if ( reclaimError ) {
    console.error( '[communications] stale-lock reclaim failed', reclaimError.message );
  }

  // The due-time filter belongs in the query: filtering after `limit( 25 )` let 25
  // rows that were all backing off starve every deliverable row behind them.
  const { data, error } = await admin
    .from( 'communication_deliveries' )
    .select( '*' )
    .eq( 'delivery_status', 'queued' )
    .or( `next_attempt_at.is.null,next_attempt_at.lte.${ now }` )
    .order( 'queued_at', { ascending: true } )
    .limit( 25 );

  if ( error ) {
    throw new Error( error.message );
  }

  const dueDeliveries = ( Array.isArray( data ) ? data : [] ).filter( ( delivery ) => (
    !delivery.next_attempt_at || new Date( delivery.next_attempt_at ).getTime() <= new Date( now ).getTime()
  ) ) as CommunicationDeliveryRecord[];

  let sent = 0;
  let failed = 0;
  let claimedElsewhere = 0;
  for ( const delivery of dueDeliveries ) {
    const result = await sendDelivery( admin, delivery, functionBaseUrl );
    if ( result.ok ) {sent += 1;}
    else if ( 'skipped' in result && result.skipped ) {claimedElsewhere += 1;}
    else {failed += 1;}
  }

  return {
    processed: dueDeliveries.length - claimedElsewhere,
    sent,
    failed,
    skipped: ( Array.isArray( data ) ? data.length : 0 ) - dueDeliveries.length + claimedElsewhere,
  };
}

export function normalizePaymentAmount ( value: unknown ): number | null {
  if ( typeof value !== 'number' || !Number.isFinite( value ) ) {return null;}
  const amount = Math.round( value );
  if ( amount < 50 || amount > MAX_PAYMENT_AMOUNT_MINOR ) {return null;}
  return amount;
}

export async function assertTripParticipant ( admin: ReturnType<typeof getAdminClient>, tripId: string, userId: string ): Promise<boolean> {
  // tripId comes from the URL. Without this UUID guard a crafted value
  // (e.g. `x,driver_id.eq.<my-id>`) injects extra PostgREST filter clauses
  // and can make the participant check pass for a trip the caller is not on.
  if ( !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test( tripId ) ) {
    return false;
  }

  // Run passenger and trip lookups in parallel.
  // bookings.passenger_id references users.id (not drivers.driver_id).
  const [ { data: trip, error: tripError }, { data: booking, error: bookingError } ] = await Promise.all( [
    admin
      .from( 'trips' )
      .select( 'trip_id, driver_id' )
      .eq( 'trip_id', tripId )
      .maybeSingle(),
    admin
      .from( 'bookings' )
      .select( 'booking_id' )
      .eq( 'trip_id', tripId )
      .eq( 'passenger_id', userId )
      .limit( 1 )
      .maybeSingle(),
  ] );

  if ( tripError ) {throw tripError;}
  if ( bookingError ) {throw bookingError;}

  // Fast path: caller is a confirmed passenger.
  if ( booking ) {return true;}

  // Driver path: trips.driver_id references drivers.driver_id, not users.id.
  // Resolve the indirection via the drivers table.
  if ( !trip?.driver_id ) {return false;}

  const { data: driver, error: driverError } = await admin
    .from( 'drivers' )
    .select( 'user_id' )
    .eq( 'driver_id', trip.driver_id )
    .maybeSingle();

  if ( driverError ) {throw driverError;}
  return driver?.user_id === userId;
}

export function cityCoord ( city: string | null | undefined ) {
  const coords: Record<string, { lat: number; lng: number }> = {
    amman: { lat: 31.9454, lng: 35.9284 },
    aqaba: { lat: 29.5321, lng: 35.006 },
    irbid: { lat: 32.5568, lng: 35.8479 },
    zarqa: { lat: 32.0728, lng: 36.088 },
  };
  return coords[ String( city ?? '' ).toLowerCase() ] ?? coords.amman;
}

// ── Provider webhook signature verification ───────────────────────────────────────────────────────
// Replaces URL-token-only authentication for Resend and Twilio delivery
// receipts. The token-in-URL pattern is replayable, gets logged by proxies/CDNs,
// and was previously leaked from this repo (see docs/SECURITY.md â†’ rotate
// `COMMUNICATION_WEBHOOK_TOKEN`).

function bytesToBase64 ( bytes: Uint8Array ): string {
  return btoa( String.fromCharCode( ...Array.from( bytes ) ) );
}

async function computeHmacBase64 ( secret: string, payload: string, algorithm: 'SHA-1' | 'SHA-256' ): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode( secret ),
    { name: 'HMAC', hash: algorithm },
    false,
    [ 'sign' ],
  );
  const signature = await crypto.subtle.sign( 'HMAC', key, new TextEncoder().encode( payload ) );
  return bytesToBase64( new Uint8Array( signature ) );
}

// Parses a `t=<ts>,v1=<hex>` style header (Stripe/Resend/Standard-Webhooks).
 
function _parseTimestampedSignature ( header: string ): { timestamp: string; candidates: string[] } | null {
  if ( !header ) {return null;}
  const segments = header.split( ',' ).map( ( segment ) => segment.trim() ).filter( Boolean );
  const timestamp = segments.find( ( segment ) => segment.startsWith( 't=' ) )?.slice( 2 ) ?? '';
  const candidates = segments.filter( ( segment ) => segment.startsWith( 'v1=' ) ).map( ( segment ) => segment.slice( 3 ) );
  if ( !timestamp || candidates.length === 0 ) {return null;}
  return { timestamp, candidates };
}

// Resend uses Standard Webhooks headers and payload signing (the Svix format):
// HMAC-SHA256 over `<webhook-id>.<timestamp>.<raw_body>` with a base64-decoded
// `whsec_` secret. Keep the raw body intact and enforce a short replay window.
export async function verifyResendWebhookSignature (
  payload: string,
  headers: Headers,
  secret = RESEND_WEBHOOK_SIGNING_SECRET,
): Promise<boolean> {
  if ( !secret ) {return false;}

  const id = headers.get( 'svix-id' ) ?? '';
  const timestamp = headers.get( 'svix-timestamp' ) ?? '';
  const signatures = headers.get( 'svix-signature' ) ?? '';
  if ( !id || !timestamp || !signatures ) {return false;}

  const issuedAt = Number( timestamp );
  if ( !Number.isFinite( issuedAt ) || Math.abs( Date.now() / 1000 - issuedAt ) > 300 ) {return false;}

  let keyBytes: Uint8Array<ArrayBuffer>;
  try {
    const encodedSecret = secret.startsWith( 'whsec_' ) ? secret.slice( 6 ) : secret;
    const decodedSecret = atob( encodedSecret );
    keyBytes = new Uint8Array( decodedSecret.length );
    for ( let index = 0; index < decodedSecret.length; index += 1 ) {
      keyBytes[index] = decodedSecret.charCodeAt( index );
    }
  } catch {
    return false;
  }

  let expected: string;
  try {
    const key = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, [ 'sign' ],
    );
    const signature = await crypto.subtle.sign(
      'HMAC', key, new TextEncoder().encode( `${ id }.${ timestamp }.${ payload }` ),
    );
    expected = bytesToBase64( new Uint8Array( signature ) );
  } catch {
    return false;
  }

  return signatures.split( /\s+/ ).some( ( candidate ) => {
    const separator = candidate.indexOf( ',' );
    return separator > 0 && candidate.slice( 0, separator ) === 'v1' &&
      constantTimeEquals( candidate.slice( separator + 1 ), expected );
  } );
}

// Twilio signs webhooks with HMAC-SHA1 over `<url><form_body>` using the account
// Auth Token (or an app-specific signing secret) and sends the base64 digest in
// `X-Twilio-Signature`.
export async function _verifyTwilioWebhookSignature (
  payload: string,
  signatureHeader: string | null,
  requestUrl: string,
): Promise<boolean> {
  const secret = TWILIO_WEBHOOK_SIGNING_SECRET || deliveryEnv.twilioAuthToken;
  if ( !secret || !signatureHeader || !requestUrl ) {return false;}
  const expected = await computeHmacBase64( secret, `${ requestUrl }${ payload }`, 'SHA-1' );
  return constantTimeEquals( expected, signatureHeader.trim() );
}

export interface BookingPaymentResult {
  applied: boolean;
  reason: string;
  bookingId: string | null;
}

// Idempotent server-side completion of a booking card payment from a
// `payment_intent.succeeded` event. The PaymentIntent was bound to the booking
// at creation time via bookings.stripe_payment_intent_id, so that binding is the
// ownership check. The paid amount and currency are reconciled against the
// booking's fare before any state is written, and the status update is guarded
// to non-terminal rows so a retried/duplicate webhook cannot double-credit.
export async function finalizeBookingPayment ( args: {
  admin: AdminClient;
  intentId: string;
  _paidAmount: number;
  currency: string;
} ): Promise<BookingPaymentResult> {
  const { admin, intentId, _paidAmount, currency: paidCurrency } = args;
  const currencyLower = String( paidCurrency ?? '' ).toLowerCase();

  const { data: booking, error: loadError } = await admin
    .from( 'bookings' )
    .select( '*' )
    .eq( 'stripe_payment_intent_id', intentId )
    .maybeSingle();

  if ( loadError ) {
    return { applied: false, reason: 'booking_lookup_failed', bookingId: null };
  }
  if ( !booking ) {
    return { applied: false, reason: 'payment_intent_not_bound_to_booking', bookingId: null };
  }

  const row = booking as Record<string, unknown>;
  // bookings PK is booking_id (not id) in the production schema.
  const bookingId = String( row.booking_id ?? '' );
  const expectedCurrency = String( row.currency ?? 'jod' ).toLowerCase();
  // Must mirror deriveBookingAmountMinor() in payments.ts exactly: the intent is
  // created for per-seat price x seats when both are present, so the success
  // webhook has to reconcile against the same figure or a legitimately charged
  // booking is rejected as an amount mismatch and never marked paid.
  const perSeat = toNumber( row.price_per_seat ?? 0, 2 );
  const seats = toNumber( row.seats_requested ?? 0, 0 );
  const major = perSeat > 0 && seats > 0
    ? perSeat * seats
    : toNumber( row.total_price ?? row.amount ?? row.fare ?? 0, 2 );
  const expectedMinor = toStripeMinorUnits( major, expectedCurrency );
  if ( expectedMinor === null ) {
    console.warn( '[payments] payment_intent.succeeded for a currency card payments do not support', {
      intentId,
      bookingId,
      expectedCurrency,
    } );
    return { applied: false, reason: 'unsupported_currency', bookingId };
  }

  if ( currencyLower && currencyLower !== expectedCurrency ) {
    console.warn( '[payments] payment_intent.succeeded currency mismatch', { intentId, bookingId, paidCurrency: currencyLower, expectedCurrency } );
    return { applied: false, reason: 'currency_mismatch', bookingId };
  }
  if ( args._paidAmount !== expectedMinor ) {
    // A mismatched amount is a red flag (a different charge succeeded for this
    // binding). Refuse to credit the booking and leave the provider payload for
    // investigation.
    console.warn( '[payments] payment_intent.succeeded amount mismatch', {
      intentId,
      bookingId,
      paidAmount: args._paidAmount,
      expectedAmount: expectedMinor,
    } );
    return { applied: false, reason: 'amount_mismatch', bookingId };
  }

  const now = new Date().toISOString();
  // Idempotent: only a non-terminal booking advances to 'succeeded'. A retried
  // or duplicated webhook therefore cannot double-credit. 'succeeded' and
  // 'refunded' are excluded so an already-settled booking is never re-opened.
  const { data: updated, error: updateError } = await admin
    .from( 'bookings' )
    .update( { payment_status: 'succeeded', updated_at: now } )
    .eq( 'booking_id', bookingId )
    // 'partially_refunded' is deliberately absent: it is a post-settlement state, so a
    // replayed or late `payment_intent.succeeded` must never move a refunded booking
    // back to 'succeeded' and hide the refund.
    .in( 'payment_status', [ 'pending', 'failed', 'paid', 'completed', 'processing' ] )
    .select( 'booking_id' )
    .maybeSingle();

  if ( updateError ) {
    throw updateError;
  }

  const applied = Boolean( updated );
  return { applied, reason: applied ? 'finalized' : 'already_settled', bookingId };
}

export interface BookingRefundResult {
  applied: boolean;
  reason: string;
  bookingId: string | null;
  status: 'refunded' | 'partially_refunded' | null;
}

// Reflects a Stripe refund on the booking it paid for, from a `charge.refunded` event.
// This is what keeps the booking honest when a refund is issued outside our own
// refund endpoint (Stripe dashboard, a dispute resolution, an automatic refund).
//
// `amountRefunded` is cumulative, and events can arrive out of order, so the status
// only ever moves forward: succeeded -> partially_refunded -> refunded. A late event
// carrying a smaller cumulative figure can therefore never move a booking backwards.
// Database errors throw so the event is recorded as failed and Stripe retries it.
export async function applyStripeRefundToBooking ( args: {
  admin: AdminClient;
  intentId: string;
  chargeAmount: number;
  amountRefunded: number;
} ): Promise<BookingRefundResult> {
  const { admin, intentId, chargeAmount, amountRefunded } = args;

  const { data: booking, error: loadError } = await admin
    .from( 'bookings' )
    .select( 'booking_id, payment_status' )
    .eq( 'stripe_payment_intent_id', intentId )
    .maybeSingle();
  if ( loadError ) {
    throw new Error( `refund booking lookup failed: ${ loadError.message }` );
  }
  if ( !booking ) {
    // Not a booking payment (for example a wallet top-up). Nothing to update here.
    console.warn( '[payments] charge.refunded for a payment intent not bound to a booking', { intentId, amountRefunded } );
    return { applied: false, reason: 'payment_intent_not_bound_to_booking', bookingId: null, status: null };
  }

  const bookingId = String( ( booking as Record<string, unknown> ).booking_id ?? '' );
  const fullyRefunded = chargeAmount > 0 && amountRefunded >= chargeAmount;
  const target = fullyRefunded ? 'refunded' : 'partially_refunded';
  const allowedFrom = fullyRefunded
    ? [ 'succeeded', 'completed', 'paid', 'partially_refunded' ]
    : [ 'succeeded', 'completed', 'paid' ];

  const { data: updated, error: updateError } = await admin
    .from( 'bookings' )
    .update( { payment_status: target, updated_at: new Date().toISOString() } )
    .eq( 'booking_id', bookingId )
    .in( 'payment_status', allowedFrom )
    .select( 'booking_id' )
    .maybeSingle();
  if ( updateError ) {
    throw new Error( `refund booking update failed: ${ updateError.message }` );
  }

  const applied = Boolean( updated );
  return { applied, reason: applied ? 'applied' : 'already_reflected', bookingId, status: target };
}

export interface DisputeRecordResult {
  result: 'inserted' | 'updated' | 'stale' | 'ignored';
  disputeId: string | null;
  bookingId: string | null;
}

// Records a Stripe dispute (chargeback) in public.payment_disputes. Dispute events
// are alertable: money is being pulled back and evidence has a deadline, so a newly
// opened dispute is logged at error level for the platform's log-based alerting.
export async function recordStripeDispute ( args: {
  admin: AdminClient;
  dispute: Record<string, unknown>;
  eventId: string;
  eventCreatedAt: string;
  livemode: boolean;
  eventType: string;
} ): Promise<DisputeRecordResult> {
  const { admin, dispute, eventId, eventCreatedAt, livemode, eventType } = args;
  const disputeId = String( dispute.id ?? '' ).trim();
  if ( !disputeId ) {
    return { result: 'ignored', disputeId: null, bookingId: null };
  }

  const intentId = String( dispute.payment_intent ?? '' ).trim();
  let bookingId: string | null = null;
  if ( intentId.startsWith( 'pi_' ) ) {
    const { data: booking, error: lookupError } = await admin
      .from( 'bookings' )
      .select( 'booking_id' )
      .eq( 'stripe_payment_intent_id', intentId )
      .maybeSingle();
    if ( lookupError ) {
      throw new Error( `dispute booking lookup failed: ${ lookupError.message }` );
    }
    bookingId = booking ? String( ( booking as Record<string, unknown> ).booking_id ?? '' ) || null : null;
  }

  const dueBy = Number( ( dispute.evidence_details as Record<string, unknown> | undefined )?.due_by );
  const amountMinor = Number( dispute.amount ?? 0 );
  const currency = String( dispute.currency ?? '' ).trim().toLowerCase();
  if ( !Number.isFinite( amountMinor ) || amountMinor < 0 || currency.length !== 3 ) {
    throw new Error( `dispute ${ disputeId } has an invalid amount or currency` );
  }

  const { data, error } = await admin.rpc( 'app_record_stripe_dispute', {
    p_dispute_id: disputeId,
    p_charge_id: String( dispute.charge ?? '' ) || null,
    p_payment_intent_id: intentId || null,
    p_booking_id: bookingId,
    p_amount_minor: Math.round( amountMinor ),
    p_currency: currency,
    p_reason: String( dispute.reason ?? '' ) || null,
    p_status: String( dispute.status ?? 'unknown' ),
    p_evidence_due_by: Number.isFinite( dueBy ) && dueBy > 0 ? new Date( dueBy * 1000 ).toISOString() : null,
    p_livemode: livemode,
    p_event_id: eventId,
    p_event_created_at: eventCreatedAt,
  } );
  if ( error ) {
    throw new Error( `dispute record failed: ${ error.message }` );
  }

  const result = data === 'inserted' || data === 'updated' || data === 'stale' ? data : null;
  if ( !result ) {
    throw new Error( `unexpected dispute ledger response: ${ String( data ) }` );
  }

  if ( result === 'inserted' && eventType === 'charge.dispute.created' ) {
    console.error( '[payments] DISPUTE OPENED: evidence is due before the deadline', {
      disputeId,
      bookingId,
      paymentIntent: intentId || null,
      amountMinor,
      currency,
      reason: String( dispute.reason ?? '' ) || null,
      evidenceDueBy: Number.isFinite( dueBy ) && dueBy > 0 ? new Date( dueBy * 1000 ).toISOString() : null,
    } );
  }

  return { result, disputeId, bookingId };
}

export type TopUpRefundOutcome =
  | 'reversed'
  | 'reversed_with_shortfall'
  | 'already_applied'
  | 'not_a_topup'
  | 'ignored_currency';

// Takes back the wallet credit of a top-up whose card payment Stripe has refunded.
// Wallet top-ups are JOD only, so a refund in any other currency cannot belong to one.
// `amountRefundedMinor` is Stripe's cumulative figure in fils; the database function
// applies only the difference from what was already reversed, so redelivery is safe.
// Money the wallet no longer holds is recorded as a shortfall and raised for finance
// instead of driving the balance negative. Errors throw so Stripe retries the event.
export async function reverseStripeTopUpRefund ( args: {
  admin: AdminClient;
  intentId: string;
  chargeId: string;
  amountRefundedMinor: number;
  currency: string;
  eventId: string;
} ): Promise<{ outcome: TopUpRefundOutcome }> {
  const { admin, intentId, chargeId, amountRefundedMinor, currency, eventId } = args;
  if ( String( currency ?? '' ).trim().toLowerCase() !== 'jod' ) {
    return { outcome: 'ignored_currency' };
  }

  const { data, error } = await admin.rpc( 'app_reverse_stripe_topup_refund', {
    p_payment_intent_id: intentId,
    p_charge_id: chargeId || null,
    p_amount_refunded_jod: amountRefundedMinor / 1000,
    p_event_id: eventId || null,
  } );
  if ( error ) {
    throw new Error( `top-up refund reversal failed: ${ error.message }` );
  }

  const outcome = data === 'reversed' || data === 'reversed_with_shortfall' || data === 'already_applied' || data === 'not_a_topup'
    ? data
    : null;
  if ( !outcome ) {
    throw new Error( `unexpected top-up reversal response: ${ String( data ) }` );
  }

  if ( outcome === 'reversed_with_shortfall' ) {
    console.error( '[wallet] TOP-UP REFUND SHORTFALL: the customer was refunded but the wallet no longer holds the full credit', {
      intentId,
      chargeId: chargeId || null,
      eventId,
      amountRefundedJod: amountRefundedMinor / 1000,
    } );
  }

  return { outcome };
}


