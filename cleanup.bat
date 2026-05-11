@echo off
echo Starting cleanup of unnecessary files...

REM Remove redundant documentation files
del /q "ADD_ALL_ENV_VARIABLES.md" 2>nul
del /q "APPLICATION_STATUS_REPORT.md" 2>nul
del /q "APPLICATION_VALUATION_PRICING.md" 2>nul
del /q "ARABIC_BEFORE_AFTER.md" 2>nul
del /q "ARABIC_LOCALIZATION_COMPLETE.md" 2>nul
del /q "ARABIC_LOCALIZATION_GUIDE.md" 2>nul
del /q "ARABIC_LOCALIZATION_INDEX.md" 2>nul
del /q "ARABIC_LOCALIZATION_README.md" 2>nul
del /q "ARABIC_LOCALIZATION_SUMMARY.md" 2>nul
del /q "ARABIC_UI_VISUAL_GUIDE.md" 2>nul
del /q "CHANGES_SUMMARY.md" 2>nul
del /q "CIRCUIT_BREAKER_FIX.md" 2>nul
del /q "COMPLETE_DEPLOYMENT_SOLUTION.md" 2>nul
del /q "COMPLETE_ENHANCEMENT_REPORT.md" 2>nul
del /q "COMPLETE_IMPLEMENTATION_SUMMARY.md" 2>nul
del /q "COMPLETE_IMPLEMENTATION.md" 2>nul
del /q "COMPLETE_SECURITY_AUDIT.md" 2>nul
del /q "COMPLETION_REPORT.md" 2>nul
del /q "COMPREHENSIVE_GAP_ANALYSIS_REPORT.md" 2>nul
del /q "COMPREHENSIVE_GAP_ANALYSIS.md" 2>nul
del /q "CRITICAL_FIXES_APPLIED.md" 2>nul
del /q "CRITICAL_FIXES_CHECKLIST.md" 2>nul
del /q "CRITICAL_FIXES_SUMMARY.md" 2>nul
del /q "CRITICAL_VERCEL_DASHBOARD_CONFIG.md" 2>nul
del /q "DEEP_DIVE_GAP_ANALYSIS_2025.md" 2>nul
del /q "DEPLOY_NOW.md" 2>nul
del /q "DEPLOYMENT_FIX_SUMMARY.md" 2>nul
del /q "DEPLOYMENT_GUIDE.md" 2>nul
del /q "DESIGN_FIXES_APPLIED.md" 2>nul
del /q "DESIGN_RATING_REPORT.md" 2>nul
del /q "DESIGN_RATING.md" 2>nul
del /q "DEVELOPER_QUICK_REFERENCE.md" 2>nul
del /q "DOCS_INDEX.md" 2>nul
del /q "FINAL_SETUP.md" 2>nul
del /q "FINAL_STATUS.md" 2>nul
del /q "financial-projections.md" 2>nul
del /q "FIX_ENTRYPOINT_ERROR.md" 2>nul
del /q "FIX_MIGRATION_ERROR.md" 2>nul
del /q "FIX_VERCEL_404.md" 2>nul
del /q "FIX_VERCEL_DASHBOARD_SETTINGS.md" 2>nul
del /q "funding-breakdown.md" 2>nul
del /q "GAP_REMEDIATION_ACTION_PLAN.md" 2>nul
del /q "IMMEDIATE_FIX_ENTRYPOINT_ERROR.md" 2>nul
del /q "IMPLEMENTATION_VERIFICATION_CHECKLIST.md" 2>nul
del /q "NEXT_STEPS.md" 2>nul
del /q "OAUTH-PROGRESS.md" 2>nul
del /q "OAUTH-QUICKSTART.md" 2>nul
del /q "OAUTH-REFERENCE.md" 2>nul
del /q "PRODUCTION_INTEGRATION_PROGRESS.md" 2>nul
del /q "PRODUCTION_LAUNCH_CHECKLIST.md" 2>nul
del /q "PRODUCTION_READINESS_REPORT.md" 2>nul
del /q "PROFILE_WALLET_RATING.md" 2>nul
del /q "QUICK_DEPLOY.md" 2>nul
del /q "QUICK_REFERENCE.md" 2>nul
del /q "QUICK_START_GUIDE.md" 2>nul
del /q "README_FIXES.md" 2>nul
del /q "README_V2.md" 2>nul
del /q "REMAINING_TASKS.md" 2>nul
del /q "SECURITY_ARCHITECTURE.md" 2>nul
del /q "SECURITY_FIXES_APPLIED.md" 2>nul
del /q "SETUP_COMPLETE.md" 2>nul
del /q "START_HERE.md" 2>nul
del /q "TROUBLESHOOTING_GUIDE.md" 2>nul
del /q "VERCEL_DEPLOYMENT_CHECKLIST.md" 2>nul
del /q "VERCEL_DEPLOYMENT_FIX_SUMMARY.md" 2>nul
del /q "VERCEL_ENV_SETUP.md" 2>nul
del /q "VERCEL_ENV_VARS.md" 2>nul
del /q "VERCEL_QUICK_REFERENCE.md" 2>nul
del /q "VERCEL_STATUS_FIX.md" 2>nul
del /q "VERCEL_TROUBLESHOOTING.md" 2>nul
del /q "WHAT_APPLICATION_NEEDS.md" 2>nul
del /q "WIRING_IMPROVEMENTS_SUMMARY.md" 2>nul
del /q "WIRING_QUICK_REFERENCE.md" 2>nul
del /q "WORLD_CLASS_UX_IMPLEMENTATION_GUIDE.md" 2>nul
del /q "WORLD_CLASS_UX_SUMMARY.md" 2>nul

