create table if not exists public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  privacy jsonb not null default jsonb_build_object(
    'showProfile', true,
    'shareLocation', true,
    'hidePhoto', false,
    'dataAnalytics', false
  ),
  display jsonb not null default jsonb_build_object(
    'language', 'en',
    'currency', 'JOD',
    'theme', 'dark',
    'direction', 'ltr'
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_settings_language_check
    check ((display ->> 'language') in ('en', 'ar')),
  constraint user_settings_direction_check
    check ((display ->> 'direction') in ('ltr', 'rtl')),
  constraint user_settings_theme_check
    check ((display ->> 'theme') in ('light', 'dark', 'system'))
);

create table if not exists public.safety_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  emergency_contacts jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '{}'::jsonb,
  prayer_stops boolean not null default true,
  ramadan_mode boolean not null default false,
  gender_preference text not null default 'no_preference'
    check (gender_preference in (
      'no_preference',
      'same_gender_only',
      'male_drivers_only',
      'female_drivers_only'
    )),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.safety_incidents (
  incident_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  incident_type text not null,
  description text not null,
  incident_status text not null default 'submitted'
    check (incident_status in ('submitted', 'under_review', 'resolved')),
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.safety_sos_alerts (
  alert_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  location_label text,
  alert_status text not null default 'notified'
    check (alert_status in ('created', 'notified', 'failed')),
  user_context jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_settings_updated_idx
  on public.user_settings(updated_at desc);

create index if not exists safety_incidents_user_submitted_idx
  on public.safety_incidents(user_id, submitted_at desc);

create index if not exists safety_sos_alerts_user_created_idx
  on public.safety_sos_alerts(user_id, created_at desc);

alter table public.user_settings enable row level security;
alter table public.safety_settings enable row level security;
alter table public.safety_incidents enable row level security;
alter table public.safety_sos_alerts enable row level security;

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own
  on public.user_settings
  for select
  to authenticated
  using (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  );

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own
  on public.user_settings
  for insert
  to authenticated
  with check (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  );

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own
  on public.user_settings
  for update
  to authenticated
  using (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  )
  with check (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  );

drop policy if exists safety_settings_select_own on public.safety_settings;
create policy safety_settings_select_own
  on public.safety_settings
  for select
  to authenticated
  using (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  );

drop policy if exists safety_settings_insert_own on public.safety_settings;
create policy safety_settings_insert_own
  on public.safety_settings
  for insert
  to authenticated
  with check (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  );

drop policy if exists safety_settings_update_own on public.safety_settings;
create policy safety_settings_update_own
  on public.safety_settings
  for update
  to authenticated
  using (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  )
  with check (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  );

drop policy if exists safety_incidents_select_own on public.safety_incidents;
create policy safety_incidents_select_own
  on public.safety_incidents
  for select
  to authenticated
  using (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  );

drop policy if exists safety_incidents_insert_own on public.safety_incidents;
create policy safety_incidents_insert_own
  on public.safety_incidents
  for insert
  to authenticated
  with check (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  );

drop policy if exists safety_sos_alerts_select_own on public.safety_sos_alerts;
create policy safety_sos_alerts_select_own
  on public.safety_sos_alerts
  for select
  to authenticated
  using (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  );

drop policy if exists safety_sos_alerts_insert_own on public.safety_sos_alerts;
create policy safety_sos_alerts_insert_own
  on public.safety_sos_alerts
  for insert
  to authenticated
  with check (
    user_id in (
      select id from public.users where auth_user_id::text = auth.uid()::text
    )
  );
