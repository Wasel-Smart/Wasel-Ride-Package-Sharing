#!/usr/bin/env node
/**
 * scripts/check-observability-config.mjs
 *
 * Verifies that production observability env vars are real values, not
 * placeholders. Runs in CI against Vercel secrets to catch the M-01 finding
 * (Sentry DSN / AppInsights connection string silently skipped in production).
 *
 * Exit 0 = configured. Exit 1 = missing or placeholder (blocks deploy).
 *
 * Usage:
 *   node scripts/check-observability-config.mjs
 *   node scripts/check-observability-config.mjs --warn-only   (exit 0 but print warnings)
 */

const WARN_ONLY = process.argv.includes('--warn-only');

const PLACEHOLDER_PATTERNS = [
  /paste_your/i,
  /set_real/i,
  /<set_real/i,
  /your_dsn/i,
  /your_key/i,
  /your_connection/i,
  /example\.com/i,
  /placeholder/i,
  /todo/i,
  /^$/,
];

function isPlaceholder(value) {
  if (!value || !value.trim()) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value.trim()));
}

function isValidSentryDsn(dsn) {
  if (isPlaceholder(dsn)) return false;
  // Sentry DSNs look like https://<key>@<org>.ingest.sentry.io/<project>
  return /^https:\/\/[a-f0-9]+@[a-z0-9-]+\.ingest(\.[a-z]+)?\.sentry\.io\/\d+$/.test(dsn.trim());
}

function isValidAppInsightsConnectionString(cs) {
  if (isPlaceholder(cs)) return false;
  const lower = cs.toLowerCase();
  return (
    lower.includes('instrumentationkey=') &&
    /[a-z0-9-]+\.in\.applicationinsights\.azure\.com/i.test(cs)
  );
}

const errors = [];
const warnings = [];

// ── Sentry ────────────────────────────────────────────────────────────────────
const sentryDsn = process.env.VITE_SENTRY_DSN;
if (!sentryDsn || isPlaceholder(sentryDsn)) {
  errors.push(
    'VITE_SENTRY_DSN is not set or is a placeholder.\n' +
    '  → Set it in Vercel Dashboard → Settings → Environment Variables → Production\n' +
    '  → Get the DSN from: sentry.io → Your project → Settings → Client Keys (DSN)\n' +
    '  → Redeploy after setting (Vite inlines VITE_* at build time)',
  );
} else if (!isValidSentryDsn(sentryDsn)) {
  warnings.push(
    `VITE_SENTRY_DSN is set but does not match the expected Sentry DSN format.\n` +
    `  Value: ${sentryDsn.slice(0, 40)}...\n` +
    `  Expected: https://<key>@<org>.ingest.sentry.io/<project>`,
  );
} else {
  console.log('✓ VITE_SENTRY_DSN is configured');
}

// ── App Insights ──────────────────────────────────────────────────────────────
const appInsightsCs = process.env.VITE_APP_INSIGHTS_CONNECTION_STRING;
if (!appInsightsCs || isPlaceholder(appInsightsCs)) {
  errors.push(
    'VITE_APP_INSIGHTS_CONNECTION_STRING is not set or is a placeholder.\n' +
    '  → Set it in Vercel Dashboard → Settings → Environment Variables → Production\n' +
    '  → Get it from: Azure Portal → Application Insights → Overview → Connection String\n' +
    '  → Redeploy after setting (Vite inlines VITE_* at build time)',
  );
} else if (!isValidAppInsightsConnectionString(appInsightsCs)) {
  warnings.push(
    `VITE_APP_INSIGHTS_CONNECTION_STRING is set but does not look valid.\n` +
    `  Expected: InstrumentationKey=<guid>;IngestionEndpoint=https://<region>.in.applicationinsights.azure.com/`,
  );
} else {
  console.log('✓ VITE_APP_INSIGHTS_CONNECTION_STRING is configured');
}

// ── Twilio webhook signing ────────────────────────────────────────────────────
// H-02: Twilio webhook must use HMAC signature, not query-string token.
// The code already enforces this, but we verify the signing secret is present.
const twilioSigningSecret = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_WEBHOOK_SIGNING_SECRET;
if (!twilioSigningSecret || isPlaceholder(twilioSigningSecret)) {
  errors.push(
    'TWILIO_AUTH_TOKEN (or TWILIO_WEBHOOK_SIGNING_SECRET) is not set.\n' +
    '  → The Twilio webhook handler requires HMAC signature verification.\n' +
    '  → Set TWILIO_AUTH_TOKEN in Supabase Edge Function secrets.\n' +
    '  → Get it from: console.twilio.com → Account → Auth Token',
  );
} else {
  console.log('✓ Twilio webhook signing secret is configured');
}

// ── Summary ───────────────────────────────────────────────────────────────────
if (warnings.length) {
  console.warn('\n⚠️  Observability warnings:');
  warnings.forEach((w) => console.warn(`  ${w}`));
}

if (errors.length) {
  console.error('\n❌ Observability configuration errors:');
  errors.forEach((e) => console.error(`  ${e}\n`));

  if (WARN_ONLY) {
    console.warn('\n⚠️  --warn-only: exiting 0 despite errors (not blocking CI)');
    process.exit(0);
  }

  console.error(
    '\nProduction observability is broken. Runtime errors and Web Vitals will be\n' +
    'silently dropped. Fix the above before deploying to production.\n',
  );
  process.exit(1);
}

if (!errors.length && !warnings.length) {
  console.log('\n✅ All observability checks passed.');
}
