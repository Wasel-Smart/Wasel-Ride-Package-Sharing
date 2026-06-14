-- Rollback for 20260401133000_align_canonical_rls_policies.sql
-- Generated: 2026-06-14T05:55:54.975Z
-- CRITICAL: Review and customize this rollback before using in production

BEGIN;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- This rollback script reverses the changes made by 20260401133000_align_canonical_rls_policies.sql
-- 
-- BEFORE EXECUTING:
-- 1. Create a backup: pg_dump -Fc wasel > backup_$(date +%Y%m%d_%H%M%S).dump
-- 2. Test on staging environment first
-- 3. Verify data integrity after rollback
-- 4. Update application if schema changes affect code
-- ============================================================================

-- BACKUP CRITICAL DATA (uncomment if needed)
-- CREATE TABLE IF NOT EXISTS rollback_backup_$(date +%Y%m%d) AS 
-- SELECT * FROM [table_name] WHERE [conditions];

-- TODO: Add specific rollback statements for this migration
-- Review the original migration and add appropriate rollback commands

-- Verify rollback completed successfully
DO $$
BEGIN
  RAISE NOTICE 'Rollback for 20260401133000_align_canonical_rls_policies.sql completed at %', NOW();
END $$;

COMMIT;

-- ============================================================================
-- POST-ROLLBACK CHECKLIST
-- ============================================================================
-- [ ] Verify application functionality
-- [ ] Check data integrity
-- [ ] Run performance tests
-- [ ] Update documentation
-- [ ] Notify team of rollback completion
-- ============================================================================