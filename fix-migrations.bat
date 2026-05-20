@echo off
echo ============================================
echo  Wasel - Fix Migration Order (--include-all)
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] Pushing all local migrations including out-of-order ones...
npx supabase db push --include-all

echo.
echo [2/2] Done. Check output above for errors.
echo.
echo If successful, now deploy the edge function:
echo   npx supabase functions deploy make-server-0b1f4071
echo.
pause
