begin;

do $$
begin
  raise notice 'Applying roles.seed.sql';
end $$;

insert into public.system_roles (
  role_key,
  canonical_role,
  display_name,
  description,
  permissions,
  is_assignable,
  active
)
values
  (
    'admin',
    'admin',
    'Admin',
    'Operational control role for trust, support, growth, and payout workflows.',
    '{"dashboard":true,"support":true,"pricing":true,"automation":true,"users":true}'::jsonb,
    true,
    true
  ),
  (
    'driver',
    'driver',
    'Driver',
    'Supply-side role that can publish trips, receive bookings, carry packages, and earn payouts.',
    '{"publishTrips":true,"manageBookings":true,"carryPackages":true,"walletPayouts":true}'::jsonb,
    true,
    true
  ),
  (
    'rider',
    'passenger',
    'Rider',
    'Demand-side role that can search, book, save reminders, and create package requests.',
    '{"bookTrips":true,"requestPackages":true,"walletPayments":true,"routeReminders":true}'::jsonb,
    true,
    true
  )
on conflict (role_key) do update
set
  canonical_role = excluded.canonical_role,
  display_name = excluded.display_name,
  description = excluded.description,
  permissions = excluded.permissions,
  is_assignable = excluded.is_assignable,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.seed_execution_log (seed_name, details)
values (
  'roles.seed.sql',
  jsonb_build_object('rows_targeted', 3, 'layer', 'core_system_data')
);

commit;
