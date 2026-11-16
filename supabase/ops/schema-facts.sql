-- READ-ONLY schema facts for the live Wasel database.
--
-- Purpose: compare the production schema with the migrations in this repository
-- without needing Docker or a full pg_dump. Paste this whole file into the Supabase
-- dashboard SQL editor (project -> SQL Editor), run it, and copy the single JSON cell
-- it returns. It only reads catalog metadata: no row data, no secrets, no writes.
--
-- It answers: which migrations are applied, which tables exist, what the key money
-- tables look like (columns, check constraints, enums), how the wallet functions are
-- defined, and which public tables have row level security off.

select jsonb_pretty(jsonb_build_object(
  'server_version', current_setting('server_version'),

  'applied_migrations', (
    select coalesce(jsonb_agg(m.version order by m.version), '[]'::jsonb)
      from supabase_migrations.schema_migrations m
  ),

  'public_tables', (
    select coalesce(jsonb_agg(t.table_name order by t.table_name), '[]'::jsonb)
      from information_schema.tables t
     where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
  ),

  'tables_without_rls', (
    select coalesce(jsonb_agg(c.relname order by c.relname), '[]'::jsonb)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  ),

  'key_table_columns', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table', c.table_name,
             'column', c.column_name,
             'type', c.data_type,
             'udt', c.udt_name,
             'nullable', c.is_nullable,
             'default', c.column_default
           ) order by c.table_name, c.ordinal_position), '[]'::jsonb)
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.table_name in ('bookings', 'transactions', 'wallets', 'users', 'payment_methods', 'trips', 'packages')
  ),

  'key_table_check_constraints', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table', cl.relname,
             'name', con.conname,
             'definition', pg_get_constraintdef(con.oid)
           ) order by cl.relname, con.conname), '[]'::jsonb)
      from pg_constraint con
      join pg_class cl on cl.oid = con.conrelid
      join pg_namespace n on n.oid = cl.relnamespace
     where n.nspname = 'public'
       and con.contype = 'c'
       and cl.relname in ('bookings', 'transactions', 'wallets', 'payment_methods')
  ),

  'public_enums', (
    select coalesce(jsonb_agg(jsonb_build_object('type', e.typname, 'labels', e.labels) order by e.typname), '[]'::jsonb)
      from (
        select t.typname, array_agg(v.enumlabel order by v.enumsortorder) as labels
          from pg_type t
          join pg_enum v on v.enumtypid = t.oid
          join pg_namespace n on n.oid = t.typnamespace
         where n.nspname = 'public'
         group by t.typname
      ) e
  ),

  'wallet_functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'signature', p.oid::regprocedure::text,
             'security_definer', p.prosecdef,
             'config', p.proconfig,
             'definition', pg_get_functiondef(p.oid)
           ) order by p.proname), '[]'::jsonb)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'wallet_post_transaction', 'app_transfer_wallet_funds', 'app_transfer_wallet_funds_idempotent',
         'app_add_wallet_funds', 'app_pay_with_wallet', 'app_credit_driver_earnings', 'app_book_trip',
         'app_claim_stripe_event', 'app_complete_stripe_event', 'app_record_stripe_dispute',
         'app_reverse_stripe_topup_refund'
       )
  ),

  'triggers_on_money_tables', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table', cl.relname,
             'trigger', tg.tgname,
             'definition', pg_get_triggerdef(tg.oid)
           ) order by cl.relname, tg.tgname), '[]'::jsonb)
      from pg_trigger tg
      join pg_class cl on cl.oid = tg.tgrelid
      join pg_namespace n on n.oid = cl.relnamespace
     where n.nspname = 'public'
       and not tg.tgisinternal
       and cl.relname in ('bookings', 'transactions', 'wallets')
  )
)) as live_schema_facts;
