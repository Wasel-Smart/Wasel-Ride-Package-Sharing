#!/usr/bin/env node
/**
 * Migration Safety Validator
 * Ensures every migration has a corresponding rollback script
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = './supabase/migrations';
const ROLLBACK_DIR = './supabase/migrations/rollback';

function validateMigrationSafety() {
  const migrations = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql') && !file.includes('README'));
  
  const rollbacks = fs.readdirSync(ROLLBACK_DIR)
    .filter(file => file.endsWith('_rollback.sql'));

  const missingRollbacks = [];
  const errors = [];

  for (const migration of migrations) {
    const baseName = migration.replace('.sql', '');
    const expectedRollback = `${baseName}_rollback.sql`;
    
    if (!rollbacks.includes(expectedRollback)) {
      missingRollbacks.push(migration);
    } else {
      // Validate rollback script structure
      const rollbackPath = path.join(ROLLBACK_DIR, expectedRollback);
      const rollbackContent = fs.readFileSync(rollbackPath, 'utf8');
      
      if (!rollbackContent.includes('BEGIN;') || !rollbackContent.includes('COMMIT;')) {
        errors.push(`Rollback ${expectedRollback} missing transaction boundaries`);
      }
      
      if (rollbackContent.includes('DROP TABLE') && !rollbackContent.includes('-- BACKUP')) {
        errors.push(`Rollback ${expectedRollback} drops tables without backup annotation`);
      }
    }
  }

  console.log('🔍 Migration Safety Check');
  console.log(`✅ Found ${migrations.length} migrations`);
  console.log(`✅ Found ${rollbacks.length} rollback scripts`);
  
  if (missingRollbacks.length > 0) {
    console.log(`❌ Missing rollback scripts:`);
    missingRollbacks.forEach(m => console.log(`   - ${m}`));
    process.exit(1);
  }
  
  if (errors.length > 0) {
    console.log(`❌ Rollback validation errors:`);
    errors.forEach(e => console.log(`   - ${e}`));
    process.exit(1);
  }
  
  console.log('✅ All migrations have valid rollback scripts');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateMigrationSafety();
}

export { validateMigrationSafety };