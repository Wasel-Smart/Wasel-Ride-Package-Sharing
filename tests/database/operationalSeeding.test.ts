import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  migrationCatalog,
  operationalSeedFiles,
  rolloutMigrations,
  rolloutSeedFiles,
} from '../../scripts/supabase-rollout-manifest.mjs';

const root = path.resolve(__dirname, '../..');
const bootstrapMigrationPath = path.resolve(
  root,
  'src/supabase/migrations/20260404153000_operational_bootstrap_reference_data.sql',
);
const automationAccessMigrationPath = path.resolve(
  root,
  'src/supabase/migrations/20260406101500_harden_automation_queue_access_and_support_rpcs.sql',
);
const docsPath = path.resolve(root, 'docs/OPERATIONAL_SEEDING.md');

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(root, relativePath), 'utf8');
}

describe('operational seeding rollout', () => {
  it('registers the automation access hardening migration after the operational bootstrap step', () => {
    const bootstrapIndex = rolloutMigrations.indexOf(
      'src/supabase/migrations/20260404153000_operational_bootstrap_reference_data.sql',
    );
    const automationSecurityIndex = rolloutMigrations.indexOf(
      'src/supabase/migrations/20260409120000_production_security_and_queue_hardening.sql',
    );

    expect(bootstrapIndex).toBeGreaterThanOrEqual(0);
    expect(automationSecurityIndex).toBeGreaterThan(bootstrapIndex);
  });

  it('keeps the rollout migration registry in canonical timestamp order with unique timestamps', () => {
    const rolloutEntries = migrationCatalog.filter((migration) => migration.phase === 'rollout');
    const timestamps = rolloutEntries.map((migration) => path.basename(migration.path).match(/^(\d{14})_/)?.[1]);

    expect(timestamps).toEqual([...timestamps].sort());
    expect(new Set(timestamps).size).toBe(timestamps.length);
  });

  it('defines the required modular seed files in execution order', () => {
    expect(operationalSeedFiles).toEqual([
      'db/seeds/roles.seed.sql',
      'db/seeds/cities.seed.sql',
      'db/seeds/trip_types.seed.sql',
      'db/seeds/pricing.seed.sql',
      'db/seeds/core.seed.sql',
      'db/seeds/automation.seed.sql',
    ]);
    expect(rolloutSeedFiles.at(-1)).toBe('src/supabase/seeds/mock_engine_smoke_checks.sql');
  });

  it('creates the operational reference tables and paired-trip lifecycle support', () => {
    const sql = fs.readFileSync(bootstrapMigrationPath, 'utf8');
    expect(sql).toContain('create table if not exists public.system_roles');
    expect(sql).toContain('create table if not exists public.cities');
    expect(sql).toContain('create table if not exists public.trip_types_catalog');
    expect(sql).toContain('create table if not exists public.route_corridors');
    expect(sql).toContain('create table if not exists public.pricing_rules');
    expect(sql).toContain('create table if not exists public.seed_execution_log');
    expect(sql).toContain('add column if not exists trip_type_key text not null default \'wasel\'');
    expect(sql).toContain('add column if not exists paired_trip_id uuid');
    expect(sql).toContain('chk_trips_trip_type_key');
  });

  it('locks down client automation writes and adds atomic support ticket RPCs', () => {
    const sql = fs.readFileSync(automationAccessMigrationPath, 'utf8');
    expect(sql).toContain('drop policy if exists automation_jobs_insert_own on public.automation_jobs');
    expect(sql).toContain('drop policy if exists support_tickets_insert_own on public.support_tickets');
    expect(sql).toContain('drop policy if exists support_tickets_update_own on public.support_tickets');
    expect(sql).toContain('drop policy if exists support_ticket_events_insert_own on public.support_ticket_events');
    expect(sql).toContain('create or replace function public.app_enqueue_automation_job(');
    expect(sql).toContain('create or replace function public.app_create_support_ticket(');
    expect(sql).toContain('create or replace function public.app_update_support_ticket_status(');
  });

  it('keeps every operational seed file idempotent and logged', () => {
    for (const file of operationalSeedFiles) {
      const sql = read(file);
      expect(sql).toContain('begin;');
      expect(sql).toContain('commit;');
      expect(sql).toContain('insert into public.seed_execution_log');
      expect(sql.toLowerCase()).toContain('on conflict');
    }
  });

  it('covers the full business bootstrap footprint in the seed modules', () => {
    const pricingSeed = read('db/seeds/pricing.seed.sql');
    const coreSeed = read('db/seeds/core.seed.sql');
    const automationSeed = read('db/seeds/automation.seed.sql');

    expect(pricingSeed).toContain('insert into public.route_corridors');
    expect(pricingSeed).toContain('insert into public.pricing_rules');
    expect(coreSeed).toContain('insert into public.users');
    expect(coreSeed).toContain('insert into public.trips');
    expect(coreSeed).toContain('insert into public.bookings');
    expect(coreSeed).toContain('insert into public.packages');
    expect(coreSeed).toContain('insert into public.notifications');
    expect(coreSeed).toContain('trip_type_key');
    expect(automationSeed).toContain('insert into public.route_reminders');
    expect(automationSeed).toContain('insert into public.pricing_snapshots');
    expect(automationSeed).toContain('insert into public.automation_jobs');
    expect(automationSeed).toContain('select public.app_backfill_automation_jobs(50);');
  });

  it('documents how to run and extend the operational seed pipeline', () => {
    const docs = fs.readFileSync(docsPath, 'utf8');
    expect(docs).toContain('npm run seed');
    expect(docs).toContain('apply:supabase-rollout -- --with-seeds');
    expect(docs).toContain('scripts/supabase-migration-registry.mjs');
    expect(docs).toContain('The legacy mock launch pack');
  });
});
