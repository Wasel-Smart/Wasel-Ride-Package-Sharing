/**
 * Environment variable validator for Wasel.
 *
 * Checks that all required secrets are present before the app boots or
 * before Supabase edge functions start. Run this in CI and locally.
 */

type EnvCheck = {
  name: string;
  required: boolean;
  present: () => boolean;
};

const checks: EnvCheck[] = [];

function register(name: string, envKey: string, required = true): void {
  checks.push({
    name,
    required,
    present: () =>
      typeof process !== 'undefined' && Boolean(process.env[envKey]),
  });
}

// Core app
register('Supabase URL', 'VITE_SUPABASE_URL');
register('Supabase anon key', 'VITE_SUPABASE_ANON_KEY');

// Payments
register('Stripe secret key', 'STRIPE_SECRET_KEY', false);
register('Stripe webhook secret', 'STRIPE_WEBHOOK_SECRET', false);
register('Stripe API version', 'STRIPE_API_VERSION', false);

// CliQ
register('CliQ API base URL', 'CLIQ_API_BASE_URL', false);
register('CliQ merchant ID', 'CLIQ_MERCHANT_ID', false);
register('CliQ API key', 'CLIQ_API_KEY', false);
register('CliQ webhook secret', 'CLIQ_WEBHOOK_SECRET', false);

// Communications
register('Twilio account SID', 'TWILIO_ACCOUNT_SID', false);
register('Twilio auth token', 'TWILIO_AUTH_TOKEN', false);
register('Twilio sender ID', 'TWILIO_SENDER_ID', false);

// Observability
register('Sentry DSN', 'VITE_SENTRY_DSN', false);

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const check of checks) {
    if (!check.present()) {
      if (check.required) {
        missing.push(check.name);
      } else {
        warnings.push(check.name);
      }
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    for (const name of missing) {
      console.error(`   - ${name}`);
    }
    console.error('\nSet these variables and try again.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Optional environment variables not set:');
    for (const name of warnings) {
      console.warn(`   - ${name}`);
    }
    console.warn('\nSome features may be disabled.\n');
  }

  if (missing.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables are set.');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateEnv();
}
