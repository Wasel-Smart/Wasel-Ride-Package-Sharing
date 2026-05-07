@echo off
echo ========================================
echo Testing Database Migrations
echo ========================================
echo.

echo Step 1: Stopping Supabase...
call npm run supabase:stop

echo.
echo Step 2: Starting fresh Supabase instance...
call npm run supabase:start

echo.
echo Step 3: Resetting database with all migrations...
call npm run supabase:db:reset

echo.
echo Step 4: Checking for migration conflicts...
call npm run supabase:db:diff

echo.
echo ========================================
echo Migration test complete!
echo ========================================
