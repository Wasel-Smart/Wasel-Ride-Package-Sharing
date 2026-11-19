-- Move OTP lifecycle to Twilio Verify and make Wasel account confirmation atomic.
-- Legacy OTPs are one-time credentials. They are invalid after this migration.
DELETE FROM public.phone_verifications;
DROP POLICY IF EXISTS phone_verifications_own ON public.phone_verifications;
REVOKE ALL ON TABLE public.phone_verifications FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_phone_verification(
  p_user_id uuid,
  p_phone_number text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_user_id IS NULL
     OR p_phone_number IS NULL
     OR p_phone_number !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'Invalid phone verification input'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
     SET phone_number = p_phone_number,
         phone_verified = true
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.user_verifications
     SET status = 'verified',
         verified_at = now(),
         updated_at = now()
   WHERE id = (
     SELECT id
       FROM public.user_verifications
      WHERE user_id = p_user_id
        AND verification_type = 'phone'
      ORDER BY created_at DESC
      LIMIT 1
   );

  IF NOT FOUND THEN
    INSERT INTO public.user_verifications (
      user_id, verification_type, status, verified_at, updated_at
    ) VALUES (p_user_id, 'phone', 'verified', now(), now());
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_phone_verification(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_phone_verification(uuid, text)
  TO service_role;

-- Private table for atomic per-user/per-number throttling.
CREATE SCHEMA IF NOT EXISTS phone_verification_private;
REVOKE ALL ON SCHEMA phone_verification_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS phone_verification_private.phone_verification_rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  action text NOT NULL CHECK (action IN ('send', 'verify')),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, phone_number, action)
);

REVOKE ALL ON TABLE phone_verification_private.phone_verification_rate_limits
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_phone_verification_rate_limit(
  p_user_id uuid,
  p_phone_number text,
  p_action text,
  p_limit integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, phone_verification_private
AS $$
DECLARE
  v_allowed boolean := false;
BEGIN
  IF p_user_id IS NULL
     OR p_phone_number IS NULL
     OR p_action IS NULL
     OR p_limit IS NULL
     OR (p_phone_number <> '*' AND p_phone_number !~ '^\+[1-9][0-9]{7,14}$')
     OR p_action NOT IN ('send', 'verify')
     OR p_limit NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'Invalid phone rate-limit input'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO phone_verification_private.phone_verification_rate_limits AS limits (
    user_id, phone_number, action, window_started_at, request_count
  )
  VALUES (p_user_id, p_phone_number, p_action, now(), 1)
  ON CONFLICT (user_id, phone_number, action)
  DO UPDATE SET
    request_count = CASE
      WHEN limits.window_started_at <= now() - interval '15 minutes' THEN 1
      ELSE limits.request_count + 1
    END,
    window_started_at = CASE
      WHEN limits.window_started_at <= now() - interval '15 minutes' THEN now()
      ELSE limits.window_started_at
    END
  WHERE limits.window_started_at <= now() - interval '15 minutes'
     OR limits.request_count < p_limit
  RETURNING true INTO v_allowed;

  RETURN COALESCE(v_allowed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_phone_verification_rate_limit(uuid, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_phone_verification_rate_limit(uuid, text, text, integer)
  TO service_role;
