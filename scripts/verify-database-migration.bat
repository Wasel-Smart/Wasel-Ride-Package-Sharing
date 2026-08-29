@echo off
setlocal enabledelayedexpansion

echo =====================================================================================
echo ===========================...VERIFYING DATABASE MIGRATION...========================"
echo =====================================================================================

echo Checking users.notification_preferences column...
echo Run this in Supabase Dashboard SQL Editor:
echo   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notification_preferences';
echo.

echo Checking notifications payload column...
echo Run this in Supabase Dashboard SQL Editor:
echo   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'payload';
echo.

echo Checking notifications updated_at column...
echo Run this in Supabase Dashboard SQL Editor:
echo   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'updated_at';
echo.

echo Checking trigger...
echo Run this in Supabase Dashboard SQL Editor:
echo   SELECT tgname, tgrelid::regclass AS table_name FROM pg_trigger WHERE tgname = 'trg_notifications_updated_at';
echo.

echo Checking GIN index...
echo Run this in Supabase Dashboard SQL Editor:
echo   SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'idx_notifications_payload_gin';
echo.

echo =====================================================================================
echo ==============================...VERIFICATION COMPLETE...=============================
echo =====================================================================================
echo.
echo Open https://app.supabase.com/project/zexlxabdcsjefptmjhuq/editor and run the queries above.
