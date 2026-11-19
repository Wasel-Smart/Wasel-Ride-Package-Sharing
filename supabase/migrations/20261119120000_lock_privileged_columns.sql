-- ============================================================================
-- Lock privileged columns against direct Data-API writes
-- Migration: 20261119120000_lock_privileged_columns.sql
--
-- Why: users_self_or_admin_update / drivers_self_or_admin_update let a signed-in
-- user UPDATE their own row with no column restriction, and `authenticated`
-- holds table-level UPDATE (20260720062017). A direct PostgREST PATCH could
-- therefore set role='admin', driver_status='approved', verification_level, etc.
-- The web client's allow-list (updateDirectProfile) does not bind an attacker
-- who skips the client.
--
-- Approach: BEFORE triggers that run only for Data-API roles (anon /
-- authenticated). SECURITY DEFINER RPCs (app_private.enable_driver_mode) and the
-- service role run as other roles and are unaffected. Uses to_jsonb() so the
-- migration works regardless of which optional columns exist.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION app_private.guard_users_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  protected text[] := ARRAY[
    'role', 'auth_user_id', 'verification_level', 'phone_verified_at',
    'email_verified_at', 'two_factor_enabled', 'rating', 'rating_as_driver',
    'trust_score', 'is_banned', 'deleted_at', 'created_at'
  ];
  k text;
  old_j jsonb;
  new_j jsonb;
BEGIN
  -- Only constrain Data-API callers. Definer functions / service role bypass.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- New self-registered rows must start as the least-privileged role.
    IF coalesce(NEW.role::text, 'passenger') <> 'passenger' THEN
      RAISE EXCEPTION 'Cannot self-assign role %', NEW.role USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  old_j := to_jsonb(OLD);
  new_j := to_jsonb(NEW);
  FOREACH k IN ARRAY protected LOOP
    IF old_j ? k AND (old_j -> k) IS DISTINCT FROM (new_j -> k) THEN
      -- Clearing a verification timestamp (e.g. after a phone change) is safe;
      -- setting or changing it is not.
      IF k IN ('phone_verified_at', 'email_verified_at') AND (new_j -> k) = 'null'::jsonb THEN
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'Column "%" cannot be changed from the client', k USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_users_privileged_columns ON public.users;
CREATE TRIGGER trg_guard_users_privileged_columns
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION app_private.guard_users_privileged_columns();

-- drivers: a driver must not approve themselves.
CREATE OR REPLACE FUNCTION app_private.guard_drivers_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  protected text[] := ARRAY['driver_status', 'verification_level', 'user_id', 'approved_at', 'approved_by'];
  k text;
  old_j jsonb;
  new_j jsonb;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.driver_status::text, 'pending_approval') <> 'pending_approval' THEN
      RAISE EXCEPTION 'New driver profiles must start as pending_approval' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  old_j := to_jsonb(OLD);
  new_j := to_jsonb(NEW);
  FOREACH k IN ARRAY protected LOOP
    IF old_j ? k AND (old_j -> k) IS DISTINCT FROM (new_j -> k) THEN
      -- Going online/offline/busy is a normal driver action; approval is not.
      IF k = 'driver_status'
         AND (old_j ->> k) IN ('approved', 'online', 'offline', 'busy')
         AND (new_j ->> k) IN ('online', 'offline', 'busy', 'approved')
         AND (old_j ->> k) <> 'pending_approval' THEN
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'Column "%" cannot be changed from the client', k USING ERRCODE = '42501';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_drivers_privileged_columns ON public.drivers;
CREATE TRIGGER trg_guard_drivers_privileged_columns
  BEFORE INSERT OR UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION app_private.guard_drivers_privileged_columns();

-- Wallet balances are mutated only by SECURITY DEFINER RPCs / service role.
-- No client UPDATE policy exists; remove the grants as defense in depth.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.transactions FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
