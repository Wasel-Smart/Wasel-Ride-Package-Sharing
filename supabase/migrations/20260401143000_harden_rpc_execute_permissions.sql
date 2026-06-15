-- Harden RPC privileges for SECURITY DEFINER functions.
-- Goal:
-- 1. Revoke broad default execute access.
-- 2. Keep internal/admin-only functions closed by default.
-- 3. Grant authenticated execute only to user-facing RPCs.
-- 4. Set an explicit search_path on privileged functions.

-- Explicit search_path reduces SECURITY DEFINER hijack risk.
alter function public.wallet_post_transaction(
  uuid, numeric, public.transaction_type_v2, public.payment_method_v2, text, text, uuid, jsonb
) set search_path = public, pg_temp;

alter function public.app_add_wallet_funds(
  uuid, numeric, public.payment_method_v2, text
) set search_path = public, pg_temp;

alter function public.app_transfer_wallet_funds(
  uuid, uuid, numeric, public.payment_method_v2
) set search_path = public, pg_temp;

alter function public.app_create_trip(
  uuid, text, text, timestamptz, integer, numeric, boolean, integer
) set search_path = public, pg_temp;

alter function public.app_book_trip(
  uuid, uuid, integer, public.payment_method_v2
) set search_path = public, pg_temp;

alter function public.app_credit_driver_earnings(uuid)
set search_path = public, pg_temp;

alter function public.app_assign_package_to_trip(
  uuid, uuid
) set search_path = public, pg_temp;

alter function public.app_confirm_package_delivery(
  uuid, uuid
) set search_path = public, pg_temp;

alter function public.app_submit_sanad_verification(
  uuid, text, text
) set search_path = public, pg_temp;

alter function public.app_complete_sanad_verification(
  uuid, boolean, uuid, text
) set search_path = public, pg_temp;

alter function public.app_approve_driver(
  uuid, uuid
) set search_path = public, pg_temp;

-- Revoke broad default execute access from all app roles first.
revoke execute on function public.wallet_post_transaction(
  uuid, numeric, public.transaction_type_v2, public.payment_method_v2, text, text, uuid, jsonb
) from public, anon, authenticated;

revoke execute on function public.app_add_wallet_funds(
  uuid, numeric, public.payment_method_v2, text
) from public, anon, authenticated;

revoke execute on function public.app_transfer_wallet_funds(
  uuid, uuid, numeric, public.payment_method_v2
) from public, anon, authenticated;

revoke execute on function public.app_create_trip(
  uuid, text, text, timestamptz, integer, numeric, boolean, integer
) from public, anon, authenticated;

revoke execute on function public.app_book_trip(
  uuid, uuid, integer, public.payment_method_v2
) from public, anon, authenticated;

revoke execute on function public.app_credit_driver_earnings(uuid)
from public, anon, authenticated;

revoke execute on function public.app_assign_package_to_trip(
  uuid, uuid
) from public, anon, authenticated;

revoke execute on function public.app_confirm_package_delivery(
  uuid, uuid
) from public, anon, authenticated;

revoke execute on function public.app_submit_sanad_verification(
  uuid, text, text
) from public, anon, authenticated;

revoke execute on function public.app_complete_sanad_verification(
  uuid, boolean, uuid, text
) from public, anon, authenticated;

revoke execute on function public.app_approve_driver(
  uuid, uuid
) from public, anon, authenticated;

-- User-facing functions allowed to authenticated clients.
grant execute on function public.app_add_wallet_funds(
  uuid, numeric, public.payment_method_v2, text
) to authenticated;

grant execute on function public.app_transfer_wallet_funds(
  uuid, uuid, numeric, public.payment_method_v2
) to authenticated;

grant execute on function public.app_create_trip(
  uuid, text, text, timestamptz, integer, numeric, boolean, integer
) to authenticated;

grant execute on function public.app_book_trip(
  uuid, uuid, integer, public.payment_method_v2
) to authenticated;

grant execute on function public.app_assign_package_to_trip(
  uuid, uuid
) to authenticated;

grant execute on function public.app_submit_sanad_verification(
  uuid, text, text
) to authenticated;

-- Keep these internal/admin-only by not granting to authenticated:
-- - wallet_post_transaction
-- - app_credit_driver_earnings
-- - app_confirm_package_delivery
-- - app_complete_sanad_verification
-- - app_approve_driver
