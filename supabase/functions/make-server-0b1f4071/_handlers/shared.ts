
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