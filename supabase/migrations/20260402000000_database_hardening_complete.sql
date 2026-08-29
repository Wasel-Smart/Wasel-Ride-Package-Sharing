-- =====================================================
-- Database Hardening and Audit Logging Migration
-- Version: 2.0
-- Date: 2025
-- =====================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================
-- AUDIT LOGGING SYSTEM
-- =====================================================

-- Create audit log table
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  user_id uuid references public.users(id),
  ip_address inet,
  user_agent text,
  timestamp timestamptz not null default now(),
  
  -- Indexes for performance
  constraint audit_logs_action_check check (action in ('INSERT', 'UPDATE', 'DELETE'))
);

create index if not exists idx_audit_logs_table_name on public.audit_logs(table_name);
create index if not exists idx_audit_logs_record_id on public.audit_logs(record_id);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);
create index if not exists idx_audit_logs_action on public.audit_logs(action);

-- Enable RLS on audit logs
alter table public.audit_logs enable row level security;

-- Only admins can view audit logs
create policy "Admins can view audit logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );

-- =====================================================
-- SOFT DELETE IMPLEMENTATION
-- =====================================================

-- Add deleted_at column to critical tables
alter table public.users add column if not exists deleted_at timestamptz;
alter table public.ride_bookings add column if not exists deleted_at timestamptz;
alter table public.packages add column if not exists deleted_at timestamptz;
alter table public.wallet_transactions add column if not exists deleted_at timestamptz;

-- Create indexes for soft delete queries
create index if not exists idx_users_deleted_at on public.users(deleted_at) where deleted_at is null;
create index if not exists idx_ride_bookings_deleted_at on public.ride_bookings(deleted_at) where deleted_at is null;
create index if not exists idx_packages_deleted_at on public.packages(deleted_at) where deleted_at is null;
create index if not exists idx_wallet_transactions_deleted_at on public.wallet_transactions(deleted_at) where deleted_at is null;

-- =====================================================
-- DATA VERSIONING
-- =====================================================

-- Add version columns
alter table public.users add column if not exists version integer not null default 1;
alter table public.ride_bookings add column if not exists version integer not null default 1;
alter table public.packages add column if not exists version integer not null default 1;

-- =====================================================
-- ENHANCED CONSTRAINTS
-- =====================================================

-- Users table constraints
alter table public.users
  add constraint if not exists users_email_format_check 
    check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  add constraint if not exists users_phone_format_check
    check (phone_number ~* '^\+?[1-9]\d{1,14}$' or phone_number like 'pending-%');

-- Ride bookings constraints
alter table public.ride_bookings
  add constraint if not exists ride_bookings_seats_positive
    check (seats_requested > 0 and seats_requested <= 8),
  add constraint if not exists ride_bookings_price_positive
    check (price_per_seat >= 0);

-- Packages constraints  
alter table public.packages
  add constraint if not exists packages_weight_positive
    check (weight_kg > 0 and weight_kg <= 100),
  add constraint if not exists packages_price_positive
    check (delivery_fee >= 0);

-- Wallet transactions constraints
alter table public.wallet_transactions
  add constraint if not exists wallet_transactions_amount_nonzero
    check (amount != 0);

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Ensure referential integrity (add if not exists)
do $$
begin
  -- Ride bookings foreign keys
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'ride_bookings_passenger_id_fkey'
  ) then
    alter table public.ride_bookings
      add constraint ride_bookings_passenger_id_fkey
      foreign key (passenger_id) references public.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'ride_bookings_driver_id_fkey'
  ) then
    alter table public.ride_bookings
      add constraint ride_bookings_driver_id_fkey
      foreign key (driver_id) references public.users(id) on delete set null;
  end if;

  -- Packages foreign keys
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'packages_sender_id_fkey'
  ) then
    alter table public.packages
      add constraint packages_sender_id_fkey
      foreign key (sender_id) references public.users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'packages_receiver_id_fkey'
  ) then
    alter table public.packages
      add constraint packages_receiver_id_fkey
      foreign key (receiver_id) references public.users(id) on delete set null;
  end if;

  -- Wallet transactions foreign keys
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'wallet_transactions_user_id_fkey'
  ) then
    alter table public.wallet_transactions
      add constraint wallet_transactions_user_id_fkey
      foreign key (user_id) references public.users(id) on delete cascade;
  end if;
end $$;

-- =====================================================
-- AUDIT TRIGGER FUNCTION
-- =====================================================

create or replace function public.audit_trigger_function()
returns trigger
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed_fields text[];
begin
  -- Get current user ID
  v_user_id := auth.uid();

  -- Prepare data based on operation
  if (TG_OP = 'DELETE') then
    v_old_data := to_jsonb(OLD);
    v_new_data := null;
  elsif (TG_OP = 'UPDATE') then
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    
    -- Calculate changed fields
    select array_agg(key)
    into v_changed_fields
    from jsonb_each(v_new_data)
    where v_new_data->key is distinct from v_old_data->key;
  elsif (TG_OP = 'INSERT') then
    v_old_data := null;
    v_new_data := to_jsonb(NEW);
  end if;

  -- Insert audit log
  insert into public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    user_id
  ) values (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    TG_OP,
    v_old_data,
    v_new_data,
    v_changed_fields,
    v_user_id
  );

  if (TG_OP = 'DELETE') then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- =====================================================
