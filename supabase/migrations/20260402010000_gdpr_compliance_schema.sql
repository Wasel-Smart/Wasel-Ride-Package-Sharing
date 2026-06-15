-- =====================================================
-- GDPR Compliance Schema
-- Implements data privacy and user rights
-- =====================================================

-- User consents table
create table if not exists public.user_consents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'marketing', 'analytics', 'cookies')),
  granted boolean not null,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  
  -- Indexes
  constraint user_consents_type_check check (consent_type in ('terms', 'privacy', 'marketing', 'analytics', 'cookies'))
);

create index if not exists idx_user_consents_user_id on public.user_consents(user_id);
create index if not exists idx_user_consents_type on public.user_consents(consent_type);
create index if not exists idx_user_consents_created on public.user_consents(created_at desc);

-- Data export requests table
create table if not exists public.data_export_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  download_url text,
  expires_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  
  constraint data_export_requests_status_check check (status in ('pending', 'processing', 'completed', 'failed'))
);

create index if not exists idx_data_export_requests_user_id on public.data_export_requests(user_id);
create index if not exists idx_data_export_requests_status on public.data_export_requests(status);
create index if not exists idx_data_export_requests_requested on public.data_export_requests(requested_at desc);

-- Data deletion requests table
create table if not exists public.data_deletion_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  completed_at timestamptz,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'cancelled', 'completed')),
  
  constraint data_deletion_requests_status_check check (status in ('pending', 'cancelled', 'completed'))
);

create index if not exists idx_data_deletion_requests_user_id on public.data_deletion_requests(user_id);
create index if not exists idx_data_deletion_requests_status on public.data_deletion_requests(status);
create index if not exists idx_data_deletion_requests_scheduled on public.data_deletion_requests(scheduled_for);

-- Enable RLS
alter table public.user_consents enable row level security;
alter table public.data_export_requests enable row level security;
alter table public.data_deletion_requests enable row level security;

-- RLS Policies for user_consents
create policy "Users can view their own consents"
  on public.user_consents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own consents"
  on public.user_consents for insert
  with check (auth.uid() = user_id);

-- RLS Policies for data_export_requests
create policy "Users can view their own export requests"
  on public.data_export_requests for select
  using (auth.uid() = user_id);

create policy "Users can create export requests"
  on public.data_export_requests for insert
  with check (auth.uid() = user_id);

-- RLS Policies for data_deletion_requests
create policy "Users can view their own deletion requests"
  on public.data_deletion_requests for select
  using (auth.uid() = user_id);

create policy "Users can create deletion requests"
  on public.data_deletion_requests for insert
  with check (auth.uid() = user_id);

create policy "Users can cancel their deletion requests"
  on public.data_deletion_requests for update
  using (auth.uid() = user_id and status = 'pending')
  with check (status = 'cancelled');

-- Comments
comment on table public.user_consents is 'Tracks user consent for various data processing activities';
comment on table public.data_export_requests is 'Manages user data export requests (GDPR Right to Data Portability)';
comment on table public.data_deletion_requests is 'Manages user account deletion requests (GDPR Right to be Forgotten)';
