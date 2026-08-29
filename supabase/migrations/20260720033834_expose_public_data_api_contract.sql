-- Expose the canonical public schema through Supabase Data API roles.
--
-- The hosted project API setting exposes the public schema; these grants make
-- existing and future public objects reachable by PostgREST. Row-level security
-- policies remain the row access boundary for anon/authenticated users.

grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant select on tables to anon;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to authenticated, service_role;