-- APPLY AUDIT TRIGGERS TO CRITICAL TABLES
-- =====================================================

-- Users table
drop trigger if exists audit_users_trigger on public.users;
create trigger audit_users_trigger
  after insert or update or delete on public.users
  for each row execute function public.audit_trigger_function();

-- Ride bookings table
drop trigger if exists audit_ride_bookings_trigger on public.ride_bookings;
create trigger audit_ride_bookings_trigger
  after insert or update or delete on public.ride_bookings
  for each row execute function public.audit_trigger_function();

-- Packages table
drop trigger if exists audit_packages_trigger on public.packages;
create trigger audit_packages_trigger
  after insert or update or delete on public.packages
  for each row execute function public.audit_trigger_function();

-- Wallet transactions table
drop trigger if exists audit_wallet_transactions_trigger on public.wallet_transactions;
create trigger audit_wallet_transactions_trigger
  after insert or update or delete on public.wallet_transactions
  for each row execute function public.audit_trigger_function();

-- =====================================================
-- VERSION INCREMENT TRIGGER
-- =====================================================

create or replace function public.increment_version()
returns trigger
language plpgsql
as $$
begin
  NEW.version := OLD.version + 1;
  return NEW;
end;
$$;

-- Apply version triggers
drop trigger if exists increment_users_version on public.users;
create trigger increment_users_version
  before update on public.users
  for each row execute function public.increment_version();

drop trigger if exists increment_ride_bookings_version on public.ride_bookings;
create trigger increment_ride_bookings_version
  before update on public.ride_bookings
  for each row execute function public.increment_version();

drop trigger if exists increment_packages_version on public.packages;
create trigger increment_packages_version
  before update on public.packages
  for each row execute function public.increment_version();

-- =====================================================
-- DATA RETENTION POLICIES
-- =====================================================

-- Function to archive old audit logs
create or replace function public.archive_old_audit_logs()
returns void
language plpgsql
security definer
as $$
begin
  -- Delete audit logs older than 1 year
  delete from public.audit_logs
  where timestamp < now() - interval '1 year';
end;
$$;

-- Function to clean soft-deleted records
create or replace function public.clean_soft_deleted_records()
returns void
language plpgsql
security definer
as $$
begin
  -- Permanently delete records soft-deleted more than 90 days ago
  delete from public.users where deleted_at < now() - interval '90 days';
  delete from public.ride_bookings where deleted_at < now() - interval '90 days';
  delete from public.packages where deleted_at < now() - interval '90 days';
  delete from public.wallet_transactions where deleted_at < now() - interval '90 days';
end;
$$;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Users indexes
create index if not exists idx_users_email on public.users(email) where deleted_at is null;
create index if not exists idx_users_phone on public.users(phone_number) where deleted_at is null;
create index if not exists idx_users_role on public.users(role) where deleted_at is null;

-- Ride bookings indexes
create index if not exists idx_ride_bookings_passenger on public.ride_bookings(passenger_id) where deleted_at is null;
create index if not exists idx_ride_bookings_driver on public.ride_bookings(driver_id) where deleted_at is null;
create index if not exists idx_ride_bookings_status on public.ride_bookings(status) where deleted_at is null;
create index if not exists idx_ride_bookings_created on public.ride_bookings(created_at desc) where deleted_at is null;

-- Packages indexes
create index if not exists idx_packages_sender on public.packages(sender_id) where deleted_at is null;
create index if not exists idx_packages_receiver on public.packages(receiver_id) where deleted_at is null;
create index if not exists idx_packages_status on public.packages(status) where deleted_at is null;

-- Wallet transactions indexes
create index if not exists idx_wallet_transactions_user on public.wallet_transactions(user_id) where deleted_at is null;
create index if not exists idx_wallet_transactions_type on public.wallet_transactions(transaction_type) where deleted_at is null;
create index if not exists idx_wallet_transactions_created on public.wallet_transactions(created_at desc) where deleted_at is null;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
grant execute on function public.archive_old_audit_logs() to authenticated;
grant execute on function public.clean_soft_deleted_records() to authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

comment on table public.audit_logs is 'Comprehensive audit trail for all data changes';
comment on function public.audit_trigger_function() is 'Automatically logs all INSERT, UPDATE, DELETE operations';
comment on function public.increment_version() is 'Increments version number on each update for optimistic locking';
comment on function public.archive_old_audit_logs() is 'Archives audit logs older than 1 year';
comment on function public.clean_soft_deleted_records() is 'Permanently deletes soft-deleted records after 90 days';
