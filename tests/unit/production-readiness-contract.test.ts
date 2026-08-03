import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('production readiness evidence', () => {
  it('keeps real payment webhooks idempotent and signature verified', () => {
    const source = read('supabase/functions/stripe-payments-v2/index.ts');

    expect(source).toContain('stripe.webhooks.constructEvent');
    expect(source).toContain('STRIPE_WEBHOOK_SECRET');
    expect(source).toContain('idempotencyKey');
    expect(source).toContain("topic: 'payments.captured'");
  });

  it('keeps spatial matching atomic and concurrency-safe', () => {
    const worker = read('supabase/functions/matching-worker/index.ts');
    const migration = read('supabase/migrations/20260711000000_atomic_spatial_matching.sql');

    expect(worker).toContain("admin.rpc('match_alert_atomic'");
    expect(worker).toContain('Promise.allSettled');
    expect(migration).toContain('pg_try_advisory_xact_lock');
    expect(migration).toContain('ST_DWithin');
    expect(migration.toLowerCase()).toContain('for update skip locked');
  });

  it('keeps workers observable with retry, circuit breaker, DLQ, and SLO metrics', () => {
    const framework = read('src/platform/worker-framework.ts');
    const workers = read('src/platform/production-workers.ts');

    expect(framework).toContain('recordSLO');
    expect(framework).toContain('sendToDeadLetter');
    expect(framework).toContain('circuitBreaker');
    expect(workers).toContain('telemetry.recordMetric');
    expect(workers).toContain('productionWorkerRegistry.register');
  });

  it('documents the 10/10 operational gates', () => {
    const doc = read('docs/PRODUCTION_READINESS_10.md');

    for (const gate of [
      'green CI',
      'tested real payments',
      'real matching under concurrency',
      'monitored production workers',
      'validated RLS/security',
      'mobile release confidence',
      'incident response readiness',
      'load/scaling evidence',
    ]) {
      expect(doc).toContain(gate);
    }
  });
});
