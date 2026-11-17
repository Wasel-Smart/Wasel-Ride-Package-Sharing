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
    expect(rolloutMigrations.slice(-5)).toEqual([
      'src/supabase/migrations/20260422120000_safety_and_user_settings.sql',
      'src/supabase/migrations/20260424140000_harden_user_owned_rpc_boundaries.sql',
      'src/supabase/migrations/20260424153000_database_governance_and_rls_hardening.sql',
      'src/supabase/migrations/20261117090000_booking_authorization_and_distributed_rate_limits.sql',
      'src/supabase/migrations/20261117110000_payment_webhook_idempotency_and_settlement_safety.sql',
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

  it('uses atomic database-backed rate limits for every protected Edge handler', () => {
    const limiter = read('supabase/functions/make-server-0b1f4071/_shared/security-runtime.ts');
    const twoFactor = read('supabase/functions/make-server-0b1f4071/two-factor-handlers.ts');
    const wallet = read('supabase/functions/make-server-0b1f4071/wallet-handlers.ts');
    const communications = read('supabase/functions/make-server-0b1f4071/communications-handlers.ts');

    expect(limiter).toContain("admin.rpc('consume_edge_rate_limit'");
    expect(limiter).not.toContain('new Map<string, RateLimitState>');
    expect(twoFactor).toContain('consumeRateLimitToken(auth.admin');
    expect(wallet).toContain('consumeRateLimitToken(runtime.getAdminClient()');
    expect(communications).toContain('consumeRateLimitToken(auth.admin');
    expect(twoFactor).toContain('rateLimit.unavailable');
    expect(wallet).toContain('rateLimit.unavailable');
    expect(communications).toContain('rateLimit.unavailable');
  });

  it('serializes payment webhook claims and makes settlement writes idempotent', () => {
    const sql = read(
      'src/supabase/migrations/20261117110000_payment_webhook_idempotency_and_settlement_safety.sql',
    );
    const wallet = read('supabase/functions/make-server-0b1f4071/wallet-handlers.ts');

    expect(sql).toContain('app_claim_payment_webhook_event');
    expect(sql).toContain("return 'processed'");
    expect(sql).toContain("return 'busy'");
    expect(sql).toContain('processing_started_at');
    expect(sql).toContain('attempt_count');
    expect(sql).toContain('wallet_accounts_payment_intent_id_key');
    expect(sql).toContain('escrow_accounts_payment_intent_id_key');
    expect(sql).toContain('app_upsert_wallet_subscription');
    expect(sql).toContain('on conflict (user_id)');
    expect(wallet).toContain("admin.rpc('app_claim_payment_webhook_event'");
    expect(wallet).toContain("claimed === 'processed'");
    expect(wallet).toContain("claimed !== 'claimed'");
    expect(wallet).toContain("app_complete_payment_webhook_event");
    expect(wallet).toContain("app_fail_payment_webhook_event");
    expect(wallet).toContain("admin.rpc('app_upsert_wallet_subscription'");
    expect(wallet).toContain("onConflict: 'payment_intent_id', ignoreDuplicates: true");
    expect(wallet).not.toContain(".from('payment_webhook_events')");
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
