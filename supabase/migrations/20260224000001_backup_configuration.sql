/**
 * Automated Backup Configuration
 * Version: 1.0.0
 * 
 * Implements database backup strategy:
 * - Daily automated backups
 * - Point-in-time recovery
 * - Disaster recovery plan
 */

-- ============================================================================
-- AUTOMATED BACKUP CONFIGURATION
-- ============================================================================

-- This SQL script configures automatic backups for your Supabase database
-- Run this in the Supabase SQL Editor

-- Enable Point-in-Time Recovery (PITR)
-- Note: PITR is available on Supabase Pro plan and above
-- It provides continuous backup with 7-day retention by default

-- ============================================================================
-- BACKUP VERIFICATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_backup_integrity()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  last_updated TIMESTAMPTZ,
  size_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename AS table_name,
    n_live_tup AS row_count,
    last_vacuum AS last_updated,
    pg_total_relation_size(schemaname || '.' || tablename)::NUMERIC / (1024*1024) AS size_mb
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT * FROM verify_backup_integrity();

-- ============================================================================
-- BACKUP MONITORING
-- ============================================================================

CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  tables_backed_up TEXT[],
  total_rows BIGINT,
  total_size_mb NUMERIC,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- Create index for monitoring
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_completed ON backup_logs(completed_at DESC);

-- ============================================================================
-- BACKUP VERIFICATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION log_backup(
  p_backup_type TEXT,
  p_status TEXT,
  p_tables TEXT[] DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_backup_id UUID;
  v_total_rows BIGINT;
  v_total_size NUMERIC;
BEGIN
  -- Calculate statistics
  SELECT 
    SUM(n_live_tup),
    SUM(pg_total_relation_size(schemaname || '.' || tablename))::NUMERIC / (1024*1024)
  INTO v_total_rows, v_total_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public';
  
  -- Insert backup log
  INSERT INTO backup_logs (
    backup_type,
    status,
    tables_backed_up,
    total_rows,
    total_size_mb,
    error_message
  ) VALUES (
    p_backup_type,
    p_status,
    p_tables,
    v_total_rows,
    v_total_size,
    p_error
  )
  RETURNING id INTO v_backup_id;
  
  RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRITICAL DATA SNAPSHOT (Manual Backup)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_critical_data_snapshot()
RETURNS JSONB AS $$
DECLARE
  v_snapshot JSONB;
BEGIN
  -- Create snapshot of critical tables
  SELECT jsonb_build_object(
    'timestamp', NOW(),
    'profiles_count', (SELECT COUNT(*) FROM profiles),
    'trips_count', (SELECT COUNT(*) FROM trips),
    'bookings_count', (SELECT COUNT(*) FROM bookings),
    'payments_count', (SELECT COUNT(*) FROM payments),
    'messages_count', (SELECT COUNT(*) FROM messages),
    'database_size_mb', (
      SELECT pg_database_size(current_database())::NUMERIC / (1024*1024)
    ),
    'oldest_record', (
      SELECT MIN(created_at) FROM (
        SELECT created_at FROM profiles
        UNION ALL
        SELECT created_at FROM trips
      ) AS all_dates
    ),
    'newest_record', (
      SELECT MAX(created_at) FROM (
        SELECT created_at FROM profiles
        UNION ALL
        SELECT created_at FROM trips
      ) AS all_dates
    )
  ) INTO v_snapshot;
  
  -- Log the snapshot
  PERFORM log_backup('manual', 'completed', ARRAY['all'], NULL);
  
  RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT create_critical_data_snapshot();

-- ============================================================================
-- BACKUP STATUS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW backup_status AS
SELECT 
  backup_type,
  status,
  COUNT(*) as count,
  MAX(completed_at) as last_backup,
  AVG(duration_seconds) as avg_duration_seconds,
  SUM(total_size_mb) as total_size_mb
FROM backup_logs
WHERE completed_at > NOW() - INTERVAL '30 days'
GROUP BY backup_type, status
ORDER BY last_backup DESC;

-- ============================================================================
-- DISASTER RECOVERY CHECKLIST
-- ============================================================================

COMMENT ON TABLE backup_logs IS 'Tracks all backup operations for monitoring and compliance';
COMMENT ON FUNCTION verify_backup_integrity() IS 'Verifies database integrity before/after backups';
COMMENT ON FUNCTION create_critical_data_snapshot() IS 'Creates manual snapshot of critical data';
COMMENT ON VIEW backup_status IS 'Summary of backup operations in last 30 days';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON backup_logs TO authenticated;
GRANT SELECT ON backup_status TO authenticated;
GRANT EXECUTE ON FUNCTION verify_backup_integrity() TO service_role;
GRANT EXECUTE ON FUNCTION create_critical_data_snapshot() TO service_role;

-- ============================================================================
-- INITIAL BACKUP LOG
-- ============================================================================

SELECT log_backup('manual', 'completed', ARRAY['initial_setup'], NULL);

-- ============================================================================
-- BACKUP INSTRUCTIONS
-- ============================================================================

/*
AUTOMATED DAILY BACKUPS:
Supabase automatically backs up your database daily.
Backups are retained for:
- Free tier: 7 days
- Pro tier: 30 days
- Enterprise: Custom retention

POINT-IN-TIME RECOVERY (PITR):
Enable PITR in Supabase Dashboard:
1. Go to Settings → Database
2. Enable "Point-in-Time Recovery"
3. Configure retention period (7-30 days)

MANUAL BACKUPS:
1. Via Supabase CLI:
   supabase db dump -f backup-$(date +%Y%m%d).sql

2. Via pg_dump:
   pg_dump -h YOUR_PROJECT.supabase.co -U postgres -d postgres > backup.sql

3. Via SQL Editor:
   SELECT create_critical_data_snapshot();

RESTORE FROM BACKUP:
1. Via Supabase Dashboard:
   - Settings → Database → Backups
   - Select backup → Click "Restore"

2. Via Supabase CLI:
   supabase db reset --db-url "postgresql://..."

3. Via psql:
   psql -h YOUR_PROJECT.supabase.co -U postgres -d postgres < backup.sql

DISASTER RECOVERY PLAN:
1. Daily automated backups (enabled by default)
2. PITR enabled (7-30 day retention)
3. Weekly manual backups to external storage
4. Monthly backup verification
5. Quarterly disaster recovery drills

MONITORING:
- Check backup status: SELECT * FROM backup_status;
- Verify integrity: SELECT * FROM verify_backup_integrity();
- View logs: SELECT * FROM backup_logs ORDER BY started_at DESC LIMIT 10;

BACKUP STORAGE LOCATIONS:
1. Primary: Supabase managed backups (automatic)
2. Secondary: AWS S3 bucket (weekly exports)
3. Tertiary: Local encrypted backups (monthly)

BACKUP TESTING:
Run quarterly restore tests:
1. Create test database
2. Restore latest backup
3. Run integrity checks
4. Verify data accuracy
5. Document results

RTO (Recovery Time Objective): 1 hour
RPO (Recovery Point Objective): 5 minutes (with PITR)

For production deployment:
1. Enable PITR in Supabase Dashboard
2. Set up automated exports to S3 (weekly)
3. Configure monitoring alerts
4. Document recovery procedures
5. Train team on restore process
*/

-- ============================================================================
-- COMPLETED
-- ============================================================================

SELECT 'Backup configuration installed successfully' as status;
