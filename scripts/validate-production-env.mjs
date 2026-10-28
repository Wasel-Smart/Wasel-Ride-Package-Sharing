#!/usr/bin/env node

/**
 * Fail-closed production environment validation.
 *
 * Validate public Vite settings separately from server-side secrets. Never print
 * secret values. Optional integrations are validated when configured; production
 * owners can make an integration mandatory with WASEL_REQUIRE_* flags.
 */

import { readFileSync } from 'node:fs';

const PLACEHOLDER = /^(?:|change[-_ ]?me|replace[-_ ].*|your[-_ ].*|xxx+|<.*>|$\{.*\})$/i;
const TRUE = 'true';
const FALSE = 'false';

const requiredPublic = {
  VITE_SUPABASE_URL: {
    pattern: /^https:\/\/[a-z0-9-]+\.supabase\.co$/i,
    description: 'HTTPS Supabase project URL',
  },
  VITE_APP_URL: {
    pattern: /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i,
    description: 'HTTPS production app URL',
  },
  VITE_APP_ENV: { exact: 'production', description: 'must equal production' },
  VITE_ENABLE_SYNTHETIC_DATA: { exact: FALSE, description: 'must be false in production' },
  VITE_ENABLE_SYNTHETIC_TRIPS: { exact: FALSE, description: 'must be false in production' },
  VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: { exact: FALSE, description: 'must be false in production' },
  VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK: { exact: FALSE, description: 'must be false in production' },
};

const optionalPublic = {
  VITE_SUPABASE_ANON_KEY: {
    pattern: /^(?:eyJ[A-Za-z0-9._-]+|sb_publishable_[A-Za-z0-9_-]+)$/,
    description: 'Supabase anon/publishable key',
  },
  VITE_SUPABASE_PUBLISHABLE_KEY: {
    pattern: /^(?:eyJ[A-Za-z0-9._-]+|sb_publishable_[A-Za-z0-9_-]+)$/,
    description: 'Supabase publishable key',
  },
  VITE_STRIPE_PUBLISHABLE_KEY: {
    pattern: /^pk_live_[A-Za-z0-9]+$/,
    description: 'Stripe live publishable key',
    requiredWhen: 'WASEL_REQUIRE_STRIPE',
  },
  VITE_SENTRY_DSN: {
    pattern: /^https:\/\/[a-f0-9]+@[a-z0-9.-]+\.ingest\.sentry\.io\/\d+$/i,
    description: 'Sentry DSN',
  },
  VITE_GOOGLE_MAPS_API_KEY: {
    pattern: /^AIza[A-Za-z0-9_-]{20,}$/,
    description: 'Google Maps browser API key',
    requiredWhen: 'WASEL_REQUIRE_GOOGLE_MAPS',
  },
  VITE_GOOGLE_CLIENT_ID: {
    pattern: /^[A-Za-z0-9-]+\.apps\.googleusercontent\.com$/,
    description: 'Google OAuth client ID',
    requiredWhen: 'WASEL_REQUIRE_GOOGLE_OAUTH',
  },
  VITE_SUPPORT_EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: 'support email address',
  },
  VITE_SUPPORT_WHATSAPP_NUMBER: {
    pattern: /^\+?\d{8,15}$/,
    description: 'support WhatsApp number in international format',
  },
};

const serverSecrets = {
  SUPABASE_SERVICE_ROLE_KEY: {
    pattern: /^(?:eyJ[A-Za-z0-9._-]+|sb_secret_[A-Za-z0-9_-]+)$/,
    description: 'Supabase server-only service-role/secret key',
    requiredWhen: 'WASEL_REQUIRE_SUPABASE_SERVICE_ROLE',
  },
  STRIPE_SECRET_KEY: {
    pattern: /^sk_live_[A-Za-z0-9]+$/,
    description: 'Stripe live secret key',
    requiredWhen: 'WASEL_REQUIRE_STRIPE',
  },
  STRIPE_WEBHOOK_SECRET: {
    pattern: /^whsec_[A-Za-z0-9]+$/,
    description: 'Stripe webhook signing secret',
    requiredWhen: 'WASEL_REQUIRE_STRIPE',
  },
  RESEND_API_KEY: {
    pattern: /^re_[A-Za-z0-9_-]+$/,
    description: 'Resend API key',
    requiredWhen: 'WASEL_REQUIRE_RESEND',
  },
};

