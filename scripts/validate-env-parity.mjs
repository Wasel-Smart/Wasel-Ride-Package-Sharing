#!/usr/bin/env node
/**
 * GAP #13 FIX: Environment Parity Validation
 * Place at: scripts/validate-env-parity.mjs
 *
 * Checks that all required VITE_ variables from .env.example
 * are present in the current environment or .env file.
 * Catches configuration drift before deployment.
 */

import { readFile } from 'fs/promises';

const EXAMPLE_PATH = '.env.example';

// Variables that are intentionally different per environment
const SKIP_VALUE_CHECK = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_SENTRY_DSN',
  'VITE_GOOGLE_MAPS_API_KEY',
  'VITE_GOOGLE_CLIENT_ID',
  'VITE_FACEBOOK_APP_ID',
  'VITE_APP_URL',
]);

// Variables that MUST be set (non-optional)
const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_EDGE_FUNCTION_NAME',
  'VITE_APP_NAME',
];

function parseEnvFile(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    vars[key] = value;
  }
  return vars;
}

async function main() {
  console.log('🔍 Environment Parity Check\n');

  // Read .env.example
  let exampleContent;
  try {
    exampleContent = await readFile(EXAMPLE_PATH, 'utf8');
  } catch {
    console.error(`❌ Cannot read ${EXAMPLE_PATH}`);
    process.exit(1);
  }

  const exampleVars = parseEnvFile(exampleContent);
  const envVars = { ...process.env };

  // Try to also read .env if present
  try {
    const localEnv = await readFile('.env', 'utf8');
    Object.assign(envVars, parseEnvFile(localEnv));
  } catch { /* .env may not exist in CI */ }

  const missing = [];
  const placeholder = [];
  const ok = [];

  const PLACEHOLDER_MARKERS = [
    'your-project', 'your-anon-key', 'your-publishable', 'your-google',
    'your-facebook', 'replace_with', 'example.com', 'placeholder',
    'sk_live_...', 'pk_live_...', 're_...', 'SG....', 'AC...',
  ];

  function isPlaceholder(val) {
    if (!val) return true;
    const lower = val.toLowerCase();
    return PLACEHOLDER_MARKERS.some(m => lower.includes(m));
  }

  for (const key of Object.keys(exampleVars)) {
    if (!key.startsWith('VITE_') && !REQUIRED_VARS.includes(key)) continue;

    const val = envVars[key];
    if (!val) {
      missing.push(key);
    } else if (isPlaceholder(val) && !SKIP_VALUE_CHECK.has(key)) {
      placeholder.push(key);
    } else if (isPlaceholder(val) && REQUIRED_VARS.includes(key)) {
      placeholder.push(key);
    } else {
      ok.push(key);
    }
  }

  if (ok.length)          console.log(`✅ Configured (${ok.length}): ${ok.join(', ')}`);
  if (placeholder.length) console.log(`⚠️  Placeholder (${placeholder.length}): ${placeholder.join(', ')}`);
  if (missing.length)     console.log(`❌ Missing (${missing.length}): ${missing.join(', ')}`);

  console.log('');

  const criticalMissing = REQUIRED_VARS.filter(v => missing.includes(v) || placeholder.includes(v));
  if (criticalMissing.length > 0) {
    console.error(`❌ CRITICAL: Required variables not configured: ${criticalMissing.join(', ')}`);
    console.error('   Fix your .env file before deploying.');
    process.exit(1);
  }

  if (missing.length > 0 || placeholder.length > 0) {
    console.warn('⚠️  Some non-critical variables are missing or using placeholders.');
    console.warn('   Review and configure them for full functionality.');
    process.exit(0);
  }

  console.log('✅ All required environment variables are configured.');
  process.exit(0);
}

main().catch(err => {
  console.error('Parity check error:', err.message);
  process.exit(1);
});
