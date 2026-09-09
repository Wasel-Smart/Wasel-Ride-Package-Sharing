
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';
import Stripe from 'https://esm.sh/stripe@12.12.0?target=deno';
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
import {
  buildPublicHealthPayload,
  isRuntimeAdminEnabled,
  resolveAllowedOrigin,
} from './_shared/request-security.ts';
import {
  advanceCorridorAfterBooking,
  buildMobilitySnapshot,
  MOBILITY_OS_SEED_SQL,
  EVENT_OUTBOX_SQL,
  type MobilityBookingType,
  type MobilityCorridorRow,
} from './_shared/mobility-os-runtime.ts';
import { calculateDirectPrice, toNumber } from './_shared/pricing.ts';
import { normalizePhoneNumber, isValidE164Phone } from './_shared/phone.ts';
import {
  AccessRole,
  AccessPermission,
  hasPermission,
  resolveAccessRole,
} from './_shared/rbac.ts';

export const SUPABASE_URL = Deno.env.get( 'SUPABASE_URL' ) ?? '';
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get( 'SUPABASE_SERVICE_ROLE_KEY' ) ?? '';
export const SUPABASE_DB_URL = Deno.env.get( 'SUPABASE_DB_URL' ) ?? '';
export const STRIPE_SECRET_KEY = Deno.env.get( 'STRIPE_SECRET_KEY' ) ?? '';
export const stripe = STRIPE_SECRET_KEY ? new Stripe( STRIPE_SECRET_KEY, { apiVersion: '2024-11-20' } ) : null;
export const STRIPE_WEBHOOK_SECRET = Deno.env.get( 'STRIPE_WEBHOOK_SECRET' ) ?? '';
export const STRIPE_API_VERSION = Deno.env.get( 'STRIPE_API_VERSION' ) ?? '2026-02-25.clover';
export const TWILIO_VERIFY_SERVICE_SID = Deno.env.get( 'TWILIO_VERIFY_SERVICE_SID' ) ?? '';
export const APP_BASE_URL = ( Deno.env.get( 'APP_BASE_URL' ) ?? 'https://wasel14.online' ).replace( /\/$/, '' );
export const CLIQ_API_BASE_URL = ( Deno.env.get( 'CLIQ_API_BASE_URL' ) ?? Deno.env.get( 'JOPACC_API_BASE_URL' ) ?? '' ).replace( /\/$/, '' );
export const CLIQ_MERCHANT_ID = Deno.env.get( 'CLIQ_MERCHANT_ID' ) ?? Deno.env.get( 'JOPACC_MERCHANT_ID' ) ?? '';
export const CLIQ_API_KEY = Deno.env.get( 'CLIQ_API_KEY' ) ?? Deno.env.get( 'JOPACC_API_KEY' ) ?? '';
export const CLIQ_WEBHOOK_SECRET = Deno.env.get( 'CLIQ_WEBHOOK_SECRET' ) ?? Deno.env.get( 'JOPACC_WEBHOOK_SECRET' ) ?? '';
export const CLIQ_CHECKOUT_URL_TEMPLATE = Deno.env.get( 'CLIQ_CHECKOUT_URL_TEMPLATE' ) ?? Deno.env.get( 'JOPACC_CHECKOUT_URL_TEMPLATE' ) ?? '';
export const CLIQ_CHECKOUT_ENDPOINT = Deno.env.get( 'CLIQ_CHECKOUT_ENDPOINT' ) ?? '/payments';
export const SANAD_API_BASE_URL = ( Deno.env.get( 'SANAD_API_BASE_URL' ) ?? '' ).replace( /\/$/, '' );
export const SANAD_CLIENT_ID = Deno.env.get( 'SANAD_CLIENT_ID' ) ?? '';
export const SANAD_CLIENT_SECRET = Deno.env.get( 'SANAD_CLIENT_SECRET' ) ?? '';
export const SANAD_WEBHOOK_SECRET = Deno.env.get( 'SANAD_WEBHOOK_SECRET' ) ?? '';
export const SANAD_VERIFICATION_ENDPOINT = Deno.env.get( 'SANAD_VERIFICATION_ENDPOINT' ) ?? '/identity/verifications';
export const STRIPE_WASEL_PLUS_PRICE_ID = Deno.env.get( 'STRIPE_WASEL_PLUS_PRICE_ID' ) ?? '';
export const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get( 'ALLOWED_ORIGINS' ) ?? '';
// Localhost origins are only permitted when explicitly enabled (local dev).
// In production this MUST stay false so dev origins cannot call the API.
export const ALLOW_LOCAL_ORIGINS = Deno.env.get( 'ALLOW_LOCAL_ORIGINS' ) === 'true';
export const RUNTIME_ADMIN_ENABLED = isRuntimeAdminEnabled( Deno.env.get( 'ENABLE_RUNTIME_ADMIN_ENDPOINTS' ) );
export const SERVICE_NAME = 'make-server-0b1f4071';

export const responseBaseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token, x-communication-worker-secret, stripe-signature, x-cliq-signature, x-cliq-timestamp, x-sanad-signature, x-sanad-timestamp, x-merchant-signature, x-merchant-timestamp',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

drop policy if exists communication_deliveries_insert_own on public.communication_deliveries;
create policy communication_deliveries_insert_own
  on public.communication_deliveries
  for insert
  to authenticated
  with check (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));
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

