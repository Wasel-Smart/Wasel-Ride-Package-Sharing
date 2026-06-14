-- Rollback for 20260612000000_production_index_optimization.sql
-- Generated: 2026-06-14T05:55:55.104Z
-- CRITICAL: Review and customize this rollback before using in production

BEGIN;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- This rollback script reverses the changes made by 20260612000000_production_index_optimization.sql
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

-- DROP INDEX statements (customize as needed)
-- DROP INDEX IF EXISTS [index_name];

-- Verify rollback completed successfully
DO $$
BEGIN
  RAISE NOTICE 'Rollback for 20260612000000_production_index_optimization.sql completed at %', NOW();
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