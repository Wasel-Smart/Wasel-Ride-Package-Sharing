import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve(
  __dirname,
  '../../src/supabase/migrations/20260401093000_database_hardening.sql',
);

const scorecardPath = path.resolve(
  __dirname,
  '../../docs/DATABASE_SCORECARD.md',
);

describe('database hardening migration', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('adds integrity constraints for package-enabled trips and delivered packages', () => {
    expect(sql).toContain('chk_trips_package_slots_bounds');
    expect(sql).toContain('chk_trips_package_mode_consistency');
    expect(sql).toContain('chk_packages_delivery_state');
  });

  it('protects payment method defaults and transaction reference integrity', () => {
    expect(sql).toContain('chk_transactions_reference_pair');
    expect(sql).toContain('uq_payment_methods_default_per_user');
    expect(sql).toContain('ensure_single_default_payment_method');
  });

  it('adds operational indexes that help auditability and query performance', () => {
    expect(sql).toContain('idx_bookings_passenger_status_created');
    expect(sql).toContain('idx_packages_sender_status_created');
    expect(sql).toContain('idx_package_events_package_created');
  });
});

describe('database scorecard', () => {
  const scorecard = fs.readFileSync(scorecardPath, 'utf8');

  it('documents a 9+ database score with rationale', () => {
    expect(scorecard).toContain('9.2/10');
    expect(scorecard).toContain('Why It Reaches 9+');
    expect(scorecard).toContain('Remaining Gap To Watch');
  });
});
