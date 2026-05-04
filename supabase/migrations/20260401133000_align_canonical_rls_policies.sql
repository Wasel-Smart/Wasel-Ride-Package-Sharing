-- Align canonical RLS policies with the app-facing direct Supabase contract.
-- This migration replaces broad FOR ALL policies with explicit SELECT/INSERT/
-- UPDATE/DELETE policies so fallback writes match the canonical schema.

drop policy if exists users_self_or_admin_select on public.users;
drop policy if exists users_self_or_admin_update on public.users;
create policy users_self_or_admin_select on public.users
for select using (
  auth_user_id = auth.uid()
  or id = public.current_user_id()
  or public.is_admin()
);
create policy users_self_or_admin_insert on public.users
for insert with check (
  public.is_admin()
  or (
    auth.uid() is not null
    and auth_user_id = auth.uid()
  )
);
create policy users_self_or_admin_update on public.users
for update using (
  auth_user_id = auth.uid()
  or id = public.current_user_id()
  or public.is_admin()
)
with check (
  auth_user_id = auth.uid()
  or id = public.current_user_id()
  or public.is_admin()
);
create policy users_admin_delete on public.users
for delete using (public.is_admin());

drop policy if exists drivers_self_or_admin_select on public.drivers;
drop policy if exists drivers_self_or_admin_update on public.drivers;
create policy drivers_self_or_admin_select on public.drivers
for select using (user_id = public.current_user_id() or public.is_admin());
create policy drivers_self_or_admin_insert on public.drivers
for insert with check (user_id = public.current_user_id() or public.is_admin());
create policy drivers_self_or_admin_update on public.drivers
for update using (user_id = public.current_user_id() or public.is_admin())
with check (user_id = public.current_user_id() or public.is_admin());
create policy drivers_admin_delete on public.drivers
for delete using (public.is_admin());

drop policy if exists vehicles_driver_or_admin_access on public.vehicles;
create policy vehicles_driver_or_admin_select on public.vehicles
for select using (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = vehicles.driver_id
      and d.user_id = public.current_user_id()
  )
);
create policy vehicles_driver_or_admin_insert on public.vehicles
for insert with check (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = vehicles.driver_id
      and d.user_id = public.current_user_id()
  )
);
create policy vehicles_driver_or_admin_update on public.vehicles
for update using (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = vehicles.driver_id
      and d.user_id = public.current_user_id()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = vehicles.driver_id
      and d.user_id = public.current_user_id()
  )
);
create policy vehicles_admin_delete on public.vehicles
for delete using (public.is_admin());

drop policy if exists trips_public_open_select on public.trips;
drop policy if exists trips_driver_or_admin_write on public.trips;
create policy trips_public_open_select on public.trips
for select using (
  trip_status in ('open', 'booked', 'in_progress')
  or public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = trips.driver_id
      and d.user_id = public.current_user_id()
  )
);
create policy trips_driver_or_admin_insert on public.trips
for insert with check (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = trips.driver_id
      and d.user_id = public.current_user_id()
  )
);
create policy trips_driver_or_admin_update on public.trips
for update using (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = trips.driver_id
      and d.user_id = public.current_user_id()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = trips.driver_id
      and d.user_id = public.current_user_id()
  )
);
create policy trips_driver_or_admin_delete on public.trips
for delete using (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = trips.driver_id
      and d.user_id = public.current_user_id()
  )
);

drop policy if exists bookings_owner_driver_admin_access on public.bookings;
create policy bookings_owner_driver_admin_select on public.bookings
for select using (
  passenger_id = public.current_user_id()
  or public.is_admin()
  or exists (
    select 1
    from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = bookings.trip_id
      and d.user_id = public.current_user_id()
  )
);
create policy bookings_owner_insert on public.bookings
for insert with check (
  passenger_id = public.current_user_id()
  or public.is_admin()
);
create policy bookings_owner_driver_admin_update on public.bookings
for update using (
  passenger_id = public.current_user_id()
  or public.is_admin()
  or exists (
    select 1
    from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = bookings.trip_id
      and d.user_id = public.current_user_id()
  )
)
with check (
  passenger_id = public.current_user_id()
  or public.is_admin()
  or exists (
    select 1
    from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = bookings.trip_id
      and d.user_id = public.current_user_id()
  )
);
create policy bookings_owner_admin_delete on public.bookings
for delete using (
  passenger_id = public.current_user_id()
  or public.is_admin()
);

