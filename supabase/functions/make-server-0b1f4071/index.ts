import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';
import {
  buildAutomationActionUrl,
  buildAutomationFailurePatch,
  buildAutomationNotification,
  describeRoute,
  nextReminderDate,
  splitRouteLabel,
  type AutomationJobRecord,
  type ReminderFrequency,
} from './_shared/automation-runtime.ts';
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-communication-worker-secret, x-automation-worker-secret',
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

const AUTOMATION_RUNTIME_SQL = `
alter table public.trips
  add column if not exists corridor_key text,
  add column if not exists route_scope text
    check (route_scope in ('city_to_city', 'city_to_governorate', 'governorate_to_city', 'governorate_to_governorate')),
  add column if not exists origin_governorate text,
  add column if not exists destination_governorate text;

alter table public.demand_alerts
  add column if not exists corridor_key text,
  add column if not exists route_scope text
    check (route_scope in ('city_to_city', 'city_to_governorate', 'governorate_to_city', 'governorate_to_governorate'));

alter table public.growth_events
  add column if not exists corridor_key text,
  add column if not exists route_scope text
    check (route_scope in ('city_to_city', 'city_to_governorate', 'governorate_to_city', 'governorate_to_governorate'));

create index if not exists trips_corridor_key_idx
  on public.trips (corridor_key, departure_time desc);

create index if not exists demand_alerts_corridor_key_idx
  on public.demand_alerts (corridor_key, requested_date desc);

create index if not exists growth_events_corridor_key_idx
  on public.growth_events (corridor_key, created_at desc);

create table if not exists public.route_reminders (
  reminder_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  corridor_id text not null,
  label text not null,
  origin_location text not null,
  destination_location text not null,
  frequency text not null check (frequency in ('weekdays', 'daily', 'weekly')),
  preferred_time text not null,
  next_reminder_at timestamptz not null,
  enabled boolean not null default true,
  last_sent_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists route_reminders_user_corridor_uidx
  on public.route_reminders (user_id, corridor_id);

create index if not exists route_reminders_due_idx
  on public.route_reminders (enabled, next_reminder_at);

create table if not exists public.pricing_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.users(id) on delete set null,
  corridor_id text null,
  corridor_key text not null,
  route_scope text null check (route_scope in ('city_to_city', 'city_to_governorate', 'governorate_to_city', 'governorate_to_governorate')),
  origin_location text not null,
  destination_location text not null,
  base_price_jod numeric(10,3) not null default 0,
  final_price_jod numeric(10,3) not null default 0,
  demand_score numeric(6,2) null,
  price_pressure text null check (price_pressure in ('surging', 'balanced', 'value-window')),
  source_context text null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pricing_snapshots_corridor_idx
  on public.pricing_snapshots (corridor_key, created_at desc);

create index if not exists pricing_snapshots_user_idx
  on public.pricing_snapshots (user_id, created_at desc);

create table if not exists public.automation_jobs (
  job_id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.users(id) on delete set null,
  job_type text not null
    check (job_type in ('demand_recovery', 'corridor_conversion', 'pricing_refresh', 'retention_nudge', 'reminder_dispatch', 'support_sla', 'support_follow_up', 'revenue_observe')),
  corridor_id text null,
  corridor_key text null,
  route_scope text null check (route_scope in ('city_to_city', 'city_to_governorate', 'governorate_to_city', 'governorate_to_governorate')),
  origin_location text null,
  destination_location text null,
  job_status text not null default 'queued'
    check (job_status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  payload jsonb null default '{}'::jsonb,
  run_after timestamptz not null default timezone('utc', now()),
  attempts_count integer not null default 0,
  locked_at timestamptz null,
  last_attempt_at timestamptz null,
  processed_by text null,
  last_error text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz null
);

alter table public.automation_jobs
  add column if not exists last_attempt_at timestamptz null,
  add column if not exists processed_by text null,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.automation_jobs
  alter column corridor_key drop not null;

create index if not exists automation_jobs_queue_idx
  on public.automation_jobs (job_status, run_after, created_at);

create index if not exists automation_jobs_corridor_idx
  on public.automation_jobs (corridor_key, created_at desc)
  where corridor_key is not null;

create index if not exists automation_jobs_user_status_idx
  on public.automation_jobs (user_id, job_status, run_after);

create table if not exists public.support_tickets (
  ticket_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null
    check (topic in ('ride_booking', 'ride_issue', 'bus_booking', 'package_issue', 'package_dispute', 'verification', 'payment', 'refund', 'cancellation', 'general')),
  subject text not null,
  detail text not null,
  related_id text null,
  route_label text null,
  status text not null default 'open'
    check (status in ('open', 'investigating', 'waiting_on_user', 'resolved', 'closed')),
  priority text not null default 'low'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  channel text not null default 'in_app'
    check (channel in ('in_app', 'operations', 'phone', 'email')),
  resolution_summary text null,
  latest_note text null,
  sla_due_at timestamptz not null default timezone('utc', now()) + interval '24 hours',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists support_tickets_status_idx
  on public.support_tickets (status, priority, updated_at desc);

create index if not exists support_tickets_user_idx
  on public.support_tickets (user_id, updated_at desc);

create index if not exists support_tickets_sla_idx
  on public.support_tickets (status, sla_due_at asc);

create table if not exists public.support_ticket_events (
  event_id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(ticket_id) on delete cascade,
  status text not null
    check (status in ('open', 'investigating', 'waiting_on_user', 'resolved', 'closed')),
  note text not null,
  actor_type text not null default 'system'
    check (actor_type in ('user', 'system', 'operations')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists support_ticket_events_ticket_idx
  on public.support_ticket_events (ticket_id, created_at asc);

create or replace function public.app_claim_automation_jobs(
  max_jobs integer default 25,
  worker_name text default 'edge:automation-process'
)
returns setof public.automation_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select automation_jobs.job_id
    from public.automation_jobs
    where (
      automation_jobs.job_status = 'queued'
      or (
        automation_jobs.job_status = 'processing'
        and automation_jobs.locked_at is not null
        and automation_jobs.locked_at <= timezone('utc', now()) - interval '15 minutes'
      )
    )
      and automation_jobs.run_after <= timezone('utc', now())
    order by automation_jobs.run_after asc, automation_jobs.created_at asc
    for update skip locked
    limit greatest(coalesce(max_jobs, 25), 1)
  ),
  claimed as (
    update public.automation_jobs as jobs
    set job_status = 'processing',
        attempts_count = coalesce(jobs.attempts_count, 0) + 1,
        locked_at = timezone('utc', now()),
        last_attempt_at = timezone('utc', now()),
        processed_by = worker_name,
        last_error = null,
        completed_at = null,
        updated_at = timezone('utc', now())
    from candidates
    where jobs.job_id = candidates.job_id
    returning jobs.*
  )
  select * from claimed;
end;
$$;

create or replace function public.app_backfill_automation_jobs(
  max_rows integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reminder_jobs integer := 0;
  support_jobs integer := 0;
begin
  with inserted_reminders as (
    insert into public.automation_jobs (
      user_id,
      job_type,
      corridor_id,
      corridor_key,
      route_scope,
      origin_location,
      destination_location,
      job_status,
      payload,
      run_after
    )
    select
      reminders.user_id,
      'reminder_dispatch',
      reminders.corridor_id,
      reminders.corridor_id,
      null,
      reminders.origin_location,
      reminders.destination_location,
      'queued',
      jsonb_build_object(
        'reminderId', reminders.reminder_id,
        'label', reminders.label,
        'frequency', reminders.frequency,
        'preferredTime', reminders.preferred_time
      ),
      reminders.next_reminder_at
    from public.route_reminders as reminders
    where reminders.enabled = true
      and not exists (
        select 1
        from public.automation_jobs as jobs
        where jobs.job_type = 'reminder_dispatch'
          and jobs.job_status in ('queued', 'processing')
          and jobs.payload ->> 'reminderId' = reminders.reminder_id::text
      )
    order by reminders.next_reminder_at asc
    limit greatest(coalesce(max_rows, 100), 1)
    returning 1
  )
  select count(*) into reminder_jobs from inserted_reminders;

  with inserted_support as (
    insert into public.automation_jobs (
      user_id,
      job_type,
      corridor_id,
      corridor_key,
      route_scope,
      origin_location,
      destination_location,
      job_status,
      payload,
      run_after
    )
    select
      tickets.user_id,
      'support_sla',
      null,
      null,
      null,
      null,
      null,
      'queued',
      jsonb_build_object(
        'ticketId', tickets.ticket_id,
        'topic', tickets.topic,
        'priority', tickets.priority,
        'subject', tickets.subject,
        'routeLabel', tickets.route_label
      ),
      tickets.sla_due_at
    from public.support_tickets as tickets
    where tickets.status in ('open', 'investigating', 'waiting_on_user')
      and not exists (
        select 1
        from public.automation_jobs as jobs
        where jobs.job_type = 'support_sla'
          and jobs.job_status in ('queued', 'processing')
          and jobs.payload ->> 'ticketId' = tickets.ticket_id::text
      )
    order by tickets.sla_due_at asc
    limit greatest(coalesce(max_rows, 100), 1)
    returning 1
  )
  select count(*) into support_jobs from inserted_support;

  return jsonb_build_object(
    'reminder_dispatch', reminder_jobs,
    'support_sla', support_jobs
  );
end;
$$;

revoke all on function public.app_claim_automation_jobs(integer, text) from public;
revoke all on function public.app_backfill_automation_jobs(integer) from public;
grant execute on function public.app_claim_automation_jobs(integer, text) to service_role;
grant execute on function public.app_backfill_automation_jobs(integer) to service_role;

create or replace function public.app_enqueue_automation_job(
  p_job_type text,
  p_corridor_id text default null,
  p_corridor_key text default null,
  p_route_scope text default null,
  p_origin_location text default null,
  p_destination_location text default null,
  p_payload jsonb default '{}'::jsonb,
  p_run_after timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_corridor_id text;
  v_corridor_key text;
  v_origin_location text;
  v_destination_location text;
  v_payload jsonb := '{}'::jsonb;
  v_existing public.automation_jobs%rowtype;
  v_job public.automation_jobs%rowtype;
  v_open_jobs integer := 0;
  v_type_open_jobs integer := 0;
  v_reminder_id text;
  v_ticket_id text;
begin
  v_user_id := public.current_user_id();
  if v_user_id is null then
    raise exception 'Authentication required to enqueue automation jobs';
  end if;

  if p_job_type not in (
    'demand_recovery',
    'corridor_conversion',
    'pricing_refresh',
    'retention_nudge',
    'reminder_dispatch',
    'support_sla',
    'support_follow_up',
    'revenue_observe'
  ) then
    raise exception 'Unsupported automation job type: %', p_job_type;
  end if;

  if p_route_scope is not null
    and p_route_scope not in (
      'city_to_city',
      'city_to_governorate',
      'governorate_to_city',
      'governorate_to_governorate'
    ) then
    raise exception 'Unsupported route scope: %', p_route_scope;
  end if;

  if jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'Automation payload must be a JSON object';
  end if;

  v_corridor_id := nullif(trim(coalesce(p_corridor_id, '')), '');
  v_corridor_key := nullif(trim(coalesce(p_corridor_key, p_corridor_id, '')), '');
  v_origin_location := nullif(trim(coalesce(p_origin_location, '')), '');
  v_destination_location := nullif(trim(coalesce(p_destination_location, '')), '');

  v_payload := case
    when p_job_type in ('demand_recovery', 'corridor_conversion', 'pricing_refresh', 'revenue_observe') then
      jsonb_strip_nulls(
        jsonb_build_object(
          'eventName', nullif(trim(coalesce(p_payload ->> 'eventName', '')), ''),
          'funnelStage', nullif(trim(coalesce(p_payload ->> 'funnelStage', '')), ''),
          'serviceType', nullif(trim(coalesce(p_payload ->> 'serviceType', '')), ''),
          'corridorKey', nullif(trim(coalesce(p_payload ->> 'corridorKey', v_corridor_key, '')), ''),
          'pricePressure', nullif(trim(coalesce(p_payload ->> 'pricePressure', '')), ''),
          'priceQuote', case when jsonb_typeof(p_payload -> 'priceQuote') = 'object' then p_payload -> 'priceQuote' else null end,
          'valueJod', case when jsonb_typeof(p_payload -> 'valueJod') = 'number' then p_payload -> 'valueJod' else null end
        )
      )
    when p_job_type in ('retention_nudge', 'reminder_dispatch') then
      jsonb_strip_nulls(
        jsonb_build_object(
          'reminderId', nullif(trim(coalesce(p_payload ->> 'reminderId', '')), ''),
          'label', nullif(trim(coalesce(p_payload ->> 'label', '')), ''),
          'frequency', nullif(trim(coalesce(p_payload ->> 'frequency', '')), ''),
          'preferredTime', nullif(trim(coalesce(p_payload ->> 'preferredTime', '')), ''),
          'deliveredAt', case when jsonb_typeof(p_payload -> 'deliveredAt') = 'string' then p_payload -> 'deliveredAt' else null end
        )
      )
    when p_job_type in ('support_sla', 'support_follow_up') then
      jsonb_strip_nulls(
        jsonb_build_object(
          'ticketId', nullif(trim(coalesce(p_payload ->> 'ticketId', '')), ''),
          'topic', nullif(trim(coalesce(p_payload ->> 'topic', '')), ''),
          'priority', nullif(trim(coalesce(p_payload ->> 'priority', '')), ''),
          'relatedId', nullif(trim(coalesce(p_payload ->> 'relatedId', '')), ''),
          'subject', nullif(trim(coalesce(p_payload ->> 'subject', '')), ''),
          'routeLabel', nullif(trim(coalesce(p_payload ->> 'routeLabel', '')), '')
        )
      )
    else '{}'::jsonb
  end;

  if octet_length(v_payload::text) > 4096 then
    raise exception 'Automation payload exceeds the 4 KB limit';
  end if;

  v_reminder_id := nullif(v_payload ->> 'reminderId', '');
  v_ticket_id := nullif(v_payload ->> 'ticketId', '');

  if v_reminder_id is not null then
    select *
    into v_existing
    from public.automation_jobs
    where user_id = v_user_id
      and job_type = p_job_type
      and job_status in ('queued', 'processing')
      and payload ->> 'reminderId' = v_reminder_id
    order by created_at desc
    limit 1;
  elsif v_ticket_id is not null then
    select *
    into v_existing
    from public.automation_jobs
    where user_id = v_user_id
      and job_type = p_job_type
      and job_status in ('queued', 'processing')
      and payload ->> 'ticketId' = v_ticket_id
    order by created_at desc
    limit 1;
  elsif v_corridor_key is not null then
    select *
    into v_existing
    from public.automation_jobs
    where user_id = v_user_id
      and job_type = p_job_type
      and job_status in ('queued', 'processing')
      and corridor_key = v_corridor_key
    order by created_at desc
    limit 1;
  end if;

  if v_existing.job_id is not null then
    return to_jsonb(v_existing);
  end if;

  select count(*)
  into v_open_jobs
  from public.automation_jobs
  where user_id = v_user_id
    and job_status in ('queued', 'processing');

  if v_open_jobs >= 25 then
    raise exception 'Automation queue is at capacity for this account';
  end if;

  select count(*)
  into v_type_open_jobs
  from public.automation_jobs
  where user_id = v_user_id
    and job_type = p_job_type
    and job_status in ('queued', 'processing');

  if v_type_open_jobs >= 5 then
    raise exception 'Too many pending automation jobs for %', p_job_type;
  end if;

  insert into public.automation_jobs (
    user_id,
    job_type,
    corridor_id,
    corridor_key,
    route_scope,
    origin_location,
    destination_location,
    job_status,
    payload,
    run_after
  )
  values (
    v_user_id,
    p_job_type,
    v_corridor_id,
    v_corridor_key,
    p_route_scope,
    v_origin_location,
    v_destination_location,
    'queued',
    v_payload,
    coalesce(p_run_after, timezone('utc', now()))
  )
  returning *
  into v_job;

  return to_jsonb(v_job);
end;
$$;

create or replace function public.app_create_support_ticket(
  p_topic text,
  p_subject text,
  p_detail text,
  p_related_id text default null,
  p_route_label text default null,
  p_status text default 'open',
  p_priority text default 'low',
  p_channel text default 'in_app',
  p_note text default 'Support ticket created and waiting for review.'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_status text;
  v_priority text;
  v_channel text;
  v_note text;
  v_subject text;
  v_detail text;
  v_ticket public.support_tickets%rowtype;
  v_event public.support_ticket_events%rowtype;
begin
  v_user_id := public.current_user_id();
  if v_user_id is null then
    raise exception 'Authentication required to create support tickets';
  end if;

  v_subject := nullif(trim(coalesce(p_subject, '')), '');
  v_detail := nullif(trim(coalesce(p_detail, '')), '');
  if v_subject is null then
    raise exception 'Support subject is required';
  end if;
  if v_detail is null then
    raise exception 'Support detail is required';
  end if;

  v_status := case
    when p_status in ('investigating', 'waiting_on_user', 'resolved', 'closed') then p_status
    else 'open'
  end;
  v_priority := case
    when p_priority in ('normal', 'high', 'urgent') then p_priority
    else 'low'
  end;
  v_channel := case
    when p_channel in ('operations', 'phone', 'email') then p_channel
    else 'in_app'
  end;
  v_note := nullif(trim(coalesce(p_note, '')), '');
  if v_note is null then
    v_note := 'Support ticket created and waiting for review.';
  end if;

  insert into public.support_tickets (
    user_id,
    topic,
    subject,
    detail,
    related_id,
    route_label,
    status,
    priority,
    channel,
    latest_note,
    sla_due_at
  )
  values (
    v_user_id,
    coalesce(nullif(trim(coalesce(p_topic, '')), ''), 'general'),
    v_subject,
    v_detail,
    nullif(trim(coalesce(p_related_id, '')), ''),
    nullif(trim(coalesce(p_route_label, '')), ''),
    v_status,
    v_priority,
    v_channel,
    v_note,
    case v_priority
      when 'urgent' then timezone('utc', now()) + interval '2 hours'
      when 'high' then timezone('utc', now()) + interval '12 hours'
      when 'normal' then timezone('utc', now()) + interval '24 hours'
      else timezone('utc', now()) + interval '48 hours'
    end
  )
  returning *
  into v_ticket;

  insert into public.support_ticket_events (
    ticket_id,
    status,
    note,
    actor_type
  )
  values (
    v_ticket.ticket_id,
    v_status,
    v_note,
    'system'
  )
  returning *
  into v_event;

  return jsonb_build_object(
    'ticket', to_jsonb(v_ticket),
    'events', jsonb_build_array(to_jsonb(v_event))
  );
end;
$$;

create or replace function public.app_update_support_ticket_status(
  p_ticket_id uuid,
  p_status text,
  p_note text,
  p_resolution_summary text default null,
  p_priority text default null,
  p_channel text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid;
  v_status text;
  v_priority text;
  v_channel text;
  v_note text;
  v_resolution_summary text;
  v_ticket public.support_tickets%rowtype;
  v_event public.support_ticket_events%rowtype;
begin
  v_user_id := public.current_user_id();
  if v_user_id is null and not public.is_admin() then
    raise exception 'Authentication required to update support tickets';
  end if;

  select *
  into v_ticket
  from public.support_tickets
  where ticket_id = p_ticket_id
    and (user_id = v_user_id or public.is_admin())
  for update;

  if v_ticket.ticket_id is null then
    raise exception 'Support ticket not found';
  end if;

  v_status := case
    when p_status in ('investigating', 'waiting_on_user', 'resolved', 'closed') then p_status
    else 'open'
  end;
  v_priority := case
    when p_priority in ('low', 'normal', 'high', 'urgent') then p_priority
    else null
  end;
  v_channel := case
    when p_channel in ('in_app', 'operations', 'phone', 'email') then p_channel
    else null
  end;
  v_note := nullif(trim(coalesce(p_note, '')), '');
  if v_note is null then
    v_note := format('Ticket moved to %s.', v_status);
  end if;
  v_resolution_summary := case
    when p_resolution_summary is null then v_ticket.resolution_summary
    else nullif(trim(p_resolution_summary), '')
  end;

  update public.support_tickets
  set
    status = v_status,
    priority = coalesce(v_priority, priority),
    channel = coalesce(v_channel, channel),
    latest_note = v_note,
    resolution_summary = v_resolution_summary,
    updated_at = timezone('utc', now())
  where ticket_id = p_ticket_id
  returning *
  into v_ticket;

  insert into public.support_ticket_events (
    ticket_id,
    status,
    note,
    actor_type
  )
  values (
    v_ticket.ticket_id,
    v_status,
    v_note,
    'system'
  )
  returning *
  into v_event;

  return jsonb_build_object(
    'ticket', to_jsonb(v_ticket),
    'events', jsonb_build_array(to_jsonb(v_event))
  );
end;
$$;

revoke all on function public.app_enqueue_automation_job(text, text, text, text, text, text, jsonb, timestamptz) from public;
revoke all on function public.app_create_support_ticket(text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.app_update_support_ticket_status(uuid, text, text, text, text, text) from public;

grant execute on function public.app_enqueue_automation_job(text, text, text, text, text, text, jsonb, timestamptz) to authenticated;
grant execute on function public.app_create_support_ticket(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.app_update_support_ticket_status(uuid, text, text, text, text, text) to authenticated;

grant execute on function public.app_enqueue_automation_job(text, text, text, text, text, text, jsonb, timestamptz) to service_role;
grant execute on function public.app_create_support_ticket(text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.app_update_support_ticket_status(uuid, text, text, text, text, text) to service_role;

alter table public.route_reminders enable row level security;
alter table public.pricing_snapshots enable row level security;
alter table public.automation_jobs enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_events enable row level security;

drop policy if exists route_reminders_select_own on public.route_reminders;
create policy route_reminders_select_own
  on public.route_reminders
  for select
  to authenticated
  using (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));

drop policy if exists route_reminders_insert_own on public.route_reminders;
create policy route_reminders_insert_own
  on public.route_reminders
  for insert
  to authenticated
  with check (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));

drop policy if exists route_reminders_update_own on public.route_reminders;
create policy route_reminders_update_own
  on public.route_reminders
  for update
  to authenticated
  using (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text))
  with check (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));

drop policy if exists pricing_snapshots_select_own on public.pricing_snapshots;
create policy pricing_snapshots_select_own
  on public.pricing_snapshots
  for select
  to authenticated
  using (
    user_id is null
    or user_id in (select id from public.users where auth_user_id::text = auth.uid()::text)
  );

drop policy if exists pricing_snapshots_insert_own on public.pricing_snapshots;
create policy pricing_snapshots_insert_own
  on public.pricing_snapshots
  for insert
  to authenticated
  with check (
    user_id is null
    or user_id in (select id from public.users where auth_user_id::text = auth.uid()::text)
  );

drop policy if exists automation_jobs_select_own on public.automation_jobs;
create policy automation_jobs_select_own
  on public.automation_jobs
  for select
  to authenticated
  using (
    user_id is null
    or user_id in (select id from public.users where auth_user_id::text = auth.uid()::text)
  );

drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own
  on public.support_tickets
  for select
  to authenticated
  using (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));

drop policy if exists support_tickets_insert_own on public.support_tickets;
drop policy if exists support_tickets_update_own on public.support_tickets;
drop policy if exists support_ticket_events_select_own on public.support_ticket_events;
create policy support_ticket_events_select_own
  on public.support_ticket_events
  for select
  to authenticated
  using (
    ticket_id in (
      select ticket_id
      from public.support_tickets
      where user_id in (select id from public.users where auth_user_id::text = auth.uid()::text)
    )
  );
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

function getCommunicationWorkerSecret() {
  return Deno.env.get('COMMUNICATION_WORKER_SECRET') ?? '';
}

function getAutomationWorkerSecret() {
  return Deno.env.get('AUTOMATION_WORKER_SECRET') ?? getCommunicationWorkerSecret();
}

function hasCommunicationWorkerAccess(request: Request): boolean {
  const secret = getCommunicationWorkerSecret();
  if (!secret) return false;
  return request.headers.get('x-communication-worker-secret') === secret;
}

function hasAutomationWorkerAccess(request: Request): boolean {
  const secret = getAutomationWorkerSecret();
  if (!secret) return false;
  return (
    request.headers.get('x-automation-worker-secret') === secret ||
    request.headers.get('x-communication-worker-secret') === secret
  );
}

function getFunctionBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return url.href.replace(/\/(communications|automation)\/.*$/, '').replace(/\/health$/, '');
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
      workerSecretConfigured: Boolean(getCommunicationWorkerSecret()),
      webhookTokenConfigured: Boolean(deliveryEnv.communicationWebhookToken),
    },
    automation: {
      workerSecretConfigured: Boolean(getAutomationWorkerSecret()),
      maxAttempts: Number(Deno.env.get('AUTOMATION_MAX_ATTEMPTS') ?? '5'),
      inlineCommunications: Deno.env.get('AUTOMATION_PROCESS_COMMUNICATIONS_INLINE') === 'true',
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

  if (Deno.env.get('COMMUNICATION_PROCESS_INLINE') === 'true' && hasCommunicationWorkerAccess(request)) {
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
  if (!hasCommunicationWorkerAccess(request)) {
    return json({ error: 'Missing worker secret' }, 401);
  }

  const admin = getAdminClient();
  const result = await processQueuedDeliveries(admin, getFunctionBaseUrl(request));
  return json(result);
}

async function handleSendTestCommunication(request: Request) {
  if (!hasCommunicationWorkerAccess(request)) {
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
  if (!hasCommunicationWorkerAccess(request)) {
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
  if (!hasCommunicationWorkerAccess(request)) {
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

const defaultAutomationPreferences = {
  in_app_enabled: true,
  push_enabled: true,
  email_enabled: true,
  sms_enabled: true,
  whatsapp_enabled: false,
  trip_updates_enabled: true,
  promotions_enabled: false,
  critical_alerts_enabled: true,
};

async function backfillAutomationJobs(
  admin: ReturnType<typeof getAdminClient>,
  maxRows = 100,
) {
  const { data, error } = await admin.rpc('app_backfill_automation_jobs', {
    max_rows: Math.max(1, Math.min(maxRows, 500)),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as Record<string, number> | null;
}

async function claimAutomationJobs(
  admin: ReturnType<typeof getAdminClient>,
  workerName: string,
  limit = 25,
) {
  const { data, error } = await admin.rpc('app_claim_automation_jobs', {
    max_jobs: Math.max(1, Math.min(limit, 100)),
    worker_name: workerName,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (Array.isArray(data) ? data : []) as AutomationJobRecord[];
}

async function getAutomationUserContext(
  admin: ReturnType<typeof getAdminClient>,
  userId?: string | null,
) {
  if (!userId) return null;

  const [{ data: userRow, error: userError }, { data: preferencesRow, error: preferencesError }] = await Promise.all([
    admin
      .from('users')
      .select('id, email, phone_number, full_name')
      .eq('id', userId)
      .maybeSingle(),
    admin
      .from('communication_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (userError) {
    throw new Error(userError.message);
  }

  if (preferencesError) {
    throw new Error(preferencesError.message);
  }

  return {
    user: userRow,
    preferences: {
      ...defaultAutomationPreferences,
      ...(preferencesRow ?? {}),
    },
  };
}

function isAutomationTopicEnabled(
  plan: NonNullable<ReturnType<typeof buildAutomationNotification>>,
  preferences: Record<string, unknown>,
) {
  if (plan.type === 'promotions') {
    return preferences.promotions_enabled === true;
  }

  if (plan.type === 'critical_alerts') {
    return preferences.critical_alerts_enabled !== false;
  }

  return preferences.trip_updates_enabled !== false;
}

async function upsertAutomationNotification(
  admin: ReturnType<typeof getAdminClient>,
  job: AutomationJobRecord,
  plan: NonNullable<ReturnType<typeof buildAutomationNotification>>,
) {
  if (!job.user_id) return null;
  const context = await getAutomationUserContext(admin, job.user_id);
  if (!context?.user || !isAutomationTopicEnabled(plan, context.preferences) || context.preferences.in_app_enabled === false) {
    return null;
  }

  const { data: existing, error: existingError } = await admin
    .from('notifications')
    .select('id')
    .eq('user_id', job.user_id)
    .contains('metadata', { automation_job_id: job.job_id })
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    return existing;
  }

  const { data, error } = await admin
    .from('notifications')
    .insert({
      user_id: job.user_id,
      title: plan.title,
      message: plan.message,
      type: plan.type,
      read: false,
      is_read: false,
      metadata: {
        priority: plan.priority,
        action_url: plan.actionUrl ?? buildAutomationActionUrl(job),
        automation_job_id: job.job_id,
        automation_job_type: job.job_type,
      },
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function queueAutomationDeliveries(
  admin: ReturnType<typeof getAdminClient>,
  job: AutomationJobRecord,
  plan: NonNullable<ReturnType<typeof buildAutomationNotification>>,
  notificationId?: string | null,
) {
  const context = await getAutomationUserContext(admin, job.user_id);
  if (!context?.user) {
    return 0;
  }

  if (!isAutomationTopicEnabled(plan, context.preferences)) {
    return 0;
  }

  const requests: Array<Record<string, unknown>> = [];
  const actionUrl = plan.actionUrl ?? buildAutomationActionUrl(job);

  for (const channel of plan.channels) {
    if (channel === 'email' && context.preferences.email_enabled !== false && context.user.email) {
      requests.push({
        user_id: context.user.id,
        notification_id: notificationId ?? null,
        channel,
        delivery_status: 'queued',
        destination: context.user.email,
        subject: plan.title,
        payload: {
          body: plan.message,
          metadata: { automation_job_id: job.job_id, action_url: actionUrl ?? null },
        },
        provider_name: determineProviderName(channel),
        queued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        idempotency_key: buildIdempotencyKey({
          deliveryId: `${job.job_id}:${channel}`,
          channel,
          destination: context.user.email,
          body: plan.message,
        }),
      });
    }

    if (
      (channel === 'sms' || channel === 'whatsapp') &&
      context.user.phone_number &&
      (
        (channel === 'sms' && context.preferences.sms_enabled !== false) ||
        (channel === 'whatsapp' && context.preferences.whatsapp_enabled === true)
      )
    ) {
      requests.push({
        user_id: context.user.id,
        notification_id: notificationId ?? null,
        channel,
        delivery_status: 'queued',
        destination: context.user.phone_number,
        subject: plan.title,
        payload: {
          body: plan.message,
          metadata: { automation_job_id: job.job_id, action_url: actionUrl ?? null },
        },
        provider_name: determineProviderName(channel),
        queued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        idempotency_key: buildIdempotencyKey({
          deliveryId: `${job.job_id}:${channel}`,
          channel,
          destination: context.user.phone_number,
          body: plan.message,
        }),
      });
    }
  }

  if (requests.length === 0) {
    return 0;
  }

  const { data, error } = await admin
    .from('communication_deliveries')
    .upsert(requests, { onConflict: 'idempotency_key', ignoreDuplicates: true })
    .select('delivery_id');

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data.length : requests.length;
}

async function updateAutomationJob(
  admin: ReturnType<typeof getAdminClient>,
  jobId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin
    .from('automation_jobs')
    .update(patch)
    .eq('job_id', jobId);

  if (error) {
    throw new Error(error.message);
  }
}

async function ensureQueuedReminderDispatch(
  admin: ReturnType<typeof getAdminClient>,
  reminder: Record<string, unknown>,
  nextReminderAt: string,
) {
  const reminderId = String(reminder.reminder_id ?? '');
  if (!reminderId) return;

  const { data: existing, error: existingError } = await admin
    .from('automation_jobs')
    .select('job_id')
    .eq('job_type', 'reminder_dispatch')
    .in('job_status', ['queued', 'processing'])
    .contains('payload', { reminderId })
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.job_id) {
    return;
  }

  const { error } = await admin
    .from('automation_jobs')
    .insert({
      user_id: reminder.user_id ?? null,
      job_type: 'reminder_dispatch',
      corridor_id: reminder.corridor_id ?? null,
      corridor_key: reminder.corridor_id ?? null,
      route_scope: null,
      origin_location: reminder.origin_location ?? null,
      destination_location: reminder.destination_location ?? null,
      job_status: 'queued',
      payload: {
        reminderId,
        label: reminder.label ?? null,
        frequency: reminder.frequency ?? null,
        preferredTime: reminder.preferred_time ?? null,
      },
      run_after: nextReminderAt,
    });

  if (error) {
    throw new Error(error.message);
  }
}

async function executeReminderDispatch(
  admin: ReturnType<typeof getAdminClient>,
  job: AutomationJobRecord,
) {
  const payload = job.payload ?? {};
  const reminderId = String(payload.reminderId ?? '').trim();
  const now = new Date();

  if (!reminderId) {
    return { patch: { job_status: 'completed', completed_at: now.toISOString(), locked_at: null, updated_at: now.toISOString() }, notifications: 0, deliveries: 0 };
  }

  const { data: reminder, error } = await admin
    .from('route_reminders')
    .select('*')
    .eq('reminder_id', reminderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!reminder || reminder.enabled === false) {
    return { patch: { job_status: 'completed', completed_at: now.toISOString(), locked_at: null, updated_at: now.toISOString() }, notifications: 0, deliveries: 0 };
  }

  const dueAt = new Date(String(reminder.next_reminder_at ?? now.toISOString()));
  if (!Number.isNaN(dueAt.getTime()) && dueAt.getTime() > now.getTime() + 60_000) {
    return {
      patch: {
        job_status: 'queued',
        run_after: dueAt.toISOString(),
        locked_at: null,
        completed_at: null,
        updated_at: now.toISOString(),
      },
      notifications: 0,
      deliveries: 0,
    };
  }

  const frequency = (
    reminder.frequency === 'weekdays' || reminder.frequency === 'weekly'
      ? reminder.frequency
      : 'daily'
  ) as ReminderFrequency;
  const preferredTime = String(reminder.preferred_time ?? '07:30');
  const nextReminderAt = nextReminderDate(frequency, preferredTime, now).toISOString();

  const plan = buildAutomationNotification(
    {
      ...job,
      corridor_id: String(reminder.corridor_id ?? job.corridor_id ?? ''),
      origin_location: String(reminder.origin_location ?? job.origin_location ?? ''),
      destination_location: String(reminder.destination_location ?? job.destination_location ?? ''),
    },
    {
      reminderLabel: String(reminder.label ?? payload.label ?? describeRoute(job)),
    },
  );

  let notificationCount = 0;
  let deliveriesQueued = 0;
  if (plan) {
    const notification = await upsertAutomationNotification(admin, job, plan);
    notificationCount = notification?.id ? 1 : 0;
    deliveriesQueued = await queueAutomationDeliveries(admin, job, plan, notification?.id as string | undefined);
  }

  const { error: updateReminderError } = await admin
    .from('route_reminders')
    .update({
      next_reminder_at: nextReminderAt,
      last_sent_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('reminder_id', reminderId);

  if (updateReminderError) {
    throw new Error(updateReminderError.message);
  }

  await ensureQueuedReminderDispatch(admin, reminder as Record<string, unknown>, nextReminderAt);

  return {
    patch: {
      job_status: 'completed',
      completed_at: now.toISOString(),
      locked_at: null,
      last_error: null,
      updated_at: now.toISOString(),
    },
    notifications: notificationCount,
    deliveries: deliveriesQueued,
  };
}

async function executeSupportSla(
  admin: ReturnType<typeof getAdminClient>,
  job: AutomationJobRecord,
) {
  const payload = job.payload ?? {};
  const ticketId = String(payload.ticketId ?? '').trim();
  const now = new Date();

  if (!ticketId) {
    return { patch: { job_status: 'completed', completed_at: now.toISOString(), locked_at: null, updated_at: now.toISOString() }, notifications: 0, deliveries: 0 };
  }

  const { data: ticket, error } = await admin
    .from('support_tickets')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!ticket || ticket.status === 'resolved' || ticket.status === 'closed') {
    return { patch: { job_status: 'completed', completed_at: now.toISOString(), locked_at: null, updated_at: now.toISOString() }, notifications: 0, deliveries: 0 };
  }

  const slaDueAt = new Date(String(ticket.sla_due_at ?? now.toISOString()));
  if (!Number.isNaN(slaDueAt.getTime()) && slaDueAt.getTime() > now.getTime() + 60_000) {
    return {
      patch: {
        job_status: 'queued',
        run_after: slaDueAt.toISOString(),
        locked_at: null,
        completed_at: null,
        updated_at: now.toISOString(),
      },
      notifications: 0,
      deliveries: 0,
    };
  }

  const escalatedPriority =
    ticket.priority === 'urgent'
      ? 'urgent'
      : ticket.priority === 'high'
        ? 'urgent'
        : 'high';
  const escalatedStatus = ticket.status === 'open' ? 'investigating' : ticket.status;
  const shouldNotify = ticket.status === 'open' || ticket.priority !== escalatedPriority;
  const note = shouldNotify
    ? 'Automation escalated this support request after its SLA threshold.'
    : 'Automation re-checked this open support request after its SLA threshold.';

  if (shouldNotify) {
    const { error: ticketUpdateError } = await admin
      .from('support_tickets')
      .update({
        status: escalatedStatus,
        priority: escalatedPriority,
        latest_note: note,
        updated_at: now.toISOString(),
      })
      .eq('ticket_id', ticketId);

    if (ticketUpdateError) {
      throw new Error(ticketUpdateError.message);
    }

    const { error: eventError } = await admin
      .from('support_ticket_events')
      .insert({
        ticket_id: ticketId,
        status: escalatedStatus,
        note,
        actor_type: 'system',
      });

    if (eventError) {
      throw new Error(eventError.message);
    }
  }

  let notificationCount = 0;
  let deliveriesQueued = 0;
  if (shouldNotify) {
    const route = splitRouteLabel(String(ticket.route_label ?? payload.routeLabel ?? ''));
    const plan = buildAutomationNotification(
      {
        ...job,
        origin_location: route.from ?? job.origin_location ?? undefined,
        destination_location: route.to ?? job.destination_location ?? undefined,
      },
      {
        supportSubject: String(ticket.subject ?? payload.subject ?? 'Support request'),
        supportPriority: escalatedPriority,
      },
    );

    if (plan) {
      const notification = await upsertAutomationNotification(admin, job, plan);
      notificationCount = notification?.id ? 1 : 0;
      deliveriesQueued = await queueAutomationDeliveries(admin, job, plan, notification?.id as string | undefined);
    }
  }

  return {
    patch: {
      job_status: 'queued',
      run_after: new Date(now.getTime() + (6 * 60 * 60_000)).toISOString(),
      locked_at: null,
      completed_at: null,
      last_error: null,
      updated_at: now.toISOString(),
    },
    notifications: notificationCount,
    deliveries: deliveriesQueued,
  };
}

async function executeAutomationJob(
  admin: ReturnType<typeof getAdminClient>,
  job: AutomationJobRecord,
) {
  if (job.job_type === 'reminder_dispatch') {
    return executeReminderDispatch(admin, job);
  }

  if (job.job_type === 'support_sla') {
    return executeSupportSla(admin, job);
  }

  const now = new Date();
  const plan = buildAutomationNotification(job);
  if (!plan) {
    return {
      patch: {
        job_status: 'completed',
        completed_at: now.toISOString(),
        locked_at: null,
        last_error: null,
        updated_at: now.toISOString(),
      },
      notifications: 0,
      deliveries: 0,
    };
  }

  const notification = await upsertAutomationNotification(admin, job, plan);
  const deliveries = await queueAutomationDeliveries(admin, job, plan, notification?.id as string | undefined);

  return {
    patch: {
      job_status: 'completed',
      completed_at: now.toISOString(),
      locked_at: null,
      last_error: null,
      updated_at: now.toISOString(),
    },
    notifications: notification?.id ? 1 : 0,
    deliveries,
  };
}

async function processAutomationQueue(
  admin: ReturnType<typeof getAdminClient>,
  options: {
    limit?: number;
    backfill?: boolean;
    inlineCommunications?: boolean;
    functionBaseUrl: string;
  },
) {
  const workerName = 'edge:automation-process';
  const counts = {
    claimed: 0,
    completed: 0,
    requeued: 0,
    failed: 0,
    notifications: 0,
    deliveriesQueued: 0,
    backfill: null as Record<string, number> | null,
  };

  if (options.backfill !== false) {
    counts.backfill = await backfillAutomationJobs(admin, 200);
  }

  const jobs = await claimAutomationJobs(admin, workerName, options.limit ?? 25);
  counts.claimed = jobs.length;

  for (const job of jobs) {
    try {
      const result = await executeAutomationJob(admin, job);
      await updateAutomationJob(admin, job.job_id, result.patch);
      counts.notifications += result.notifications;
      counts.deliveriesQueued += result.deliveries;
      if (result.patch.job_status === 'completed') counts.completed += 1;
      if (result.patch.job_status === 'queued') counts.requeued += 1;
    } catch (error) {
      const patch = buildAutomationFailurePatch({
        attemptsCount: Number(job.attempts_count ?? 1),
        errorMessage: error instanceof Error ? error.message : String(error),
        maxAttempts: Number(Deno.env.get('AUTOMATION_MAX_ATTEMPTS') ?? '5'),
      });
      await updateAutomationJob(admin, job.job_id, patch);
      if (patch.job_status === 'failed') counts.failed += 1;
      else counts.requeued += 1;
    }
  }

  let communicationProcessing = null;
  if (options.inlineCommunications) {
    communicationProcessing = await processQueuedDeliveries(admin, options.functionBaseUrl);
  }

  return {
    ...counts,
    communicationProcessing,
  };
}

async function handleProcessAutomationQueue(request: Request) {
  if (!hasAutomationWorkerAccess(request)) {
    return json({ error: 'Missing worker secret' }, 401);
  }

  const body = await request.json().catch(() => ({}));
  const admin = getAdminClient();
  try {
    const result = await processAutomationQueue(admin, {
      limit: Number(body.limit ?? 25),
      backfill: body.backfill !== false,
      inlineCommunications:
        body.inlineCommunications === true ||
        Deno.env.get('AUTOMATION_PROCESS_COMMUNICATIONS_INLINE') === 'true',
      functionBaseUrl: getFunctionBaseUrl(request),
    });
    return json(result);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : String(error),
      hint: 'Make sure the automation migration has been applied before processing the queue.',
    }, 500);
  }
}

async function handleApplyAutomationMigrations(request: Request) {
  if (!hasAutomationWorkerAccess(request)) {
    return json({ error: 'Missing worker secret' }, 401);
  }

  await executeSqlStatements(AUTOMATION_RUNTIME_SQL);

  return json({
    applied: [
      '20260404110000_route_automation_backbone.sql',
      '20260406101500_harden_automation_queue_access_and_support_rpcs.sql',
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

    if (request.method === 'POST' && path === '/automation/process') {
      return await handleProcessAutomationQueue(request);
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

    if (request.method === 'POST' && path === '/automation/admin/apply-migrations') {
      return await handleApplyAutomationMigrations(request);
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
