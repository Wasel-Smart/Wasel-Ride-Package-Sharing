-- =============================================================================
-- Rollback: 20261103230701_secure_sensitive_rpc_execution
-- Effect:   Restores EXECUTE grants on privileged RPCs to authenticated role.
--           Only run this if the forward migration must be undone.
--           WARNING: re-exposes sensitive RPCs to all authenticated API callers.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  target_function regprocedure;
  service_only_function_names text[] := ARRAY[
    'wallet_post_transaction',
    'app_add_wallet_funds',
    'app_transfer_wallet_funds',
    'app_create_trip',
    'app_book_trip',
    'app_assign_package_to_trip',
    'app_withdraw_wallet_funds',
    'app_pay_with_wallet',
    'app_credit_driver_earnings',
    'app_confirm_package_delivery',
    'app_approve_driver',
    'increment_balance',
    'decrement_balance',
    'increment_pending_balance',
    'app_create_ride_booking',
    'app_cancel_trip_booking',
    'app_get_driver_rating'
  ];
BEGIN
  FOR target_function IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(service_only_function_names)
  LOOP
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO authenticated',
      target_function
    );
  END LOOP;
END $$;

-- Restore default privileges so future functions are also executable by authenticated
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