// Webhook routes are authenticated by provider signatures, not bearer/CSRF tokens.
export const WEBHOOK_PATH_PREFIXES = [
  '/stripe/webhook',
  '/cliq/webhook',
  '/sanad/webhook',
  '/communications/webhook',
  '/webhooks/',
];

export function isWebhookRoute ( path: string ): boolean {
  return WEBHOOK_PATH_PREFIXES.some( prefix => path.startsWith( prefix ) );
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
  if ( !isMutating || isWebhookRoute( path ) ) return null;

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

export async function authenticateRequest ( request: Request ) {
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
    .select(
      'id, auth_user_id, email, phone_number, full_name, role, verification_level, sanad_verified_status, phone_verified_at, profile_status, updated_at',
    )
    .eq( 'auth_user_id', authData.user.id )
    .maybeSingle();

  if ( byAuthError ) {
    return { error: json( { error: byAuthError.message }, 500 ) };
  }

  let canonicalUser = byAuthUser;
  let userError = null;
  if ( !canonicalUser ) {
    const fallback = await admin
      .from( 'users' )
      .select(
        'id, auth_user_id, email, phone_number, full_name, role, verification_level, sanad_verified_status, phone_verified_at, profile_status, updated_at',
      )
      .eq( 'id', authData.user.id )
      .maybeSingle();
    canonicalUser = fallback.data;
    userError = fallback.error;
  }

  if ( userError || !canonicalUser ) {
    return { error: json( { error: 'Canonical user profile was not found' }, 404 ) };
  }

  return { admin, authUser: authData.user, canonicalUser };
}

export function constantTimeEqual ( a: string, b: string ): boolean {
  if ( a.length !== b.length ) return false;
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
  if ( !secret ) return false;
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
  if ( 'error' in auth ) return auth.error;

  const role = resolveAccessRole( auth.canonicalUser.role );
  if ( !hasPermission( role, permission ) ) {
    return json( { error: 'Insufficient permissions' }, 403 );
  }

  return null;
}

export function hasAnyPermission (
  auth: Awaited<ReturnType<typeof authenticateRequest>>,
  permissions: AccessPermission[],
): boolean {
  if ( 'error' in auth ) return false;

  const role = resolveAccessRole( auth.canonicalUser.role );
  return permissions.some( ( permission ) => hasPermission( role, permission ) );
}

export function getFunctionBaseUrl ( request: Request ): string {
  const url = new URL( request.url );
  return url.href.replace( /\/communications\/.*$/, '' ).replace( /\/health$/, '' );
}

export async function executeSqlStatements ( sql: string ) {
  if ( !SUPABASE_DB_URL ) {
    throw new Error( 'SUPABASE_DB_URL is not configured' );
  }

  const client = new Client( SUPABASE_DB_URL );
  await client.connect();
  try {
    await client.queryObject( sql );
  } finally {
    await client.end();
  }
}

export function getAppBaseUrl ( request: Request ): string {
  const origin = request.headers.get( 'origin' )?.trim();
  if ( origin ) {
    return origin.replace( /\/$/, '' );
  }
  return APP_BASE_URL;
}

export function matchesAuthenticatedUser (
  auth: Awaited<ReturnType<typeof authenticateRequest>>,
  requestedUserId: string,
): boolean {
  if ( 'error' in auth ) return false;
  return requestedUserId === auth.canonicalUser.id || requestedUserId === auth.authUser.id;
}

export function parseWalletRoute ( path: string ) {
  const match = /^\/wallet\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec( path );
  if ( !match ) return null;
  return {
    userId: decodeURIComponent( match[ 1 ] ),
    action: match[ 2 ] ? decodeURIComponent( match[ 2 ] ) : '',
    resourceId: match[ 3 ] ? decodeURIComponent( match[ 3 ] ) : null,
  };
}

export function parseEntityRoute ( path: string, prefix: string ) {
  const escapedPrefix = prefix.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
  const match = new RegExp( `^/${ escapedPrefix }/([^/]+)(?:/([^/]+))?$` ).exec( path );
  if ( !match ) return null;
  return {
    id: decodeURIComponent( match[ 1 ] ),
    action: match[ 2 ] ? decodeURIComponent( match[ 2 ] ) : null,
  };
}

export function formatDate ( value: unknown, fallback = new Date().toISOString().slice( 0, 10 ) ): string {
  const date = new Date( String( value ?? '' ) );
  if ( Number.isNaN( date.getTime() ) ) return fallback;
  return date.toISOString().slice( 0, 10 );
}

export function formatTime ( value: unknown ): string {
  const date = new Date( String( value ?? '' ) );
  if ( Number.isNaN( date.getTime() ) ) return String( value ?? '' ).slice( 0, 5 ) || '08:00';
  return date.toISOString().slice( 11, 16 );
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

  return { admin, authUser: data.user };
}

export async function ensureCanonicalUserForAuth (
  admin: ReturnType<typeof getAdminClient>,
  authUser: Record<string, unknown>,
  body: Record<string, unknown> = {},
) {
  const authUserId = String( authUser.id ?? '' );
  const email = String(
    body.email ??
    authUser.email ??
    `pending-${ authUserId }@wasel.local`
  ).trim();
  const fullName =
    String(
      body.fullName ??
      [ body.firstName, body.lastName ].filter( Boolean ).join( ' ' ) ??
      ( authUser.user_metadata as Record<string, unknown> | undefined )?.full_name ??
      authUser.phone ??
      'Wasel User'
    ).trim() || 'Wasel User';
  const phoneNumber = String( body.phone_number ?? body.phone ?? '' ).trim() || null;

  const { data: existing, error: selectError } = await admin
    .from( 'users' )
    .select( '*' )
    .eq( 'auth_user_id', authUserId )
    .maybeSingle();
  if ( selectError ) throw selectError;
  if ( existing ) return existing;

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
  if ( error ) throw error;

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
  if ( error ) throw error;
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
  if ( error ) return null;
  return data;
}

export async function getDriverForUser ( admin: ReturnType<typeof getAdminClient>, userId: string ) {
  const { data, error } = await admin
    .from( 'drivers' )
    .select( '*' )
    .eq( 'user_id', userId )
    .maybeSingle();
  if ( error ) return null;
  return data;
}

export async function ensureDriverForUser ( admin: ReturnType<typeof getAdminClient>, user: Record<string, unknown> ) {
  const existing = await getDriverForUser( admin, String( user.id ) );
  if ( existing ) return existing;

  const { data, error } = await admin
    .from( 'drivers' )
    .insert( {
      user_id: user.id,
      driver_status: 'pending_approval',
      verification_level: user.verification_level ?? 'level_0',
      sanad_identity_linked: false,
    } )
    .select( '*' )
    .single();
  if ( error ) throw error;
  return data;
}

export function isApprovedDriver (
  user: Record<string, unknown>,
  driver: Record<string, unknown>,
  emailConfirmed: boolean,
): boolean {
  const role = String( user.role ?? 'passenger' );
  const verificationLevel = String( driver.verification_level ?? user.verification_level ?? 'level_0' );
  return (
    ( role === 'driver' || role === 'both' ) &&
    Boolean( user.phone_verified_at ) &&
    emailConfirmed &&
    verificationLevel === 'level_3' &&
    String( driver.driver_status ?? '' ) === 'approved' &&
    [ 'approved', 'verified' ].includes( String( driver.background_check_status ?? '' ) )
  );
}

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
  const verified =
    verification?.sanad_status === 'verified' ||
    user.sanad_verified_status === 'verified' ||
    driver?.sanad_identity_linked === true;

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
    sanad_verified: verified,
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
      verified: Boolean( driverProfile?.verified ?? driverProfile?.sanad_verified ?? false ),
    },
  };
}

