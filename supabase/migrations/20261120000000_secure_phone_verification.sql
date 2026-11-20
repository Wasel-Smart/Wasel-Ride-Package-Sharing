-- Safe additive phone-verification support for Wasel's confirmed KV-backed project.
-- No assumed profiles/user_verifications tables and no deletion of legacy data.
CREATE SCHEMA IF NOT EXISTS phone_verification_private;
REVOKE ALL ON SCHEMA phone_verification_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS phone_verification_private.rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  action text NOT NULL CHECK (action IN ('send', 'verify')),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, subject, action)
);
REVOKE ALL ON TABLE phone_verification_private.rate_limits FROM PUBLIC, anon, authenticated, service_role;

CREATE UNIQUE INDEX IF NOT EXISTS auth_users_verified_phone_unique
ON auth.users ((raw_app_meta_data ->> 'phone_number'))
WHERE raw_app_meta_data ->> 'phone_verified' = 'true'
  AND raw_app_meta_data ->> 'phone_number' IS NOT NULL;

CREATE OR REPLACE FUNCTION public.consume_phone_verification_rate_limit(
  p_user_id uuid, p_phone_number text, p_action text, p_limit integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, phone_verification_private
AS $$
DECLARE v_allowed boolean := false;
BEGIN
  IF p_user_id IS NULL OR p_phone_number IS NULL OR p_action NOT IN ('send','verify')
     OR p_limit NOT BETWEEN 1 AND 10
     OR (p_phone_number <> '*' AND p_phone_number !~ '^\\+[1-9][0-9]{7,14}$') THEN
    RAISE EXCEPTION 'Invalid rate-limit input' USING ERRCODE = '22023';
  END IF;
  INSERT INTO phone_verification_private.rate_limits AS limits
    (user_id, subject, action, window_started_at, request_count)
  VALUES (p_user_id, p_phone_number, p_action, now(), 1)
  ON CONFLICT (user_id, subject, action) DO UPDATE SET
    request_count = CASE WHEN limits.window_started_at <= now() - interval '15 minutes'
      THEN 1 ELSE limits.request_count + 1 END,
    window_started_at = CASE WHEN limits.window_started_at <= now() - interval '15 minutes'
      THEN now() ELSE limits.window_started_at END
  WHERE limits.window_started_at <= now() - interval '15 minutes'
     OR limits.request_count < p_limit
  RETURNING true INTO v_allowed;
  RETURN COALESCE(v_allowed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_phone_verification(
  p_user_id uuid, p_phone_number text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_phone_number IS NULL
     OR p_phone_number !~ '^\\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'Invalid phone verification input' USING ERRCODE = '22023';
  END IF;
  UPDATE auth.users
     SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
       || jsonb_build_object('phone_number', p_phone_number, 'phone_verified', true),
         updated_at = now()
   WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Auth user not found' USING ERRCODE = 'P0002'; END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_phone_verification_rate_limit(uuid,text,text,integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_phone_verification(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_phone_verification_rate_limit(uuid,text,text,integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_phone_verification(uuid,text)
  TO service_role;
