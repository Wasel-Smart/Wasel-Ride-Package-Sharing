import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve(
  __dirname,
  '../../src/supabase/migrations/20260401093000_database_hardening.sql',
);

const walletHardeningMigrationPath = path.resolve(
  __dirname,
  '../../src/supabase/migrations/20260409113000_wallet_and_runtime_integrity_hardening.sql',
);
const performanceIndexesMigrationPath = path.resolve(
  __dirname,
  '../../src/supabase/migrations/20260409153000_runtime_performance_indexes.sql',
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

describe('wallet runtime hardening migration', () => {
  const sql = fs.readFileSync(walletHardeningMigrationPath, 'utf8');

  it('enforces wallet balance and auto top-up bounds', () => {
    expect(sql).toContain('chk_wallets_non_negative_balances');
    expect(sql).toContain('chk_wallets_auto_top_up_bounds');
  });

  it('requires positive transaction amounts and non-empty payment references', () => {
    expect(sql).toContain('chk_transactions_positive_amount');
    expect(sql).toContain('chk_payment_methods_provider_present');
    expect(sql).toContain('chk_payment_methods_token_reference_present');
  });

  it('adds indexes for wallet lookup and transaction history access paths', () => {
    expect(sql).toContain('idx_wallets_user_status');
    expect(sql).toContain('idx_transactions_wallet_created_desc');
    expect(sql).toContain('idx_payment_methods_active_default');
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

describe('runtime performance indexes migration', () => {
  const sql = fs.readFileSync(performanceIndexesMigrationPath, 'utf8');

  it('adds an expression index for auth-user text lookups used by runtime policies', () => {
    expect(sql).toContain('idx_users_auth_user_id_text_lookup');
    expect(sql).toContain('auth_user_id::text');
  });
});