export function mapBookingRow ( row: Record<string, unknown> ) {
  const amount = toNumber( row.amount ?? row.total_price, 0 );
  return {
    ...row,
    id: String( row.booking_id ?? row.id ?? '' ),
    booking_id: String( row.booking_id ?? row.id ?? '' ),
    seats_requested: toNumber( row.seats_requested, 1 ),
    price_per_seat: toNumber( row.price_per_seat, amount ),
    total_price: amount,
    amount,
    status: String( row.booking_status ?? row.status ?? 'pending' ),
    booking_status: String( row.booking_status ?? row.status ?? 'pending' ),
  };
}

export function mapPackageRow ( row: Record<string, unknown> ) {
  return {
    ...row,
    id: String( row.package_id ?? row.id ?? '' ),
    package_id: String( row.package_id ?? row.id ?? '' ),
    tracking_number: String( row.tracking_number ?? '' ),
    status: String( row.status ?? 'posted' ),
    delivery_fee: toNumber( row.delivery_fee, 0 ),
  };
}

export async function fetchDriverProfiles (
  admin: ReturnType<typeof getAdminClient>,
  driverIds: string[],
): Promise<Record<string, Record<string, unknown>>> {
  const uniqueIds = Array.from( new Set( driverIds.filter( Boolean ) ) );
  if ( uniqueIds.length === 0 ) return {};

  const { data: drivers } = await admin.from( 'drivers' ).select( '*' ).in( 'driver_id', uniqueIds );
  const driverRows = Array.isArray( drivers ) ? drivers : [];
  const usersById = new Map<string, Record<string, unknown>>();

  const userIds = driverRows.map( ( driver: Record<string, unknown> ) => String( driver.user_id ?? '' ) );
  if ( userIds.length > 0 ) {
    const { data: users } = await admin.from( 'users' ).select( '*' ).in( 'id', userIds );
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


export async async ensureMobilitySeed ( admin: ReturnType<typeof getAdminClient> ) {
  if ( SUPABASE_DB_URL ) {
    await executeSqlStatements( EVENT_OUTBOX_SQL ).catch( () => undefined );
  }
  const { data } = await admin.from( 'mobility_corridors' ).select( 'id' ).limit( 1 );
  if ( Array.isArray( data ) && data.length > 0 ) return;
  if ( SUPABASE_DB_URL ) {
    await executeSqlStatements( MOBILITY_OS_SEED_SQL ).catch( () => undefined );
  }
}

export mapWalletPaymentMethod ( paymentMethod: string ): string {
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

export toMoneyNumber ( value: unknown ): number {
  const amount = Number( value );
  return Number.isFinite( amount ) ? Number( amount.toFixed( 3 ) ) : 0;
}

export toStripeMinorAmount ( amountJod: number ): string {
  return String( Math.round( amountJod * 1000 ) );
}

export buildCliqCheckoutUrl ( template: string, values: Record<string, string> ): string {
  return template.replace( /\{([a-zA-Z0-9_]+)\}/g, ( _, key: string ) => (
    encodeURIComponent( values[ key ] ?? '' )
  ) );
}

export joinProviderUrl ( baseUrl: string, endpoint: string ): string {
  if ( !baseUrl ) return '';
  if ( /^https?:\/\//i.test( endpoint ) ) return endpoint;
  return `${ baseUrl }${ endpoint.startsWith( '/' ) ? endpoint : `/${ endpoint }` }`;
}

export normalizeProviderStatus ( value: unknown ): string {
  return String( value ?? '' ).trim().toLowerCase().replace( /[\s_-]+/g, '_' );
}

export isSuccessfulProviderStatus ( value: unknown ): boolean {
  const status = normalizeProviderStatus( value );
  return [ 'success', 'succeeded', 'paid', 'posted', 'completed', 'complete', 'approved', 'verified' ].includes( status );
}

export isFailedProviderStatus ( value: unknown ): boolean {
  const status = normalizeProviderStatus( value );
  return [ 'failed', 'failure', 'rejected', 'declined', 'cancelled', 'canceled', 'expired' ].includes( status );
}

export firstStringValue ( source: Record<string, unknown>, keys: string[] ): string {
  for ( const key of keys ) {
    const value = source[ key ];
    if ( typeof value === 'string' && value.trim() ) return value.trim();
    if ( typeof value === 'number' && Number.isFinite( value ) ) return String( value );
  }
  return '';
}

export mapSubscriptionPlan ( planName: string ): 'basic' | 'premium' | 'enterprise' {
  const normalized = planName.trim().toLowerCase();
  if ( normalized.includes( 'enterprise' ) ) return 'enterprise';
  if ( normalized.includes( 'basic' ) || normalized.includes( 'starter' ) ) return 'basic';
  return 'premium';
}

export toIsoFromUnix ( value: unknown ): string | null {
  const seconds = Number( value );
  if ( !Number.isFinite( seconds ) || seconds <= 0 ) return null;
  return new Date( seconds * 1000 ).toISOString();
}

export isPhoneNumberUniqueViolation ( error: unknown ): boolean {
  if ( !error || typeof error !== 'object' ) return false;

  const record = error as { code?: unknown; message?: unknown; details?: unknown };
  const message = String( record.message ?? record.details ?? '' );
  return (
    record.code === '23505' ||
    message.includes( 'users_phone_number_key' ) ||
    message.includes( 'duplicate key value violates unique constraint' )
  );
}

export generateOtpCode (): string {
  const random = crypto.getRandomValues( new Uint32Array( 1 ) )[ 0 ] % 900000;
  return String( random + 100000 ).padStart( 6, '0' );
}

export getTwilioAuthPair (): { user: string; password: string } | null {

export hasTwilioVerifyRuntime (): boolean {
  return Boolean( deliveryEnv.twilioAccountSid && TWILIO_VERIFY_SERVICE_SID && getTwilioAuthPair() );
}

export async async callTwilioVerify ( path: string, params: URLSearchParams ) {
  const authPair = getTwilioAuthPair();
  if ( !authPair || !deliveryEnv.twilioAccountSid || !TWILIO_VERIFY_SERVICE_SID ) {
    return {
      ok: false,
      retryable: false,
      error: 'Twilio Verify is not configured.',
    };
  }

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${ TWILIO_VERIFY_SERVICE_SID }${ path }`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${ btoa( `${ authPair.user }:${ authPair.password }` ) }`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  );
  const payload = await response.json().catch( () => ( {} ) );

  return {
    ok: response.ok,
    retryable: response.status >= 400 && response.status < 500,
    payload,
    error:
      typeof payload?.message === 'string'
        ? payload.message
        : `Twilio Verify request failed (${ response.status }).`,
  };
}

export async async startTwilioPhoneVerification ( phoneNumber: string ) {
  const result = await callTwilioVerify(
    '/Verifications',
    new URLSearchParams( {
      To: phoneNumber,
      Channel: 'sms',
      Locale: 'en',
    } ),
  );

  return {
    ok: result.ok,
    retryable: result.retryable,
    error: result.ok ? undefined : result.error,
  };
}

export async async checkTwilioPhoneVerification ( phoneNumber: string, code: string ) {
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

export async async hashOtpCode ( code: string ): Promise<string> {
  const digest = await crypto.subtle.digest( 'SHA-256', new TextEncoder().encode( code ) );
  return Array.from( new Uint8Array( digest ) )
    .map( ( chunk ) => chunk.toString( 16 ).padStart( 2, '0' ) )
    .join( '' );
}

export isExpired ( isoValue?: string | null ): boolean {
  if ( !isoValue ) return false;
  const expiresAt = new Date( isoValue ).getTime();
  if ( Number.isNaN( expiresAt ) ) return false;
  return expiresAt <= Date.now();
}

export isOlderThanHours ( isoValue: string | null | undefined, hours: number ): boolean {
  if ( !isoValue ) return false;
  const timestamp = new Date( isoValue ).getTime();
  if ( Number.isNaN( timestamp ) ) return false;
  return Date.now() - timestamp >= hours * 60 * 60 * 1000;
}

export computeTrustStepSummary ( steps: Record<string, { id: string; state: string }> ) {

export buildTrustStep ( id: string, state: string, detail: string, meta: Record<string, unknown>, options?: {
  failureReason?: string | null;
  updatedAt?: string | null;
} ) {

export async async buildTrustStatus (
  auth: Awaited<ReturnType<typeof authenticateRequest>>,
) {
  if ( 'error' in auth ) {
    return null;
  }

  const [ verificationResult, driverResult, walletResult, otpResult ] = await Promise.all( [
    auth.admin
      .from( 'verification_records' )
      .select(
        'verification_id, sanad_status, document_status, verification_level, verification_timestamp, provider_reference, document_reference, failure_reason, updated_at',
      )
      .eq( 'user_id', auth.canonicalUser.id )
      .order( 'verification_timestamp', { ascending: false } )
      .limit( 1 )
      .maybeSingle(),
    auth.admin
      .from( 'drivers' )
      .select(
        'driver_id, license_number, driver_status, verification_level, sanad_identity_linked, background_check_status, created_at, updated_at',
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

  if ( verificationResult.error ) throw new Error( verificationResult.error.message );
  if ( driverResult.error ) throw new Error( driverResult.error.message );
  if ( walletResult.error ) throw new Error( walletResult.error.message );
  if ( otpResult.error ) throw new Error( otpResult.error.message );

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

  const identityUpdatedAt =
    String(
      verification?.updated_at ??
      verification?.verification_timestamp ??
      auth.canonicalUser.updated_at ??
      '',
    ) || null;
  const staleIdentity =
    verification?.sanad_status === 'pending' &&
    isOlderThanHours( identityUpdatedAt, IDENTITY_PENDING_TIMEOUT_HOURS );
  const identityFailureReason =
    staleIdentity
      ? 'Sanad verification timed out. Submit the request again.'
      : verification?.failure_reason ?? null;
  const identity =
    verification?.sanad_status === 'verified' ||
      verificationLevel === 'level_2' ||
      verificationLevel === 'level_3'
      ? buildTrustStep(
        'identity',
        'completed',
        'Identity verification is complete.',
        {
          providerReference: verification?.provider_reference ?? null,
          documentReference: verification?.document_reference ?? null,
        },
        {
          updatedAt: identityUpdatedAt,
        },
      )
      : verification?.sanad_status === 'rejected' ||
        verification?.sanad_status === 'expired' ||
        staleIdentity
        ? buildTrustStep(
          'identity',
          'failed',
          'Identity verification did not complete.',
          {
            providerReference: verification?.provider_reference ?? null,
            documentReference: verification?.document_reference ?? null,
          },
          {
            failureReason:
              identityFailureReason ??
              'Sanad verification was rejected. Review the reason and try again.',
            updatedAt: identityUpdatedAt,
          },
        )
        : verification?.sanad_status === 'pending'
          ? buildTrustStep(
            'identity',
            'in_progress',
            'Sanad verification is under review.',
            {
              providerReference: verification?.provider_reference ?? null,
              documentReference: verification?.document_reference ?? null,
            },
            {
              updatedAt: identityUpdatedAt,
            },
          )
          : buildTrustStep(
            'identity',
            'not_started',
            'Submit Sanad verification to continue.',
            {
              providerReference: null,
              documentReference: null,
            },
          );

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
    identity,
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

export async async stripeApiRequest (
  path: string,
  init?: {
    method?: 'GET' | 'POST';
    params?: URLSearchParams;
  },

export async async getExistingStripeCustomerId (
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

export async async ensureStripeCustomer ( input: {
  admin: ReturnType<typeof getAdminClient>;
  canonicalUser: { id: string; email?: string | null; full_name?: string | null; phone_number?: string | null };
} ): Promise<string> {

export async async fetchStripeSubscription ( subscriptionId: string ) {
  const params = new URLSearchParams();
  params.append( 'expand[]', 'items.data.price.product' );
  return stripeApiRequest( `/v1/subscriptions/${ encodeURIComponent( subscriptionId ) }`, {
    method: 'GET',
    params,
  } );
}

export buildSubscriptionRecord (
  userId: string,
  subscription: Record<string, unknown>,
  planOverride?: string | null,
) {
  const items = Array.isArray( ( subscription.items as { data?: unknown[] } | undefined )?.data )
    ? ( subscription.items as { data: Array<Record<string, unknown>> } ).data
    : [];
  const firstItem = items[ 0 ] ?? {};
  const price = ( firstItem.price as Record<string, unknown> | undefined ) ?? {};
  const metadata = ( subscription.metadata as Record<string, unknown> | undefined ) ?? {};
  const plan = mapSubscriptionPlan(
    String( planOverride ?? metadata.plan ?? metadata.plan_name ?? 'premium' ),
  );

  return {
    user_id: userId,
    stripe_subscription_id: String( subscription.id ?? '' ),
    stripe_customer_id: String( subscription.customer ?? '' ),
    stripe_price_id: String( price.id ?? '' ),
    stripe_product_id:
      typeof price.product === 'string'
        ? price.product
        : typeof ( price.product as Record<string, unknown> | undefined )?.id === 'string'
          ? String( ( price.product as Record<string, unknown> ).id )
          : null,
    status: String( subscription.status ?? 'incomplete' ),
    plan,
    current_period_start: toIsoFromUnix( subscription.current_period_start ),
    current_period_end: toIsoFromUnix( subscription.current_period_end ),
    cancel_at_period_end: Boolean( subscription.cancel_at_period_end ),
    cancelled_at: toIsoFromUnix( subscription.canceled_at ),
    ended_at: toIsoFromUnix( subscription.ended_at ),
    trial_start: toIsoFromUnix( subscription.trial_start ),
    trial_end: toIsoFromUnix( subscription.trial_end ),
    updated_at: new Date().toISOString(),
  };
}

export async async getCanonicalUserIdForSubscription (
  admin: ReturnType<typeof getAdminClient>,
  subscription: Record<string, unknown>,
): Promise<string | null> {
  const metadata = ( subscription.metadata as Record<string, unknown> | undefined ) ?? {};
  if ( typeof metadata.user_id === 'string' && metadata.user_id.trim() ) {
    return metadata.user_id.trim();
  }

  const subscriptionId = String( subscription.id ?? '' );
  if ( !subscriptionId ) return null;

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

export async async syncStripeSubscriptionRecord ( input: {
  admin: ReturnType<typeof getAdminClient>;
  subscription: Record<string, unknown>;
  planOverride?: string | null;
} ) {

export async async getWalletSubscription (
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

  if ( !data ) return null;

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

export describeWalletTransaction ( row: WalletTransactionRow ): string {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const metadataDescription = metadata.description ?? metadata.note;
  if ( metadataDescription ) return String( metadataDescription );

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

export toWalletTransaction ( row: WalletTransactionRow ) {
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

export buildWalletInsights ( transactions: ReturnType<typeof toWalletTransaction>[] ) {
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
    if ( Number.isNaN( date.getTime() ) ) continue;
    const month = date.toLocaleDateString( 'en-US', { month: 'short', timeZone: 'UTC' } );
    const bucket = monthlyBuckets.get( month ) ?? { spent: 0, earned: 0 };
    if ( tx.amount < 0 ) bucket.spent += Math.abs( tx.amount );
    if ( tx.amount > 0 ) bucket.earned += tx.amount;
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

export normalizeWalletPaymentMethod ( method: unknown ): string {
  const value = String( method ?? 'card' ).trim();
  return [ 'card_payment', 'local_gateway', 'wallet_balance', 'government_api' ].includes( value )
    ? value
    : mapWalletPaymentMethod( value );
}

export mapReferenceTypeToTransactionType ( referenceType: string ): string {
  switch ( referenceType ) {
    case 'ride_booking': return 'ride_payment';
    case 'package_delivery': return 'package_payment';
    case 'bus_booking': return 'bus_payment';
    case 'subscription': return 'subscription_payment';
    default: return 'purchase';
  }
}

export buildWalletPayload (
  wallet: WalletRow,
  transactions: WalletTransactionRow[],
  paymentMethods: PaymentMethodRow[],
  subscription: Awaited<ReturnType<typeof getWalletSubscription>>,
) {
  const normalizedTransactions = transactions.map( toWalletTransaction );
  const totalEarned = transactions
    .filter( row => row.direction === 'credit' )
    .reduce( ( total, row ) => total + toNumber( row.amount, 0 ), 0 );
  const totalSpent = transactions
    .filter( row => row.direction === 'debit' )
    .reduce( ( total, row ) => total + toNumber( row.amount, 0 ), 0 );
  const totalDeposited = transactions
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

export async async ensureWalletForUser ( admin: ReturnType<typeof getAdminClient>, userId: string ): Promise<WalletRow> {
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

export async async loadWalletDetails ( admin: ReturnType<typeof getAdminClient>, userId: string ) {
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

  if ( transactionsError ) throw new Error( transactionsError.message );
  if ( paymentMethodsError ) throw new Error( paymentMethodsError.message );

  return {
    wallet,
    transactions: ( Array.isArray( transactions ) ? transactions : [] ) as WalletTransactionRow[],
    paymentMethods: ( Array.isArray( paymentMethods ) ? paymentMethods : [] ) as PaymentMethodRow[],
    subscription,
  };
}

export async async loadWalletPayload ( admin: ReturnType<typeof getAdminClient>, userId: string ) {
  const details = await loadWalletDetails( admin, userId );
  return buildWalletPayload(
    details.wallet,
    details.transactions,
    details.paymentMethods,
    details.subscription,
  );
}

export async async authenticateWalletRequest ( request: Request, requestedUserId: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth;
  if ( !matchesAuthenticatedUser( auth, requestedUserId ) ) {
    return { error: json( { error: 'Wallet route is not authorized for this user.' }, 403 ) };
  }
  const role = resolveAccessRole( auth.canonicalUser.role );
  if ( !hasPermission( role, 'payments:read' ) && !hasPermission( role, 'payments:write' ) ) {
    return { error: json( { error: 'Insufficient permissions' }, 403 ) };
  }
  return auth;
}

export toHex ( bytes: Uint8Array ): string {
  return Array.from( bytes ).map( byte => byte.toString( 16 ).padStart( 2, '0' ) ).join( '' );
}

export fromHex ( value: string ): Uint8Array {
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

export timingSafeEqual ( left: Uint8Array, right: Uint8Array ): boolean {
  if ( left.length !== right.length ) return false;
  let diff = 0;
  for ( let index = 0; index < left.length; index += 1 ) {
    diff |= left[ index ] ^ right[ index ];
  }
  return diff === 0;
}

export async async hashLegacyWalletPin ( pin: string ): Promise<string> {
  const bytes = new TextEncoder().encode( `wasel-wallet-pin:${ pin }` );
  const digest = await crypto.subtle.digest( 'SHA-256', bytes );
  return toHex( new Uint8Array( digest as ArrayBuffer ) );
}

export async async hashWalletPin ( pin: string ): Promise<string> {
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

export async async verifyWalletPinHash ( pin: string, storedHash?: string | null ): Promise<boolean> {
  if ( !storedHash ) return false;
  const parts = storedHash.split( '$' );
  if ( parts.length !== 4 || parts[ 0 ] !== 'pbkdf2_sha256' ) {
    const legacyHash = await hashLegacyWalletPin( pin );
    return timingSafeEqual( fromHex( storedHash ), fromHex( legacyHash ) );
  }

  const iterations = Number.parseInt( parts[ 1 ] ?? '', 10 );
  const salt = fromHex( parts[ 2 ] ?? '' );
  const expected = fromHex( parts[ 3 ] ?? '' );
  if ( !Number.isFinite( iterations ) || iterations < 100_000 || salt.length < 16 || expected.length !== 32 ) {
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

export async async resolveWalletRecipient ( admin: ReturnType<typeof getAdminClient>, recipientId: string ) {
  const recipient = recipientId.trim();
  if ( !recipient ) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test( recipient );
  if ( isUuid ) {
    const { data, error } = await admin
      .from( 'users' )
      .select( 'id' )
      .or( `id.eq.${ recipient },auth_user_id.eq.${ recipient }` )
      .maybeSingle();
    if ( error ) throw new Error( error.message );
    if ( data?.id ) return String( data.id );
  }

  const { data, error } = await admin
    .from( 'users' )
    .select( 'id' )
    .or( `email.eq.${ recipient },phone_number.eq.${ recipient }` )
    .maybeSingle();
  if ( error ) throw new Error( error.message );
  return data?.id ? String( data.id ) : null;
}

export async async createPendingTopUpTransaction (
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

export async async updateTopUpTransactionMetadata (
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

export async async markTopUpTransactionFailed (
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
    .eq( 'transaction_id', transactionId );

  if ( error ) {
    throw new Error( error.message );
  }
}

export async async finalizeTopUpTransaction (
  transactionId: string,
  externalReference: string,
  providerPayload: unknown,
  provider = 'stripe',
) {
  if ( !SUPABASE_DB_URL ) {
    throw new Error( 'SUPABASE_DB_URL is not configured' );
  }

  const client = new Client( SUPABASE_DB_URL );
  await client.connect();

  try {
    await client.queryArray( 'begin' );

    const transactionResult = await client.queryObject<{ wallet_id: string; amount: number; transaction_status: string; metadata: unknown }>(
      'select wallet_id, amount, transaction_status, metadata from public.transactions where transaction_id = $1 for update',
      [ transactionId ],
    );

    const transaction = transactionResult.rows[ 0 ];
    if ( !transaction ) {
      throw new Error( `Transaction ${ transactionId } was not found` );
    }

    if ( transaction.transaction_status === 'posted' ) {
      await client.queryArray( 'commit' );
      return { applied: false, reason: 'already_posted' };
    }

    if ( transaction.transaction_status === 'failed' ) {
      await client.queryArray( 'commit' );
      return { applied: false, reason: 'already_failed' };
    }

    await client.queryObject(
      'update public.wallets set balance = balance + $1, updated_at = timezone(\'utc\', now()) where wallet_id = $2',
      [ transaction.amount, transaction.wallet_id ],
    );

    const nextMetadata = {
      ...( ( transaction.metadata && typeof transaction.metadata === 'object' ) ? transaction.metadata as Record<string, unknown> : {} ),
      provider,
      provider_payload: providerPayload,
      credited_via: `${ provider }_webhook`,
    };

    await client.queryObject(
      'update public.transactions set transaction_status = $1, reference_id = $2, metadata = $3::jsonb, updated_at = timezone(\'utc\', now()) where transaction_id = $4',
      [ 'posted', externalReference, JSON.stringify( nextMetadata ), transactionId ],
    );

    await client.queryArray( 'commit' );
    return { applied: true };
  } catch ( error ) {
    await client.queryArray( 'rollback' ).catch( () => undefined );
    throw error;
  } finally {
    await client.end();
  }
}

export async async createStripeCheckoutSession ( input: {
  amountJod: number;
  paymentMethod: string;
  transactionId: string;
  canonicalUserId: string;
  walletId: string;
  request: Request;
} ) {

export async async createStripeSubscriptionCheckoutSession ( input: {
  admin: ReturnType<typeof getAdminClient>;
  canonicalUser: { id: string; email?: string | null; full_name?: string | null; phone_number?: string | null };
  planName: string;
  request: Request;
} ) {

export async async createCliqCheckoutSession ( input: {
  transactionId: string;
  amountJod: number;
  currency: string;
  request: Request;
} ): Promise<{ checkoutUrl: string; providerReference: string | null }> {

export constantTimeEquals ( left: string, right: string ): boolean {
  if ( left.length !== right.length ) return false;
  let mismatch = 0;
  for ( let index = 0; index < left.length; index += 1 ) {
    mismatch |= left.charCodeAt( index ) ^ right.charCodeAt( index );
  }
  return mismatch === 0;
}

export async async computeStripeSignature ( secret: string, payload: string, timestamp: string ): Promise<string> {
  return computeHmacHex( secret, `${ timestamp }.${ payload }` );
}

export async async computeHmacHex ( secret: string, payload: string ): Promise<string> {
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

export async async verifyStripeWebhookSignature ( payload: string, signatureHeader: string | null ): Promise<boolean> {
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
  if ( Math.abs( nowSeconds - Number( timestamp ) ) > 300 ) {
    return false;
  }

  const expected = await computeStripeSignature( STRIPE_WEBHOOK_SECRET, payload, timestamp );
  return candidates.some( ( candidate ) => constantTimeEquals( candidate, expected ) );
}

export normalizeSignatureHeader ( value: string | null ): string {
  if ( !value ) return '';
  const trimmed = value.trim();
  if ( trimmed.includes( '=' ) ) {
    return trimmed.split( /[,\s]+/ )
      .map( ( segment ) => segment.trim() )
      .find( ( segment ) => segment.startsWith( 'v1=' ) || segment.startsWith( 'sha256=' ) )
      ?.replace( /^(v1|sha256)=/, '' ) ?? '';
  }
  return trimmed.replace( /^sha256=/, '' );
}

export async async verifyProviderWebhookSignature ( args: {
  payload: string;
  secret: string;
  signature: string | null;
  timestamp?: string | null;
} ): Promise<boolean> {

export async async sendDelivery (
  admin: ReturnType<typeof getAdminClient>,
  delivery: CommunicationDeliveryRecord,
  functionBaseUrl: string,
) {
  const now = new Date().toISOString();
  const env = { ...deliveryEnv, functionBaseUrl };
  const attemptsCount = ( delivery.attempts_count ?? 0 ) + 1;

  await admin
    .from( 'communication_deliveries' )
    .update( {
      delivery_status: 'processing',
      attempts_count: attemptsCount,
      last_attempt_at: now,
      locked_at: now,
      processed_by: 'edge:communications-process',
      updated_at: now,
    } )
    .eq( 'delivery_id', delivery.delivery_id );

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

export async async processQueuedDeliveries (
  admin: ReturnType<typeof getAdminClient>,
  functionBaseUrl: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from( 'communication_deliveries' )
    .select( '*' )
    .eq( 'delivery_status', 'queued' )
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
  for ( const delivery of dueDeliveries ) {
    const result = await sendDelivery( admin, delivery, functionBaseUrl );
    if ( result.ok ) sent += 1;
    else failed += 1;
  }

  return {
    processed: dueDeliveries.length,
    sent,
    failed,
    skipped: ( Array.isArray( data ) ? data.length : 0 ) - dueDeliveries.length,
  };
}

export normalizePaymentAmount ( value: unknown ): number | null {
  if ( typeof value !== 'number' || !Number.isFinite( value ) ) return null;
  const amount = Math.round( value );
  if ( amount < 50 || amount > MAX_PAYMENT_AMOUNT_MINOR ) return null;
  return amount;
}

export async async submitSanadVerificationRequest ( input: {
  userId: string;
  providerReference: string;
  documentReference: string | null;
} ) {

export async async assertTripParticipant ( admin: ReturnType<typeof getAdminClient>, tripId: string, userId: string ) {
  const [ { data: trip, error: tripError }, { data: booking, error: bookingError } ] = await Promise.all( [
    admin.from( 'trips' ).select( 'id, trip_id, driver_id' ).or( `id.eq.${ tripId },trip_id.eq.${ tripId }` ).maybeSingle(),
    admin
      .from( 'bookings' )
      .select( 'id, user_id' )
      .eq( 'trip_id', tripId )
      .eq( 'user_id', userId )
      .maybeSingle(),
  ] );

  if ( tripError ) throw tripError;
  if ( bookingError ) throw bookingError;
  return Boolean( ( trip && trip.driver_id === userId ) || booking );
}

export cityCoord ( city: string | null | undefined ) {
  const coords: Record<string, { lat: number; lng: number }> = {
    amman: { lat: 31.9539, lng: 35.9106 },
    aqaba: { lat: 29.5321, lng: 35.006 },
    irbid: { lat: 32.5568, lng: 35.8479 },
    zarqa: { lat: 32.0728, lng: 36.088 },
  };
  return coords[ String( city ?? '' ).toLowerCase() ] ?? coords.amman;
}

export async async resolveRoute ( request: Request ): Promise<Response> {
  const url = new URL( request.url );
  let path = url.pathname.replace( /^.*make-server-0b1f4071/, '' ) || '/';

  if ( path.startsWith( '/v1' ) ) {
    path = path.slice( 3 ) || '/';
  }

  for ( const route of ROUTES ) {
    if ( route.methods && !route.methods.includes( request.method ) ) continue;
    if ( !route.test( path, request.method ) ) continue;

    const result = await route.handle( request, path );
    if ( result ) return result;
  }

  return json( { error: 'Route not found', path }, 404 );
}