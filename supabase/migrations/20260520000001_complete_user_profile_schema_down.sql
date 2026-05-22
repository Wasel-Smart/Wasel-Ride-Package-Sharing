-- ============================================================
-- DOWN migration for 20260520000000_complete_user_profile_schema.sql
-- ✅ Gap 5 fixed: rollback safety — drops only the columns that
--    the up migration added. Run this to revert to pre-migration state.
-- ============================================================

ALTER TABLE profiles
  DROP COLUMN IF EXISTS email_verified,
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS verification_status,
  DROP COLUMN IF EXISTS trust_score,
  DROP COLUMN IF EXISTS rating_as_passenger,
  DROP COLUMN IF EXISTS total_rides_as_passenger,
  DROP COLUMN IF EXISTS total_rides_as_driver,
  DROP COLUMN IF EXISTS push_token,
  DROP COLUMN IF EXISTS push_enabled,
  DROP COLUMN IF EXISTS email_notifications,
  DROP COLUMN IF EXISTS sms_notifications,
  DROP COLUMN IF EXISTS whatsapp_notifications,
  DROP COLUMN IF EXISTS preferred_language,
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS national_id,
  DROP COLUMN IF EXISTS driver_license,
  DROP COLUMN IF EXISTS is_driver;

-- Note: phone_number and phone_verified were already present in earlier
-- migrations; they are intentionally NOT dropped here.
