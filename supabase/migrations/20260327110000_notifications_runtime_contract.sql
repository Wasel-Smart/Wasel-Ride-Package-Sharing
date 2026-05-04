-- Notifications are still part of the live web-app contract, but the
-- operating-model migration family does not create this table directly.
-- This migration creates or normalizes the runtime notifications table after
-- the canonical users/trips/bookings tables exist.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  title_ar text,
  message text not null,
  message_ar text,
  metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  is_read boolean not null default false,
  read_at timestamptz,
  action_url text,
  related_booking_id uuid,
  related_trip_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.notifications
  add column if not exists title_ar text,
  add column if not exists message_ar text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists is_read boolean not null default false,
  add column if not exists action_url text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'data'
  ) then
    execute $sql$
      update public.notifications
      set metadata = coalesce(metadata, data, '{}'::jsonb)
      where metadata is null
         or metadata = '{}'::jsonb
    $sql$;
  end if;
end $$;

update public.notifications
set is_read = coalesce(is_read, read, false)
where is_read is distinct from coalesce(read, false);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_user_id_fkey'
  ) then
    begin
      alter table public.notifications
        add constraint notifications_user_id_fkey
        foreign key (user_id) references public.users(id) on delete cascade not valid;
    exception
      when duplicate_object then
        null;
    end;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_related_booking_id_fkey'
  ) then
    begin
      alter table public.notifications
        add constraint notifications_related_booking_id_fkey
        foreign key (related_booking_id) references public.bookings(booking_id) on delete set null not valid;
    exception
      when duplicate_object then
        null;
    end;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_related_trip_id_fkey'
  ) then
    begin
      alter table public.notifications
        add constraint notifications_related_trip_id_fkey
        foreign key (related_trip_id) references public.trips(trip_id) on delete set null not valid;
    exception
      when duplicate_object then
        null;
    end;
  end if;
end $$;

create index if not exists idx_notifications_user_created_at
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_read
  on public.notifications (coalesce(is_read, read));
create index if not exists idx_notifications_type
  on public.notifications (type);

alter table public.notifications enable row level security;

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();
