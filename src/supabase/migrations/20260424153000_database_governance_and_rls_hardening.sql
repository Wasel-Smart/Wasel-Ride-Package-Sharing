-- Close legacy RLS gaps, tighten exposed helper functions, and
-- align operational settings tables with the canonical updated_at contract.

-- -----------------------------------------------------------------------------
-- KV store: keep public reads narrow and block direct client writes.
-- -----------------------------------------------------------------------------

drop policy if exists "Users can access their own KV data" on public.kv_store_0b1f4071;
drop policy if exists "System can access shared KV data" on public.kv_store_0b1f4071;
drop policy if exists "Service role can access all KV data" on public.kv_store_0b1f4071;
drop policy if exists "Public read access to non-expired KV entries" on public.kv_store_0b1f4071;
drop policy if exists "Admin write access to KV store" on public.kv_store_0b1f4071;
drop policy if exists "Admin read access to audit log" on public.kv_store_audit_log;

revoke all on public.kv_store_0b1f4071 from public, anon, authenticated;
revoke all on public.kv_store_audit_log from public, anon, authenticated;

grant select on public.kv_store_0b1f4071 to anon, authenticated;
grant all on public.kv_store_0b1f4071 to service_role;
grant all on public.kv_store_audit_log to service_role;

create policy kv_store_select_public_runtime_configuration
  on public.kv_store_0b1f4071
  for select
  to anon, authenticated
  using (
    (key like 'app_config:%' or key like 'feature_flag:%')
    and (expires_at is null or expires_at > now())
  );

create policy kv_store_manage_service_role
  on public.kv_store_0b1f4071
  for all
  to service_role
  using (true)
  with check (true);

create policy kv_store_audit_read_service_role
  on public.kv_store_audit_log
  for select
  to service_role
  using (true);

alter function public.log_kv_store_changes()
  set search_path = public, pg_temp;

alter function public.get_kv_value(text)
  security invoker
  set search_path = public, pg_temp;

alter function public.set_kv_value(text, jsonb, integer, jsonb)
  security invoker
  set search_path = public, pg_temp;

alter function public.cleanup_expired_kv_entries()
  security invoker
  set search_path = public, pg_temp;

revoke execute on function public.get_kv_value(text) from public, anon, authenticated;
revoke execute on function public.set_kv_value(text, jsonb, integer, jsonb)
  from public, anon, authenticated;
revoke execute on function public.cleanup_expired_kv_entries()
  from public, anon, authenticated;

grant execute on function public.get_kv_value(text) to anon, authenticated, service_role;
grant execute on function public.set_kv_value(text, jsonb, integer, jsonb) to service_role;
grant execute on function public.cleanup_expired_kv_entries() to service_role;

-- -----------------------------------------------------------------------------
-- Stripe subscription mirrors: remove permissive ALL policies and use
-- ownership-scoped reads plus service-role writes.
-- -----------------------------------------------------------------------------

drop policy if exists "Service role can do everything on subscriptions" on public.subscriptions;
drop policy if exists "Service role can do everything on subscription_invoices"
  on public.subscription_invoices;
drop policy if exists "Service role can do everything on webhook_events" on public.webhook_events;
drop policy if exists "Users can view own subscriptions" on public.subscriptions;
drop policy if exists subscriptions_select_own on public.subscriptions;
drop policy if exists subscriptions_manage_service_role on public.subscriptions;
drop policy if exists subscription_invoices_select_own on public.subscription_invoices;
drop policy if exists subscription_invoices_manage_service_role on public.subscription_invoices;
drop policy if exists webhook_events_manage_service_role on public.webhook_events;

revoke all on public.subscriptions from public, anon, authenticated;
revoke all on public.subscription_invoices from public, anon, authenticated;
revoke all on public.webhook_events from public, anon, authenticated;

grant select on public.subscriptions to authenticated;
grant select on public.subscription_invoices to authenticated;
grant all on public.subscriptions to service_role;
grant all on public.subscription_invoices to service_role;
grant all on public.webhook_events to service_role;

create policy subscriptions_select_own
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid() or user_id = public.current_user_id());

create policy subscriptions_manage_service_role
  on public.subscriptions
  for all
  to service_role
  using (true)
  with check (true);

create policy subscription_invoices_select_own
  on public.subscription_invoices
  for select
  to authenticated
  using (user_id = auth.uid() or user_id = public.current_user_id());

create policy subscription_invoices_manage_service_role
  on public.subscription_invoices
  for all
  to service_role
  using (true)
  with check (true);

create policy webhook_events_manage_service_role
  on public.webhook_events
  for all
  to service_role
  using (true)
  with check (true);

alter function public.get_user_subscription(uuid)
  security invoker
  set search_path = public, pg_temp;

alter function public.has_active_subscription(uuid)
  security invoker
  set search_path = public, pg_temp;

revoke execute on function public.get_user_subscription(uuid) from public, anon, authenticated;
revoke execute on function public.has_active_subscription(uuid) from public, anon, authenticated;

grant execute on function public.get_user_subscription(uuid) to authenticated, service_role;
grant execute on function public.has_active_subscription(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Legacy wallet transactions: user-facing clients can read only; write paths
-- must stay behind trusted backend flows or security-definer RPCs.
-- -----------------------------------------------------------------------------

drop policy if exists "System can create wallet transactions" on public.wallet_transactions;
drop policy if exists wallet_transactions_insert_service_role on public.wallet_transactions;

revoke insert, update, delete on public.wallet_transactions from public, anon, authenticated;
grant select on public.wallet_transactions to authenticated;

create policy wallet_transactions_insert_service_role
  on public.wallet_transactions
  for insert
  to service_role
  with check (true);

-- -----------------------------------------------------------------------------
-- Keep user settings and safety records timestamped for auditability.
-- -----------------------------------------------------------------------------

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists safety_settings_set_updated_at on public.safety_settings;
create trigger safety_settings_set_updated_at
  before update on public.safety_settings
  for each row
  execute function public.set_updated_at();

drop trigger if exists safety_incidents_set_updated_at on public.safety_incidents;
create trigger safety_incidents_set_updated_at
  before update on public.safety_incidents
  for each row
  execute function public.set_updated_at();

drop trigger if exists safety_sos_alerts_set_updated_at on public.safety_sos_alerts;
create trigger safety_sos_alerts_set_updated_at
  before update on public.safety_sos_alerts
  for each row
  execute function public.set_updated_at();