const issues = [];
const warnings = [];

function loadEnvFile(path) {
  let source;
  try {
    source = readFileSync(path, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') issues.push(`Unable to read ${path}.`);
    return {};
  }

  const vars = {};
  const seen = new Set();
  for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      issues.push(`.env.production line ${index + 1} is not a valid KEY=VALUE assignment.`);
      continue;
    }
    const [, key] = match;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    if (seen.has(key)) issues.push(`.env.production contains duplicate key ${key}.`);
    seen.add(key);
    vars[key] = value;
  }
  return vars;
}

function isPlaceholder(value) {
  return PLACEHOLDER.test(String(value ?? '').trim()) ||
    /^(?:your[-_ ]|replace[-_ ]|example\.|changeme|placeholder)/i.test(String(value ?? '').trim());
}

function checkSchema(env, schema, { required = false, label }) {
  for (const [key, rule] of Object.entries(schema)) {
    const value = env[key];
    const mustExist = required || (rule.requiredWhen && env[rule.requiredWhen] === TRUE);
    if (value == null || value === '') {
      if (mustExist) issues.push(`${key} is required (${rule.description}).`);
      continue;
    }
    if (isPlaceholder(value)) {
      issues.push(`${key} still contains a placeholder value.`);
      continue;
    }
    if (rule.exact && value !== rule.exact) {
      issues.push(`${key} ${rule.description}.`);
      continue;
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      issues.push(`${key} has an invalid format (${rule.description}).`);
      continue;
    }
    if (key.includes('STRIPE') && /(?:pk|sk)_(?:test)_/i.test(value)) {
      issues.push(`${key} uses a Stripe test credential in production.`);
    }
  }
}

function main() {
  const fileVars = loadEnvFile('.env.production');
  // Real process environment intentionally takes precedence over file values.
  const env = { ...fileVars, ...process.env };

  if (env.APP_ENV && env.APP_ENV !== 'production') {
    issues.push('APP_ENV must be production when set.');
  }
  if (env.NODE_ENV && env.NODE_ENV !== 'production') {
    issues.push('NODE_ENV must be production when set.');
  }

  checkSchema(env, requiredPublic, { required: true, label: 'required public configuration' });
  if (![env.VITE_SUPABASE_ANON_KEY, env.VITE_SUPABASE_PUBLISHABLE_KEY].some(value => value && !isPlaceholder(value))) {
    issues.push('Set a valid VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
  checkSchema(env, optionalPublic, { required: false, label: 'optional public integrations' });
  checkSchema(env, serverSecrets, { required: false, label: 'server-only secrets' });

  // These requirement switches are themselves explicit security contracts.
  for (const key of [
    'WASEL_REQUIRE_STRIPE',
    'WASEL_REQUIRE_RESEND',
    'WASEL_REQUIRE_GOOGLE_MAPS',
    'WASEL_REQUIRE_GOOGLE_OAUTH',
    'WASEL_REQUIRE_SUPABASE_SERVICE_ROLE',
  ]) {
    if (env[key] != null && env[key] !== TRUE && env[key] !== FALSE) {
      issues.push(`${key} must be exactly true or false.`);
    }
  }

  // Public Vite-prefixed values are embedded in client bundles. Block common
  // server-secret names if someone accidentally assigns them a VITE_ prefix.
  for (const key of Object.keys(env)) {
    if (/^VITE_.*(?:SERVICE_ROLE|SECRET_KEY|WEBHOOK_SECRET|PRIVATE_KEY|ACCESS_TOKEN|AUTH_TOKEN)/i.test(key)) {
      issues.push(`${key} appears to expose a server secret through the client bundle; remove the VITE_ prefix and keep it server-side.`);
    }
  }

  if (issues.length) {
    console.error('\nPRODUCTION ENVIRONMENT VALIDATION FAILED');
    for (const issue of issues) console.error(`- ${issue}`);
    if (warnings.length) for (const warning of warnings) console.error(`- Warning: ${warning}`);
    console.error('\nFix every reported issue before deploying. Secret values are never printed.\n');
    process.exitCode = 1;
    return;
  }

  console.log('Production environment validation passed.');
  console.log('Required core settings are valid; optional integrations are checked when configured.');
  console.log('Confirm WASEL_REQUIRE_* flags match every integration enabled for the release.');
}

main();
