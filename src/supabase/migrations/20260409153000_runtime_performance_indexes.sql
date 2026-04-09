-- Runtime performance indexes for the current app contract.
-- Responsibility boundary: index-only migration for frequent auth and policy
-- lookup paths. No schema shape changes or data backfills.

create index if not exists idx_users_auth_user_id_text_lookup
  on public.users ((auth_user_id::text))
  where auth_user_id is not null;
