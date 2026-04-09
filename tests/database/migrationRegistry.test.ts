import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalMigrationPattern,
  getMigrationFileName,
  getMigrationTimestamp,
  migrationCatalog,
  migrationReadmePath,
  renderMigrationReadme,
  rolloutMigrations,
} from '../../scripts/supabase-migration-registry.mjs';

const root = path.resolve(__dirname, '../..');

describe('supabase migration registry', () => {
  it('tracks every migration with a contiguous sequence and unique file path', () => {
    expect(migrationCatalog.map((migration) => migration.sequence)).toEqual(
      Array.from({ length: migrationCatalog.length }, (_, index) => index + 1),
    );
    expect(new Set(migrationCatalog.map((migration) => migration.path)).size).toBe(migrationCatalog.length);
  });

  it('requires canonical naming and unique timestamps for rollout migrations', () => {
    const timestamps = rolloutMigrations.map(getMigrationTimestamp);

    for (const migration of rolloutMigrations) {
      expect(canonicalMigrationPattern.test(getMigrationFileName(migration))).toBe(true);
    }

    expect(timestamps).toEqual([...timestamps].sort());
    expect(new Set(timestamps).size).toBe(timestamps.length);
  });

  it('keeps the migration README generated from the registry', () => {
    const readme = fs.readFileSync(path.resolve(root, migrationReadmePath), 'utf8');
    expect(readme).toBe(`${renderMigrationReadme()}\n`);
  });
});
