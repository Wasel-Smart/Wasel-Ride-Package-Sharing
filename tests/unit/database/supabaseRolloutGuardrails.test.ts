import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { migrationCatalog, rolloutMigrations } from '../../../scripts/supabase-rollout-manifest.mjs';

const root = path.resolve(__dirname, '../../..');

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(root, relativePath), 'utf8');
}

describe('Supabase rollout guardrails', () => {
  it('registers all late-added rollout and historical migrations in the canonical catalog', () => {
    const catalogPaths = migrationCatalog.map(migration => migration.path);

    expect(catalogPaths).toContain(
      'src/supabase/migrations/20241201000001_payments_wallet_tables.sql',
    );
    expect(catalogPaths).toContain(
      'src/supabase/migrations/20241201000002_bus_services_tables.sql',
    );
    expect(catalogPaths).toContain(
      'src/supabase/migrations/20260324005540_kv_store.sql',
    );
    expect(rolloutMigrations.slice(-4)).toEqual([
      'src/supabase/migrations/20260421100000_stripe_subscriptions.sql',
      'src/supabase/migrations/20260422120000_safety_and_user_settings.sql',
      'src/supabase/migrations/20260424140000_harden_user_owned_rpc_boundaries.sql',
      'src/supabase/migrations/20260424153000_database_governance_and_rls_hardening.sql',
    ]);
  });

  it('keeps explicit caller-ownership checks on exposed security-definer booking and wallet RPCs', () => {
    const sql = read(
      'src/supabase/migrations/20260424140000_harden_user_owned_rpc_boundaries.sql',
    );

    expect(sql).toContain('create or replace function public.current_driver_id()');
    expect(sql).toContain('Cannot add funds to another user wallet');
    expect(sql).toContain('Cannot transfer funds from another user wallet');
    expect(sql).toContain('Cannot create trips for another driver');
    expect(sql).toContain('Cannot create bookings for another passenger');
    expect(sql).toContain('Cannot assign packages for another sender');
    expect(sql).toContain('Cannot submit verification for another user');
    expect(sql).toContain('create or replace function public.app_create_booking_request(');
    expect(sql).toContain('create or replace function public.app_update_booking_runtime_status(');
  });

  it('removes permissive legacy RLS paths from kv, subscription, and wallet surfaces', () => {
    const sql = read(
      'src/supabase/migrations/20260424153000_database_governance_and_rls_hardening.sql',
    );

    expect(sql).toContain('drop policy if exists "Public read access to non-expired KV entries"');
    expect(sql).toContain('create policy kv_store_select_public_runtime_configuration');
    expect(sql).toContain('alter function public.get_kv_value(text)');
    expect(sql).toContain('security invoker');
    expect(sql).toContain('drop policy if exists "Service role can do everything on subscriptions"');
    expect(sql).toContain('create policy subscriptions_select_own');
    expect(sql).toContain('create policy subscription_invoices_select_own');
    expect(sql).toContain('create policy wallet_transactions_insert_service_role');
    expect(sql).toContain('create trigger safety_sos_alerts_set_updated_at');
  });
});
