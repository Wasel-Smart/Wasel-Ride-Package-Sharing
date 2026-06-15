#!/usr/bin/env node
/**
 * Generate Rollback Scripts for Existing Migrations
 * Creates safe rollback scripts for all migrations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = './supabase/migrations';
const ROLLBACK_DIR = './supabase/migrations/rollback';

function generateRollbackScripts() {
  const migrations = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql') && !file.includes('README'))
    .sort();

  for (const migration of migrations) {
    const baseName = migration.replace('.sql', '');
    const rollbackFile = `${baseName}_rollback.sql`;
    const rollbackPath = path.join(ROLLBACK_DIR, rollbackFile);
    
    if (fs.existsSync(rollbackPath)) {
      console.log(`⏭️  Rollback exists: ${rollbackFile}`);
      continue;
    }

    const migrationPath = path.join(MIGRATIONS_DIR, migration);
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    
    const rollbackContent = generateRollbackContent(migration, migrationContent);
    
    fs.writeFileSync(rollbackPath, rollbackContent);
    console.log(`✅ Generated rollback: ${rollbackFile}`);
  }
}

function generateRollbackContent(migrationFile, migrationContent) {
  const timestamp = new Date().toISOString();
  
  return `-- Rollback for ${migrationFile}
-- Generated: ${timestamp}
-- CRITICAL: Review and customize this rollback before using in production

BEGIN;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- This rollback script reverses the changes made by ${migrationFile}
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

${generateSpecificRollbacks(migrationContent)}

-- Verify rollback completed successfully
DO $$
BEGIN
  RAISE NOTICE 'Rollback for ${migrationFile} completed at %', NOW();
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
-- ============================================================================`;
}

function generateSpecificRollbacks(migrationContent) {
  const rollbacks = [];
  
  // Generate specific rollback statements based on migration content
  if (migrationContent.includes('CREATE TABLE')) {
    rollbacks.push('-- DROP TABLE statements (customize as needed)');
    rollbacks.push('-- DROP TABLE IF EXISTS [table_name] CASCADE;');
  }
  
  if (migrationContent.includes('ALTER TABLE')) {
    rollbacks.push('-- ALTER TABLE rollback statements (customize as needed)');
    rollbacks.push('-- ALTER TABLE [table_name] DROP COLUMN IF EXISTS [column_name];');
  }
  
  if (migrationContent.includes('CREATE INDEX')) {
    rollbacks.push('-- DROP INDEX statements (customize as needed)');
    rollbacks.push('-- DROP INDEX IF EXISTS [index_name];');
  }
  
  if (migrationContent.includes('INSERT INTO')) {
    rollbacks.push('-- DELETE FROM statements (customize as needed)');
    rollbacks.push('-- DELETE FROM [table_name] WHERE [conditions];');
  }
  
  if (rollbacks.length === 0) {
    rollbacks.push('-- TODO: Add specific rollback statements for this migration');
    rollbacks.push('-- Review the original migration and add appropriate rollback commands');
  }
  
  return rollbacks.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateRollbackScripts();
}

export { generateRollbackScripts };