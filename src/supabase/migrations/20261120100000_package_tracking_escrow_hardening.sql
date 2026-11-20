-- Server-authoritative package tracking and escrow controls.
-- This migration adds the financial ledger boundary and prevents authenticated
-- clients from changing delivery/payment state directly. It does not configure
-- a payment provider or deploy anything to production.

begin;

alter table public.packages
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists pickup_verified_at timestamptz,
  add column if not exists delivery_verified_at timestamptz,
  add column if not exists delivery_evidence_url text,
  add column if not exists dispute_opened_at timestamptz;

alter table public.packages
  drop constraint if exists packages_payment_status_check;

alter table public.packages
  add constraint packages_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'held', 'released', 'refunded', 'failed', 'disputed'));

create table if not exists public.package_escrows (
  escrow_id uuid primary key default gen_random_uuid(),
  package_id uuid not null unique references public.packages(package_id) on delete restrict,
  sender_id uuid not null references public.users(id) on delete restrict,
  driver_user_id uuid not null references public.users(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency_code text not null default 'JOD' check (currency_code = 'JOD'),
  provider text not null check (length(trim(provider)) > 0),
  provider_payment_id text not null unique,
  provider_event_id text not null unique,
  status text not null default 'held'
    check (status in ('held', 'released', 'refunded', 'disputed')),
  metadata jsonb not null default '{}'::jsonb,
  held_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_package_escrows_sender_status
  on public.package_escrows(sender_id, status, created_at desc);
create index if not exists idx_package_escrows_driver_status
  on public.package_escrows(driver_user_id, status, created_at desc);

alter table public.package_escrows enable row level security;

drop policy if exists package_escrows_participant_read on public.package_escrows;
create policy package_escrows_participant_read on public.package_escrows
for select using (
  public.is_admin()
  or sender_id = public.current_user_id()
  or driver_user_id = public.current_user_id()
  or exists (
    select 1 from public.packages p
    where p.package_id = package_escrows.package_id
      and p.receiver_id = public.current_user_id()
  )
);

revoke all on public.package_escrows from anon, authenticated;
grant select on public.package_escrows to authenticated;
grant all on public.package_escrows to service_role;

-- Timeline entries are append-only and readable by the sender, recipient,
-- assigned driver, or support administrators. Clients cannot forge events.
drop policy if exists package_events_access on public.package_events;
create policy package_events_access on public.package_events
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.packages p
    where p.package_id = package_events.package_id
      and (
        p.sender_id = public.current_user_id()
        or p.receiver_id = public.current_user_id()
        or exists (
          select 1
          from public.trips t
          join public.drivers d on d.driver_id = t.driver_id
          where t.trip_id = p.trip_id
            and d.user_id = public.current_user_id()
        )
      )
  )
);

drop policy if exists package_events_driver_admin_insert on public.package_events;
revoke insert, update, delete on public.package_events from anon, authenticated;
grant select on public.package_events to authenticated;
grant all on public.package_events to service_role;

create or replace function public.guard_package_client_mutations()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'authenticated'
    and coalesce(current_setting('wasel.package_rpc', true), 'off') <> 'on' then
    if tg_op = 'INSERT' then
      if new.sender_id <> public.current_user_id()
        or new.package_status <> 'created'
        or new.payment_status <> 'unpaid'
        or new.payment_transaction_id is not null
        or new.trip_id is not null
      then
        raise exception 'Package creation contains server-managed fields'
          using errcode = '42501';
      end if;
    elsif
      new.package_status is distinct from old.package_status
      or new.payment_status is distinct from old.payment_status
      or new.payment_transaction_id is distinct from old.payment_transaction_id
      or new.delivered_at is distinct from old.delivered_at
      or new.pickup_verified_at is distinct from old.pickup_verified_at
      or new.delivery_verified_at is distinct from old.delivery_verified_at
      or new.delivery_evidence_url is distinct from old.delivery_evidence_url
      or new.dispute_opened_at is distinct from old.dispute_opened_at
      or new.trip_id is distinct from old.trip_id
      or new.fee_amount is distinct from old.fee_amount
    then
      raise exception 'Package assignment, tracking, and payment state are server-managed'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_package_client_mutations on public.packages;
