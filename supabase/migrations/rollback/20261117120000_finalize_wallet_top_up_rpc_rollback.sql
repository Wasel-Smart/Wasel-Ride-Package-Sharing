-- Revert the wallet top-up finalization RPC.
--
-- Drops the function introduced in 20261117120000_finalize_wallet_top_up_rpc.sql.
-- The edge function no longer calls it; restoring the previous direct-Postgres
-- implementation would also require reverting the matching TypeScript change.

drop function if exists public.app_finalize_wallet_top_up(text, text, text, jsonb, numeric, text);