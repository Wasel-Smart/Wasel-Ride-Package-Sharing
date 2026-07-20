-- Tighten the public Data API surface after exposing the public schema.
-- RLS remains the row-level control; these grants define which objects are
-- reachable by anon/authenticated clients in the first place.

revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

grant execute on all functions in schema public to service_role;

do $$
declare
  function_signature text;
  allowed_authenticated_functions text[] := array[
    'public.current_user_id()',
    'public.current_user_role()',
    'public.is_admin()',
    'public.app_add_wallet_funds(uuid,numeric,public.payment_method_v2,text)',
    'public.app_transfer_wallet_funds(uuid,uuid,numeric,public.payment_method_v2)',
    'public.app_create_trip(uuid,text,text,timestamp with time zone,integer,numeric,boolean,integer)',
    'public.app_book_trip(uuid,uuid,integer,public.payment_method_v2)',
    'public.app_assign_package_to_trip(uuid,uuid)',
    'public.app_submit_sanad_verification(uuid,text,text)',
    'public.find_trips_near_point(double precision,double precision,integer,integer)',
    'public.check_rate_limit(uuid,text,integer,integer)',
    'public.anonymize_user_data(uuid)',
    'public.complete_checklist_item(text)',
    'public.app_withdraw_wallet_funds(uuid,numeric,text,text)',
    'public.app_pay_with_wallet(uuid,numeric,public.transaction_type_v2,public.payment_method_v2,text,uuid,jsonb)',
    'public.request_data_export(uuid)',
    'public.request_account_deletion(uuid)',
    'public.increment_balance(uuid,integer)',
    'public.increment_balance(uuid,numeric)',
    'public.decrement_balance(uuid,integer)',
    'public.decrement_balance(uuid,numeric)',
    'public.increment_pending_balance(uuid,integer)',
    'public.increment_pending_balance(uuid,numeric)'
  ];
begin
  foreach function_signature in array allowed_authenticated_functions loop
    if to_regprocedure(function_signature) is not null then
      execute format('grant execute on function %s to authenticated', to_regprocedure(function_signature));
    end if;
  end loop;

  if to_regprocedure('public.current_user_id()') is not null then
    grant execute on function public.current_user_id() to anon;
  end if;

  if to_regprocedure('public.current_user_role()') is not null then
    grant execute on function public.current_user_role() to anon;
  end if;

  if to_regprocedure('public.is_admin()') is not null then
    grant execute on function public.is_admin() to anon;
  end if;
end $$;

revoke select, insert, update, delete on all tables in schema public from authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from authenticated;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;

do $$
declare
  table_name text;
  read_write_tables text[] := array[
    'users',
    'profiles',
    'drivers',
    'vehicles',
    'verification_records',
    'wallets',
    'wallet_balances',
    'transactions',
    'payment_methods',
    'trips',
    'bookings',
    'packages',
    'package_events',
    'notifications',
    'messages',
    'trip_presence',
    'ratings',
    'reviews',
    'communication_preferences',
    'communication_deliveries',
    'support_tickets',
    'support_ticket_events',
    'user_settings',
    'referrals',
    'growth_events',
    'demand_alerts',
    'scheduled_pickups',
    'bus_bookings',
    'organization_members',
    'corporate_credits',
    'invoices',
    'payment_idempotency_keys',
    'fraud_events'
  ];
  read_only_tables text[] := array[
    'supported_cities',
    'region_config',
    'trip_search_cache',
    'bus_operators',
    'bus_routes',
    'bus_schedules',
    'organizations',
    'production_checklist',
    'system_health',
    'corridor_metrics'
  ];
begin
  foreach table_name in array read_write_tables loop
    if to_regclass('public.' || table_name) is not null then
      execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    end if;
  end loop;

  foreach table_name in array read_only_tables loop
    if to_regclass('public.' || table_name) is not null then
      execute format('grant select on table public.%I to authenticated', table_name);
    end if;
  end loop;
end $$;

grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role;

notify pgrst, 'reload schema';