REM Remove CSV files
del /q "Capability_status_for_amazon_pay_payments.csv" 2>nul
del /q "code-scanning-files-extracted.csv" 2>nul

REM Remove duplicate config files
del /q "vitest.config.mjs" 2>nul
del /q "vercel-minimal.json" 2>nul
del /q ".vercelrc" 2>nul
del /q ".firebaserc" 2>nul
del /q ".git-commit-message.txt" 2>nul
del /q "skills-lock.json" 2>nul

REM Remove patches folder
rmdir /s /q "patches" 2>nul

REM Remove supabase temp folders
rmdir /s /q "supabase\.temp" 2>nul
rmdir /s /q "supabase\downloaded" 2>nul

REM Remove docs redundant files
del /q "docs\GoogleService-Info.plist" 2>nul
del /q "docs\COMMUNICATIONS_DELIVERY_RUNBOOK.md" 2>nul
del /q "docs\DATABASE_SCORECARD.md" 2>nul
del /q "docs\FINAL_DELIVERY_SUMMARY.md" 2>nul
del /q "docs\INCIDENT_RESPONSE_RUNBOOKS.md" 2>nul
del /q "docs\LAUNCH_REHEARSAL_CHECKLIST.md" 2>nul
del /q "docs\MOCK_ENGINE_LAUNCH_PACK.md" 2>nul
del /q "docs\OAUTH_COMPLETE_SUMMARY.md" 2>nul
del /q "docs\OAUTH_IMPLEMENTATION_REPORT.md" 2>nul
del /q "docs\oauth-flow-diagram.md" 2>nul
del /q "docs\oauth-quick-start.md" 2>nul
del /q "docs\PRODUCTION_CUTOVER_CHECKLIST.md" 2>nul
del /q "docs\REAL_USER_TEST_MATRIX.md" 2>nul
del /q "docs\circuit-breaker-recovery.md" 2>nul
rmdir /s /q "docs\screenshots" 2>nul
rmdir /s /q "docs\adrs" 2>nul

REM Remove src documentation files
del /q "src\Attributions.md" 2>nul
del /q "src\IMPLEMENTATION_SUMMARY.md" 2>nul
del /q "src\MOBILITY_OS_IMPLEMENTATION.md" 2>nul
del /q "src\QUICK_START_NEW_FEATURES.md" 2>nul
del /q "src\lighthouserc.json" 2>nul

REM Remove supabase documentation
del /q "supabase\DATABASE_RATING_REPORT.md" 2>nul
del /q "supabase\PRODUCTION_DEPLOYMENT_GUIDE.md" 2>nul

REM Remove public placeholder
del /q "public\placeholder.txt" 2>nul

REM Remove duplicate scripts
del /q "scripts\verify-oauth.js" 2>nul
del /q "scripts\update-logo-assets.js" 2>nul
del /q "scripts\generate-wasel-brand-assets.py" 2>nul
del /q "scripts\test-migrations.bat" 2>nul
del /q "scripts\fix-build.bat" 2>nul
del /q "scripts\fix-build.sh" 2>nul

echo Cleanup completed!
pause
