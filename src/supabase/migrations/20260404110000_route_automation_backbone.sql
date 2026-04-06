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

create index if not exists support_tickets_user_idx
  on public.support_tickets (user_id, updated_at desc);

create index if not exists support_tickets_status_idx
  on public.support_tickets (status, priority, updated_at desc);

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

drop policy if exists automation_jobs_insert_own on public.automation_jobs;
create policy automation_jobs_insert_own
  on public.automation_jobs
  for insert
  to authenticated
  with check (
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
create policy support_tickets_insert_own
  on public.support_tickets
  for insert
  to authenticated
  with check (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));

drop policy if exists support_tickets_update_own on public.support_tickets;
create policy support_tickets_update_own
  on public.support_tickets
  for update
  to authenticated
  using (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text))
  with check (user_id in (select id from public.users where auth_user_id::text = auth.uid()::text));

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

drop policy if exists support_ticket_events_insert_own on public.support_ticket_events;
create policy support_ticket_events_insert_own
  on public.support_ticket_events
  for insert
  to authenticated
  with check (
    ticket_id in (
      select ticket_id
      from public.support_tickets
      where user_id in (select id from public.users where auth_user_id::text = auth.uid()::text)
    )
  );
