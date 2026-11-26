-- =============================================================================
-- Rollback: 20261108120000_pin_search_path_wallet_balance_fn
-- Effect:   Removes the fixed search_path from get_authoritative_wallet_balance
--           and restores EXECUTE to authenticated role.
--           WARNING: removes the search_path hardening; only roll back if
--           the function is being replaced or retired.
-- =============================================================================

DO $$
BEGIN
  IF to_regprocedure('public.get_authoritative_wallet_balance(uuid)') IS NOT NULL THEN
    -- Remove the pinned search_path (revert to default)
    ALTER FUNCTION public.get_authoritative_wallet_balance(uuid)
      RESET search_path;

    -- Restore grant to authenticated (pre-hardening state)
    GRANT EXECUTE ON FUNCTION public.get_authoritative_wallet_balance(uuid) TO authenticated;
  END IF;
END
$$;
