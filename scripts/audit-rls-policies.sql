-- RLS Policy Audit Script
-- Run this to check all tables have proper Row Level Security

-- Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Find tables WITHOUT RLS enabled (security risk!)
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- Check for tables with no policies (even if RLS is enabled)
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- Critical tables that MUST have RLS
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✓ Protected'
        ELSE '✗ VULNERABLE'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'profiles', 
    'wallets',
    'transactions',
    'payment_methods',
    'trips',
    'packages',
    'drivers',
    'vehicles',
    'user_verification',
    'gdpr_requests',
    'audit_logs'
  )
ORDER BY 
    CASE WHEN rowsecurity THEN 1 ELSE 0 END,
    tablename;
