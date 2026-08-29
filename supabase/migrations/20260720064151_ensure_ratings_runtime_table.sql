create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  trip_id uuid not null,
  rider_id uuid not null,
  driver_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  review text,
  tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (booking_id, rider_id)
);

create index if not exists idx_ratings_driver_created
  on public.ratings (driver_id, created_at desc);

create index if not exists idx_ratings_trip
  on public.ratings (trip_id);

create index if not exists idx_ratings_rider
  on public.ratings (rider_id, created_at desc);

alter table public.ratings enable row level security;

drop policy if exists ratings_select_authenticated on public.ratings;
create policy ratings_select_authenticated
  on public.ratings for select
  to authenticated
  using (true);

drop policy if exists ratings_insert_own_completed_booking on public.ratings;
create policy ratings_insert_own_completed_booking
  on public.ratings for insert
  to authenticated
  with check (rider_id = auth.uid());

drop policy if exists ratings_update_own_recent on public.ratings;
create policy ratings_update_own_recent
  on public.ratings for update
  to authenticated
  using (rider_id = auth.uid())
  with check (rider_id = auth.uid());

create or replace function public.set_ratings_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_ratings_updated_at on public.ratings;
create trigger set_ratings_updated_at
  before update on public.ratings
  for each row execute function public.set_ratings_updated_at();

create or replace function public.update_driver_rating_summary()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_driver_id uuid := coalesce(new.driver_id, old.driver_id);
begin
  if affected_driver_id is null then
    return coalesce(new, old);
  end if;

  if to_regclass('public.profiles') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'average_rating'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'total_ratings'
    )
  then
    execute
      'update public.profiles
         set average_rating = summary.average_rating,
             total_ratings = summary.total_ratings
        from (
          select coalesce(round(avg(rating)::numeric, 2), 0) as average_rating,
                 count(*)::integer as total_ratings
            from public.ratings
           where driver_id = $1
        ) summary
       where profiles.id = $1'
    using affected_driver_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists update_driver_rating_summary on public.ratings;
create trigger update_driver_rating_summary
  after insert or update or delete on public.ratings
  for each row execute function public.update_driver_rating_summary();

revoke all on table public.ratings from public, anon;
grant select, insert, update, delete on table public.ratings to authenticated;
grant select, insert, update, delete on table public.ratings to service_role;
grant execute on function public.set_ratings_updated_at() to service_role;
grant execute on function public.update_driver_rating_summary() to service_role;

notify pgrst, 'reload schema';