create trigger trg_guard_package_client_mutations
before insert or update on public.packages
for each row execute function public.guard_package_client_mutations();

create or replace function public.guard_package_status_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_old text := old.package_status::text;
  v_new text := new.package_status::text;
begin
  if v_old = v_new then
    return new;
  end if;

  if not (
    (v_old = 'created' and v_new in ('assigned', 'cancelled', 'disputed'))
    or (v_old = 'assigned' and v_new in ('in_transit', 'cancelled', 'disputed'))
    or (v_old = 'in_transit' and v_new in ('delivered', 'disputed'))
    or (v_old = 'disputed' and v_new in ('delivered', 'cancelled'))
  ) then
    raise exception 'Invalid package status transition: % -> %', v_old, v_new
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_package_status_transition on public.packages;
create trigger trg_guard_package_status_transition
before update of package_status on public.packages
for each row execute function public.guard_package_status_transition();

-- Called only after the payment provider's signature and amount/currency have
-- been verified by a trusted webhook handler. Event and payment IDs are unique.
create or replace function public.record_package_escrow_payment(
  p_package_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_provider_event_id text,
  p_amount numeric,
  p_currency_code text default 'JOD',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_package public.packages%rowtype;
  v_driver_user_id uuid;
  v_escrow_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  if coalesce(trim(p_provider), '') = ''
    or coalesce(trim(p_provider_payment_id), '') = ''
    or coalesce(trim(p_provider_event_id), '') = ''
    or p_amount is null or p_amount <= 0
    or upper(coalesce(p_currency_code, '')) <> 'JOD'
  then
    raise exception 'Invalid verified payment payload' using errcode = '22023';
  end if;

  select * into v_package
  from public.packages
  where package_id = p_package_id
  for update;

  if not found then
    raise exception 'Package not found' using errcode = 'P0002';
  end if;

  if v_package.trip_id is null or v_package.package_status not in ('assigned', 'in_transit') then
    raise exception 'Package must be assigned before escrow can be funded'
      using errcode = '23514';
  end if;

  if round(v_package.fee_amount, 2) <> round(p_amount, 2) then
    raise exception 'Verified payment amount does not match package fee'
      using errcode = '23514';
  end if;

  select d.user_id into v_driver_user_id
  from public.trips t
  join public.drivers d on d.driver_id = t.driver_id
  where t.trip_id = v_package.trip_id;

  if v_driver_user_id is null then
    raise exception 'Assigned trip has no resolvable driver account'
      using errcode = '23514';
  end if;

  insert into public.package_escrows (
    package_id, sender_id, driver_user_id, amount, currency_code,
    provider, provider_payment_id, provider_event_id, status, metadata
  ) values (
    p_package_id, v_package.sender_id, v_driver_user_id, p_amount, 'JOD',
    p_provider, p_provider_payment_id, p_provider_event_id, 'held',
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict do nothing
  returning escrow_id into v_escrow_id;

  if v_escrow_id is null then
    select escrow_id into v_escrow_id
    from public.package_escrows
    where package_id = p_package_id
      and provider_payment_id = p_provider_payment_id
      and provider_event_id = p_provider_event_id;

    if v_escrow_id is null then
      raise exception 'Payment reference was already used by another package or event'
        using errcode = '23505';
    end if;
    return v_escrow_id;
  end if;

  update public.packages
  set payment_status = 'held',
      updated_at = timezone('utc', now())
  where package_id = p_package_id;

  insert into public.package_events (package_id, event_type, event_status, notes)
  values (p_package_id, 'payment_escrowed', 'held', 'Payment verified by provider webhook');

  return v_escrow_id;
end;
$$;

-- Release is deliberately separate from payment confirmation. A trusted
-- delivery verifier must set delivered status, timestamp, and evidence first.
create or replace function public.release_package_escrow(p_package_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_package public.packages%rowtype;
  v_escrow public.package_escrows%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  select * into v_package
  from public.packages
  where package_id = p_package_id
  for update;

  if not found then
    raise exception 'Package not found' using errcode = 'P0002';
  end if;

  if v_package.package_status <> 'delivered'
    or v_package.delivered_at is null
    or v_package.delivery_verified_at is null
    or coalesce(trim(v_package.delivery_evidence_url), '') = ''
    or v_package.dispute_opened_at is not null
  then
    raise exception 'Verified delivery evidence and no active dispute are required'
      using errcode = '23514';
  end if;

  select * into v_escrow
  from public.package_escrows
  where package_id = p_package_id
  for update;

  if not found then
    raise exception 'No escrow exists for this package' using errcode = 'P0002';
  end if;

  if v_escrow.status = 'released' then
    return v_escrow.escrow_id;
  end if;

  if v_escrow.status <> 'held' then
    raise exception 'Escrow is not releasable from status %', v_escrow.status
      using errcode = '23514';
  end if;

  update public.package_escrows
  set status = 'released',
      released_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where escrow_id = v_escrow.escrow_id;

  update public.packages
  set payment_status = 'released',
      updated_at = timezone('utc', now())
  where package_id = p_package_id;

  insert into public.package_events (package_id, event_type, event_status, notes)
  values (p_package_id, 'payment_released', 'released', 'Escrow released after verified delivery');

  return v_escrow.escrow_id;
end;
$$;

create or replace function public.open_package_dispute(p_package_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_package public.packages%rowtype;
  v_actor uuid := public.current_user_id();
  v_is_driver boolean;
begin
  if auth.role() <> 'authenticated' or v_actor is null then
    raise exception 'Authenticated user required' using errcode = '42501';
  end if;

  select * into v_package
  from public.packages
  where package_id = p_package_id
  for update;

  if not found then
    raise exception 'Package not found' using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = v_package.trip_id
      and d.user_id = v_actor
  ) into v_is_driver;

  if v_actor not in (v_package.sender_id, coalesce(v_package.receiver_id, v_actor))
    and not v_is_driver
    and not public.is_admin()
  then
    raise exception 'Not a package participant' using errcode = '42501';
  end if;

  if v_package.package_status in ('delivered', 'cancelled') then
    raise exception 'A closed package cannot be disputed' using errcode = '23514';
  end if;

  if v_package.package_status = 'disputed' then
    return;
  end if;

  perform set_config('wasel.package_rpc', 'on', true);

  update public.packages
  set package_status = 'disputed',
      payment_status = case when payment_status = 'held' then 'disputed' else payment_status end,
      dispute_opened_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where package_id = p_package_id;

  update public.package_escrows
  set status = 'disputed',
      updated_at = timezone('utc', now())
  where package_id = p_package_id and status = 'held';

  insert into public.package_events (package_id, event_type, event_status, notes, created_by)
  values (p_package_id, 'dispute_opened', 'disputed', left(coalesce(p_reason, 'Dispute opened'), 500), v_actor);
end;
$$;

revoke all on function public.record_package_escrow_payment(uuid, text, text, text, numeric, text, jsonb) from public, anon, authenticated;
revoke all on function public.release_package_escrow(uuid) from public, anon, authenticated;
revoke all on function public.open_package_dispute(uuid, text) from public, anon;
grant execute on function public.record_package_escrow_payment(uuid, text, text, text, numeric, text, jsonb) to service_role;
grant execute on function public.release_package_escrow(uuid) to service_role;
grant execute on function public.open_package_dispute(uuid, text) to authenticated;

comment on table public.package_escrows is
  'Server-authoritative package payment escrow ledger. Browser clients have read-only participant access.';
comment on function public.record_package_escrow_payment(uuid, text, text, text, numeric, text, jsonb) is
  'Records a provider-verified package payment exactly once; callable only by service_role.';
comment on function public.release_package_escrow(uuid) is
  'Releases held package funds only after trusted delivery verification and evidence; callable only by service_role.';

commit;
