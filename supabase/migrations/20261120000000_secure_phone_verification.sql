-- Move OTP lifecycle to Twilio Verify and make Wasel account confirmation atomic.
-- The legacy phone_verifications table is no longer used by the Edge Function.
-- Restrict it so old plaintext OTP records cannot be read through the Data API.
DROP POLICY IF EXISTS phone_verifications_own ON public.phone_verifications;
REVOKE ALL ON TABLE public.phone_verifications FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_phone_verification(
  p_user_id uuid,
  p_phone_number text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_user_id IS NULL
     OR p_phone_number IS NULL
     OR p_phone_number !~ '^\\+[1-9][0-9]{7,14}$' THEN
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

  INSERT INTO public.user_verifications (
    user_id,
    verification_type,
    status,
    verified_at,
    updated_at
  )
  VALUES (
    p_user_id,
    'phone',
    'verified',
    now(),
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_phone_verification(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_phone_verification(uuid, text)
  TO service_role;
