-- Wasel database acceptance audit (read-only)
-- Run with: psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f scripts/sql/wasel_database_acceptance_audit.sql
-- This script performs catalog/statistics reads only. It does not create, alter, or delete objects.
-- Run against the positively identified application project, not a legacy KV-only project.

\echo '=== 1. Database identity and size ==='
select current_database() as database_name, current_user as connected_role,
       current_setting('server_version') as postgres_version,
       pg_size_pretty(pg_database_size(current_database())) as database_size, now() as audited_at;

\echo '=== 2. Public relations: RLS, policies, and client grants ==='
select n.nspname as schema_name, c.relname as relation_name, c.relkind as relation_kind,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls,
       coalesce(p.policy_count, 0) as policy_count,
       case when exists (select 1 from pg_roles where rolname = 'anon') then has_table_privilege('anon', c.oid, 'SELECT') else false end as anon_can_select,
       case when exists (select 1 from pg_roles where rolname = 'authenticated') then has_table_privilege('authenticated', c.oid, 'SELECT') else false end as authenticated_can_select,
       case when exists (select 1 from pg_roles where rolname = 'anon') then has_table_privilege('anon', c.oid, 'INSERT') else false end as anon_can_insert,
       case when exists (select 1 from pg_roles where rolname = 'authenticated') then has_table_privilege('authenticated', c.oid, 'INSERT') else false end as authenticated_can_insert
from pg_class c join pg_namespace n on n.oid = c.relnamespace
left join (select schemaname, tablename, count(*) as policy_count from pg_policies group by 1, 2) p
  on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
order by c.relkind, c.relname;

\echo '=== 3. Public tables with client privileges but RLS disabled ==='
select format('%I.%I', n.nspname, c.relname) as relation_name,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_can_select,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_can_insert,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_can_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_can_insert
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('anon', c.oid, 'INSERT')
    or has_table_privilege('authenticated', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'INSERT'))
order by relation_name;

\echo '=== 4. RLS-enabled tables with no policies (deny-by-default; review intended access) ==='
select format('%I.%I', n.nspname, c.relname) as relation_name
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.schemaname = n.nspname and p.tablename = c.relname)
order by relation_name;

\echo '=== 5. SECURITY DEFINER functions without explicit fixed search_path ==='
select format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) as function_name,
       p.proconfig as function_settings
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema') and p.prosecdef
  and not exists (select 1 from unnest(coalesce(p.proconfig, array[]::text[])) setting where setting like 'search_path=%')
order by function_name;

\echo '=== 6. Foreign keys without a matching leading-column index ==='
select c.conname as constraint_name, format('%I.%I', child_ns.nspname, child.relname) as child_table,
       pg_get_constraintdef(c.oid) as definition
from pg_constraint c join pg_class child on child.oid = c.conrelid
join pg_namespace child_ns on child_ns.oid = child.relnamespace
where c.contype = 'f' and child_ns.nspname = 'public'
  and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indisvalid and i.indisready
    and (select array_agg(k.attnum order by k.ordinality)
         from unnest(i.indkey::smallint[]) with ordinality as k(attnum, ordinality)
         where k.ordinality <= cardinality(c.conkey)) = c.conkey)
order by child_table, constraint_name;

\echo '=== 7. Invalid or not-ready indexes ==='
select format('%I.%I', n.nspname, t.relname) as table_name, i.indexrelid::regclass as index_name,
       i.indisvalid, i.indisready
from pg_index i join pg_class t on t.oid = i.indrelid join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public' and (not i.indisvalid or not i.indisready)
order by table_name, index_name;

\echo '=== 8. Structurally duplicate indexes (same keys, predicate, and uniqueness) ==='
select format('%I.%I', n.nspname, t.relname) as table_name,
       array_agg(idx.relname order by idx.relname) as index_names, count(*) as duplicate_count
from pg_index i join pg_class t on t.oid = i.indrelid join pg_class idx on idx.oid = i.indexrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
group by n.nspname, t.oid, i.indkey, i.indclass, i.indcollation, i.indoption, i.indpred, i.indexprs, i.indisunique, i.indisprimary
having count(*) > 1
order by table_name;

\echo '=== 9. Views without security_invoker=true ==='
select format('%I.%I', n.nspname, c.relname) as view_name, c.reloptions
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
  and not coalesce(c.reloptions, array[]::text[]) @> array['security_invoker=true']
order by view_name;

\echo '=== 10. Unvalidated constraints ==='
select format('%I.%I', n.nspname, t.relname) as table_name, c.conname as constraint_name,
       pg_get_constraintdef(c.oid) as definition
from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public' and not c.convalidated
order by table_name, constraint_name;

\echo '=== 11. Table size and observed sequential/index scan counts ==='
select schemaname, relname as table_name, n_live_tup as estimated_live_rows, seq_scan, idx_scan,
       pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass)) as total_size
from pg_stat_user_tables where schemaname = 'public'
order by pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass) desc;

\echo '=== 12. Unused indexes (check statistics reset time before considering removal) ==='
select s.schemaname, s.relname as table_name, s.indexrelname as index_name, s.idx_scan,
       pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size
from pg_stat_user_indexes s
where s.schemaname = 'public' and s.idx_scan = 0
  and not exists (select 1 from pg_constraint c where c.conindid = s.indexrelid)
order by pg_relation_size(s.indexrelid) desc;

\echo '=== Audit complete: review findings; no database changes were made. ==='

\echo '=== 13. Critical Wasel application contract tables ==='
with expected(table_name, purpose) as (
  values
    ('users', 'canonical user identity'),
    ('drivers', 'driver profiles and eligibility'),
    ('trips', 'intercity ride inventory'),
    ('bookings', 'atomic passenger reservations'),
    ('packages', 'package-sharing lifecycle'),
    ('wallet_accounts', 'wallet balances / account state'),
    ('wallet_transactions', 'immutable financial ledger'),
    ('wallet_payment_intents', 'payment intent lifecycle'),
    ('notifications', 'persistent notification delivery')
)
select e.table_name, e.purpose,
       (to_regclass(format('public.%I', e.table_name)) is not null) as exists_in_public
from expected e
order by e.table_name;

\echo '=== 14. Required PostgreSQL extensions ==='
select required.extension_name,
       exists (select 1 from pg_extension x where x.extname = required.extension_name) as installed
from (values ('pgcrypto'), ('uuid-ossp'), ('postgis')) as required(extension_name)
order by required.extension_name;

\echo '=== 15. Migration history relation presence ==='
select to_regclass('supabase_migrations.schema_migrations') as supabase_migration_history,
       to_regclass('public.schema_migrations') as public_migration_history;

\echo '=== 16. Auth-to-application user synchronization triggers ==='
select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname in ('auth', 'public')
  and (c.relname in ('users') or t.tgname ilike '%user%')
order by schema_name, table_name, trigger_name;