drop policy if exists packages_sender_driver_admin_access on public.packages;
create policy packages_sender_driver_admin_select on public.packages
for select using (
  sender_id = public.current_user_id()
  or receiver_id = public.current_user_id()
  or public.is_admin()
  or exists (
    select 1
    from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = packages.trip_id
      and d.user_id = public.current_user_id()
  )
);
create policy packages_sender_insert on public.packages
for insert with check (
  sender_id = public.current_user_id()
  or public.is_admin()
);
create policy packages_sender_driver_admin_update on public.packages
for update using (
  sender_id = public.current_user_id()
  or receiver_id = public.current_user_id()
  or public.is_admin()
  or exists (
    select 1
    from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = packages.trip_id
      and d.user_id = public.current_user_id()
  )
)
with check (
  sender_id = public.current_user_id()
  or receiver_id = public.current_user_id()
  or public.is_admin()
  or exists (
    select 1
    from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = packages.trip_id
      and d.user_id = public.current_user_id()
  )
);
create policy packages_sender_admin_delete on public.packages
for delete using (
  sender_id = public.current_user_id()
  or public.is_admin()
);

drop policy if exists wallets_owner_admin_access on public.wallets;
create policy wallets_owner_admin_select on public.wallets
for select using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists transactions_owner_admin_access on public.transactions;
create policy transactions_owner_admin_select on public.transactions
for select using (
  public.is_admin()
  or exists (
    select 1 from public.wallets w
    where w.wallet_id = transactions.wallet_id
      and w.user_id = public.current_user_id()
  )
);

drop policy if exists verification_self_admin_access on public.verification_records;
create policy verification_self_admin_select on public.verification_records
for select using (user_id = public.current_user_id() or public.is_admin());
create policy verification_self_admin_insert on public.verification_records
for insert with check (user_id = public.current_user_id() or public.is_admin());
create policy verification_admin_update on public.verification_records
for update using (public.is_admin())
with check (public.is_admin());
create policy verification_admin_delete on public.verification_records
for delete using (public.is_admin());

drop policy if exists admin_logs_admin_only on public.admin_logs;
create policy admin_logs_admin_only on public.admin_logs
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists otp_owner_admin_access on public.otp_sessions;
create policy otp_owner_admin_select on public.otp_sessions
for select using (user_id = public.current_user_id() or public.is_admin());
create policy otp_owner_admin_insert on public.otp_sessions
for insert with check (user_id = public.current_user_id() or public.is_admin());
create policy otp_admin_update on public.otp_sessions
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists payment_methods_owner_admin_access on public.payment_methods;
create policy payment_methods_owner_admin_select on public.payment_methods
for select using (user_id = public.current_user_id() or public.is_admin());
create policy payment_methods_owner_admin_insert on public.payment_methods
for insert with check (user_id = public.current_user_id() or public.is_admin());
create policy payment_methods_owner_admin_update on public.payment_methods
for update using (user_id = public.current_user_id() or public.is_admin())
with check (user_id = public.current_user_id() or public.is_admin());
create policy payment_methods_owner_admin_delete on public.payment_methods
for delete using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists package_events_access on public.package_events;
create policy package_events_access on public.package_events
for select using (
  public.is_admin()
  or exists (
    select 1 from public.packages p
    where p.package_id = package_events.package_id
      and (p.sender_id = public.current_user_id() or p.receiver_id = public.current_user_id())
  )
);
create policy package_events_driver_admin_insert on public.package_events
for insert with check (
  public.is_admin()
  or created_by = public.current_user_id()
);

drop policy if exists trip_presence_driver_admin_access on public.trip_presence;
create policy trip_presence_driver_admin_select on public.trip_presence
for select using (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = trip_presence.driver_id
      and d.user_id = public.current_user_id()
  )
);
create policy trip_presence_driver_admin_insert on public.trip_presence
for insert with check (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = trip_presence.driver_id
      and d.user_id = public.current_user_id()
  )
);
create policy trip_presence_driver_admin_update on public.trip_presence
for update using (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = trip_presence.driver_id
      and d.user_id = public.current_user_id()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = trip_presence.driver_id
      and d.user_id = public.current_user_id()
  )
);

-- Notifications comes from the earlier schema family but is still part of the
-- live backend contract used by the web app.
drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_select_own on public.notifications
for select using (user_id = public.current_user_id() or public.is_admin());
create policy notifications_insert_own on public.notifications
for insert with check (user_id = public.current_user_id() or public.is_admin());
create policy notifications_update_own on public.notifications
for update using (user_id = public.current_user_id() or public.is_admin())
with check (user_id = public.current_user_id() or public.is_admin());
create policy notifications_delete_own on public.notifications
for delete using (user_id = public.current_user_id() or public.is_admin());
