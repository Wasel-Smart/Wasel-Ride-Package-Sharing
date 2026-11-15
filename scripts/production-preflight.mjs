#!/usr/bin/env node
/**
 * scripts/production-preflight.mjs
 *
 * Pre-deployment production readiness gate.
 * Runs all checks that must pass before any production deployment.
 * Exit 0 = ready. Exit 1 = blocked.
 *
 * Usage:
 *   node scripts/production-preflight.mjs
 *   node scripts/production-preflight.mjs --strict   (fails on warnings too)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');

const errors = [];
const warnings = [];
const passed = [];

function fail(msg) { errors.push(`  ✗ ${msg}`); }
function warn(msg) { warnings.push(`  ⚠ ${msg}`); }
function pass(msg) { passed.push(`  ✓ ${msg}`); }

function readJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function readFile(path) {
  try { return readFileSync(path, 'utf8'); } catch { return null; }
}

// ─── 1. Coverage gate ─────────────────────────────────────────────────────────
console.log('\n[1/8] Coverage thresholds');
const summary = readJSON(resolve(ROOT, 'coverage/coverage-summary.json'));
if (!summary) {
  warn('coverage/coverage-summary.json not found — run npm run verify:coverage first');
} else {
  const t = summary.total;
  const checks = [
    ['branches', t.branches?.pct, 75],
    ['functions', t.functions?.pct, 80],
    ['lines', t.lines?.pct, 85],
  ];
  for (const [name, pct, threshold] of checks) {
    if (pct == null) { warn(`Coverage ${name} missing`); continue; }
    if (pct < threshold) {
      fail(`Coverage ${name} ${pct.toFixed(1)}% < ${threshold}% required`);
    } else {
      pass(`Coverage ${name} ${pct.toFixed(1)}% ≥ ${threshold}%`);
    }
  }
}

// ─── 2. Required env vars ─────────────────────────────────────────────────────
console.log('\n[2/8] Required environment variables');
const REQUIRED_PROD_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_EDGE_FUNCTION_NAME',
  'VITE_APP_URL',
  'VITE_SENTRY_DSN',
  'VITE_STRIPE_PUBLISHABLE_KEY',
];
const PLACEHOLDER_PATTERNS = [
  /PASTE_YOUR/i, /YOUR_KEY/i, /YOUR_DSN/i, /YOUR_SECRET/i,
  /placeholder/i, /example\.com/i, /SET_REAL/i, /TODO/i,
];

// Read from .env.production if present (gitignored, local only)
const envProd = readFile(resolve(ROOT, '.env.production')) ?? '';
const envLocal = readFile(resolve(ROOT, '.env.local')) ?? '';
const envCombined = envProd + '\n' + envLocal;

function getEnvValue(key) {
  const match = envCombined.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : process.env[key] ?? null;
}

for (const key of REQUIRED_PROD_VARS) {
  const val = getEnvValue(key);
  if (!val) {
    warn(`${key} is not set — must be configured in Vercel before deploy`);
  } else if (PLACEHOLDER_PATTERNS.some(p => p.test(val))) {
    fail(`${key} contains a placeholder value — replace with real credentials`);
  } else {
    pass(`${key} is set`);
  }
}

// ─── 3. Security flags ────────────────────────────────────────────────────────
console.log('\n[3/8] Production security flags');
const dangerousFlags = [
  ['VITE_ALLOW_DIRECT_SUPABASE_FALLBACK', 'false'],
  ['VITE_ENABLE_DEMO_DATA', 'false'],
  ['VITE_ENABLE_SYNTHETIC_TRIPS', 'false'],
  ['ALLOW_LOCAL_ORIGINS', 'false'],
  ['ENABLE_RUNTIME_ADMIN_ENDPOINTS', 'false'],
];
for (const [key, expected] of dangerousFlags) {
  const val = getEnvValue(key);
  if (val && val !== expected) {
    fail(`${key}=${val} — must be ${expected} in production`);
  } else {
    pass(`${key} is safe (${val ?? 'unset = default safe'})`);
  }
}

// ─── 4. Secrets not in VITE_ vars ────────────────────────────────────────────
console.log('\n[4/8] Server secrets not exposed in VITE_ vars');
const SERVER_ONLY_PATTERNS = [
  /sk_live_/i, /sk_test_/i, /whsec_/i, /re_live_/i,
  /SG\.[A-Za-z0-9_-]{20}/,
  /AC[a-f0-9]{32}/i,
  /supabase_service_role/i,
];
const viteLines = envCombined.split('\n').filter(l => l.startsWith('VITE_'));
let secretsInVite = false;
for (const line of viteLines) {
  for (const pattern of SERVER_ONLY_PATTERNS) {
    if (pattern.test(line)) {
      fail(`Server secret detected in VITE_ variable: ${line.split('=')[0]}`);
      secretsInVite = true;
    }
  }
}
if (!secretsInVite) pass('No server secrets found in VITE_ variables');

// ─── 5. Edge function wiring ──────────────────────────────────────────────────
console.log('\n[5/8] Edge function configuration');
const configToml = readFile(resolve(ROOT, 'supabase/config.toml')) ?? '';
if (configToml.includes('[functions.make-server-0b1f4071]') && configToml.includes('verify_jwt = false')) {
  pass('make-server-0b1f4071 has verify_jwt = false (health + webhook routes work)');
} else {
  fail('supabase/config.toml: make-server-0b1f4071 must have verify_jwt = false');
}
if (configToml.includes('[functions.webhooks]') && configToml.includes('verify_jwt = false')) {
  pass('webhooks function has verify_jwt = false');
} else {
  warn('webhooks function not found or missing verify_jwt = false in config.toml');
}

// ─── 6. Canonical URL consistency ────────────────────────────────────────────
console.log('\n[6/8] Canonical URL consistency');
const appUrl = getEnvValue('VITE_APP_URL') ?? '';
const appBaseUrl = getEnvValue('APP_BASE_URL') ?? '';
if (appUrl && appBaseUrl && appUrl !== appBaseUrl) {
  warn(`VITE_APP_URL (${appUrl}) ≠ APP_BASE_URL (${appBaseUrl}) — pick one canonical host`);
} else if (appUrl) {
  pass(`Canonical URL: ${appUrl}`);
}
if (appUrl && !appUrl.startsWith('https://')) {
  fail(`VITE_APP_URL must use HTTPS in production: ${appUrl}`);
}

// ─── 7. Security checklist items ─────────────────────────────────────────────
console.log('\n[7/8] Security checklist');
const checklist = readFile(resolve(ROOT, 'SECURITY_CHECKLIST.md')) ?? '';
const openItems = (checklist.match(/❌/g) ?? []).length;
const warnItems = (checklist.match(/⚠️/g) ?? []).length;
if (openItems > 0) {
  fail(`${openItems} credential rotation item(s) still marked ❌ in SECURITY_CHECKLIST.md`);
} else {
  pass('All ❌ items in SECURITY_CHECKLIST.md resolved');
}
if (warnItems > 0) {
  warn(`${warnItems} item(s) marked ⚠️ in SECURITY_CHECKLIST.md — verify before go-live`);
}

// ─── 8. Git hygiene ───────────────────────────────────────────────────────────
console.log('\n[8/8] Git hygiene');
const gitignore = readFile(resolve(ROOT, '.gitignore')) ?? '';
const mustBeIgnored = ['.env', '.env.local', '.env.production', '.env.production.local'];
for (const f of mustBeIgnored) {
  if (gitignore.includes(f)) {
    pass(`${f} is in .gitignore`);
  } else {
    fail(`${f} is NOT in .gitignore — secrets may be committed`);
  }
}

// ─── 9. CliQ configuration ────────────────────────────────────────────────────
console.log('\n[9/9] CliQ payment configuration');
const cliqAmountUnit = getEnvValue('CLIQ_WEBHOOK_AMOUNT_UNIT');
if (!cliqAmountUnit) {
  warn('CLIQ_WEBHOOK_AMOUNT_UNIT is not set — CliQ webhook amount conversion will fail closed.');
} else if (cliqAmountUnit === 'jod' || cliqAmountUnit === 'fils') {
  pass(`CLIQ_WEBHOOK_AMOUNT_UNIT=${cliqAmountUnit} is set.`);
} else {
  fail(`CLIQ_WEBHOOK_AMOUNT_UNIT="${cliqAmountUnit}" must be "jod" or "fils".`);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log('PRODUCTION PRE-FLIGHT SUMMARY');
console.log('─'.repeat(60));

if (passed.length) {
  console.log(`\n✅ Passed (${passed.length}):`);
  passed.forEach(m => console.log(m));
}
if (warnings.length) {
  console.log(`\n⚠️  Warnings (${warnings.length}):`);
  warnings.forEach(m => console.log(m));
}
if (errors.length) {
  console.log(`\n❌ Errors (${errors.length}):`);
  errors.forEach(m => console.log(m));
}

console.log('\n' + '─'.repeat(60));

const blocked = errors.length > 0 || (STRICT && warnings.length > 0);
if (blocked) {
  console.log(`\n🚫 DEPLOYMENT BLOCKED — resolve the issues above before deploying to production.\n`);
  process.exit(1);
} else if (warnings.length > 0) {
  console.log(`\n⚠️  DEPLOYMENT ALLOWED WITH WARNINGS — review warnings before go-live.\n`);
} else {
  console.log(`\n🚀 ALL CHECKS PASSED — ready for production deployment.\n`);
}
