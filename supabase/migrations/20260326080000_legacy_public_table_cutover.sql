-- Live-safe cutover for older public table families that conflict with the
-- canonical Wasel runtime contract introduced in the operating-model era.
--
-- This migration preserves legacy data by renaming conflicting tables before
-- the canonical tables are created by later migrations.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'users'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'auth_user_id'
  ) then
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'legacy_users_segments'
    ) then
      raise exception 'public.legacy_users_segments already exists; manual review required before cutover';
    end if;

    alter table public.users rename to legacy_users_segments;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'trips'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trips'
      and column_name = 'driver_id'
  ) then
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'legacy_catalog_trips'
    ) then
      raise exception 'public.legacy_catalog_trips already exists; manual review required before cutover';
    end if;

    alter table public.trips rename to legacy_catalog_trips;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'bookings'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'passenger_id'
  ) then
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'legacy_catalog_bookings'
    ) then
      raise exception 'public.legacy_catalog_bookings already exists; manual review required before cutover';
    end if;

    alter table public.bookings rename to legacy_catalog_bookings;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'vehicles'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'vehicle_id'
  ) then
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'legacy_vehicle_catalog'
    ) then
      raise exception 'public.legacy_vehicle_catalog already exists; manual review required before cutover';
    end if;

    alter table public.vehicles rename to legacy_vehicle_catalog;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'legacy_users_segments'
  ) then
    comment on table public.legacy_users_segments is
      'Legacy segmentation table preserved during canonical Wasel contract cutover.';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'legacy_catalog_trips'
  ) then
    comment on table public.legacy_catalog_trips is
      'Legacy catalog trips table preserved during canonical Wasel contract cutover.';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'legacy_catalog_bookings'
  ) then
    comment on table public.legacy_catalog_bookings is
      'Legacy bookings table preserved during canonical Wasel contract cutover.';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name = 'legacy_vehicle_catalog'
  ) then
    comment on table public.legacy_vehicle_catalog is
      'Legacy vehicle catalog preserved during canonical Wasel contract cutover.';
  end if;
end $$;
