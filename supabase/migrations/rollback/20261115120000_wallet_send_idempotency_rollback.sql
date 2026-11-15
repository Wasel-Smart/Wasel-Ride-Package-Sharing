drop function if exists public.cleanup_wallet_operation_idempotency();
drop function if exists public.app_transfer_wallet_funds_idempotent(uuid, uuid, numeric, text, text, text);
drop table if exists public.wallet_operation_idempotency;
