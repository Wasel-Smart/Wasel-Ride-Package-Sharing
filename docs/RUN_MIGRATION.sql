-- ============================================================================
-- Migration: Notification Worker Schema Fix
-- Run this in Supabase Dashboard → SQL Editor
-- Project: Wasel14.online (zexlxabdcsjefptmjhuq)
-- ============================================================================

-- 1. Add notification_preferences to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Add missing columns to notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 3. Create trigger for notifications updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notifications_updated_at'
  ) THEN
    CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

-- 4. Create GIN index on notifications payload
CREATE INDEX IF NOT EXISTS idx_notifications_payload_gin
  ON public.notifications USING GIN(payload);

-- 5. Backfill notifications metadata into payload
UPDATE public.notifications
SET payload = COALESCE(metadata, '{}'::jsonb)
WHERE payload = '{}'::jsonb AND metadata IS NOT NULL;

-- 6. Backfill notification_preferences from communication_preferences
UPDATE public.users u
SET notification_preferences = jsonb_build_object(
  'push', COALESCE(cp.push_enabled, true),
  'sms', COALESCE(cp.sms_enabled, true),
  'email', COALESCE(cp.email_enabled, true),
  'in_app', COALESCE(cp.in_app_enabled, true),
  'whatsapp', COALESCE(cp.whatsapp_enabled, true),
  'trip_updates', COALESCE(cp.trip_updates_enabled, true),
  'booking_requests', COALESCE(cp.booking_requests_enabled, true),
  'messages', COALESCE(cp.messages_enabled, true),
  'promotions', COALESCE(cp.promotions_enabled, true),
  'prayer_reminders', COALESCE(cp.prayer_reminders_enabled, true),
  'critical_alerts', COALESCE(cp.critical_alerts_enabled, true)
)
FROM public.communication_preferences cp
WHERE cp.user_id = u.id
  AND u.notification_preferences = '{}'::jsonb;

-- 7. Set defaults for users without preferences
UPDATE public.users
SET notification_preferences = jsonb_build_object(
  'push', true,
  'sms', true,
  'email', true,
  'in_app', true,
  'whatsapp', true,
  'trip_updates', true,
  'booking_requests', true,
  'messages', true,
  'promotions', true,
  'prayer_reminders', true,
  'critical_alerts', true
)
WHERE notification_preferences = '{}'::jsonb;

-- 8. Ensure updated_at is set for existing notifications
UPDATE public.notifications
SET updated_at = created_at
WHERE updated_at IS NULL;

-- ============================================================================
-- Verification Queries (run after migration)
-- ============================================================================

-- Verify users.notification_preferences exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'notification_preferences';

-- Verify notifications columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND column_name IN ('payload', 'updated_at', 'sent_at', 'error_message');

-- Verify trigger exists
SELECT tgname, tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname = 'trg_notifications_updated_at';

-- Verify GIN index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname = 'idx_notifications_payload_gin';

-- ============================================================================
-- Expected Result: All queries above should return rows
-- ============================================================================
