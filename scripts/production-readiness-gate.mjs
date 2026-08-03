#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  '.github/workflows/ci.yml',
  '.github/workflows/security.yml',
  'package.json',
  'mobile/package.json',
  'supabase/functions/stripe-payments-v2/index.ts',
  'supabase/functions/matching-worker/index.ts',
  'supabase/migrations/20260711000000_atomic_spatial_matching.sql',
  'scripts/audit-rls-policies.sql',
  'tests/load/k6-smoke.js',
  'tests/load/k6-production.js',
  'docs/PRODUCTION_RUNBOOK.md',
  'docs/PRODUCTION_READINESS_10.md',
];

const contentChecks = [
  ['package.json', '@testing-library/dom'],
  ['supabase/functions/stripe-payments-v2/index.ts', 'stripe.webhooks.constructEvent'],
  ['supabase/functions/stripe-payments-v2/index.ts', 'idempotencyKey'],
  ['supabase/functions/matching-worker/index.ts', "admin.rpc('match_alert_atomic'"],
  ['supabase/migrations/20260711000000_atomic_spatial_matching.sql', 'pg_try_advisory_xact_lock'],
  ['supabase/migrations/20260711000000_atomic_spatial_matching.sql', 'for update skip locked'],
  ['src/platform/worker-framework.ts', 'sendToDeadLetter'],
  ['src/platform/worker-framework.ts', 'recordSLO'],
  ['scripts/audit-rls-policies.sql', 'VULNERABLE'],
  ['docs/PRODUCTION_READINESS_10.md', 'load/scaling evidence'],
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Missing required file: ${file}`);
}
for (const [file, needle] of contentChecks) {
  if (!existsSync(file)) {
    failures.push(`Cannot inspect missing file: ${file}`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  if (!text.toLowerCase().includes(String(needle).toLowerCase())) failures.push(`${file} does not contain required evidence: ${needle}`);
}

if (failures.length > 0) {
  console.error('Production readiness gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Production readiness gate passed. Required 10/10 evidence is present.');
