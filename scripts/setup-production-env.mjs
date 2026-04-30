#!/usr/bin/env node

/**
 * Production Environment Setup Helper
 * Guides through production environment configuration
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bright');
  console.log('='.repeat(60) + '\n');
}

async function main() {
  header('Wasel Production Environment Setup');

  log('This wizard will help you set up your production environment.', 'cyan');
  log('You will need:', 'yellow');
  log('  • Supabase project credentials');
  log('  • Stripe LIVE API keys');
  log('  • Google Maps API key');
  log('  • Sentry DSN (optional)');
  log('  • Twilio credentials (for SMS/WhatsApp)');
  log('  • Email service credentials (Resend or SendGrid)\n');

  const proceed = await question('Ready to proceed? (y/n): ');
  if (proceed.toLowerCase() !== 'y') {
    log('Setup cancelled.', 'yellow');
    rl.close();
    return;
  }

  // Check if .env.production already exists
  const envPath = join(process.cwd(), '.env.production');
  if (existsSync(envPath)) {
    log('\n⚠️  .env.production already exists!', 'yellow');
    const overwrite = await question('Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      log('Setup cancelled.', 'yellow');
      rl.close();
      return;
    }
  }

  const config = {};

  // Core Application
  header('1. Core Application');
  config.VITE_APP_ENV = 'production';
  config.VITE_APP_URL = await question('Production URL (e.g., https://wasel.jo): ');
  config.VITE_APP_NAME = 'Wasel';

  // Supabase
  header('2. Supabase Configuration');
  log('Find these in your Supabase project settings:', 'cyan');
  config.VITE_SUPABASE_URL = await question('Supabase URL: ');
  config.VITE_SUPABASE_ANON_KEY = await question('Supabase Anon Key: ');
  config.VITE_SUPABASE_PUBLISHABLE_KEY = config.VITE_SUPABASE_ANON_KEY;
  config.SUPABASE_PROJECT_SECRET_KEY = await question('Supabase Service Role Key: ');

  // Stripe
  header('3. Stripe Configuration');
  log('⚠️  Use LIVE keys (pk_live_... and sk_live_...)', 'yellow');
  config.VITE_STRIPE_PUBLISHABLE_KEY = await question('Stripe Publishable Key: ');
  config.STRIPE_SECRET_KEY = await question('Stripe Secret Key: ');

  // Google
  header('4. Google Services');
  config.VITE_GOOGLE_MAPS_API_KEY = await question('Google Maps API Key: ');
  config.VITE_GOOGLE_CLIENT_ID = await question('Google OAuth Client ID: ');

  // Sentry
  header('5. Error Monitoring (Optional)');
  const sentryDsn = await question('Sentry DSN (press Enter to skip): ');
  if (sentryDsn) {
    config.VITE_SENTRY_DSN = sentryDsn;
  }

  // Contact Info
  header('6. Contact Information');
  config.VITE_SUPPORT_EMAIL = await question('Support Email: ');
  config.VITE_SUPPORT_WHATSAPP_NUMBER = await question('WhatsApp Number (e.g., 962791234567): ');
  config.VITE_SUPPORT_PHONE_NUMBER = config.VITE_SUPPORT_WHATSAPP_NUMBER;

  // Twilio
  header('7. Twilio (SMS & WhatsApp)');
  const useTwilio = await question('Configure Twilio? (y/n): ');
  if (useTwilio.toLowerCase() === 'y') {
    config.TWILIO_ACCOUNT_SID = await question('Twilio Account SID: ');
    config.TWILIO_AUTH_TOKEN = await question('Twilio Auth Token: ');
    config.TWILIO_MESSAGING_SERVICE_SID = await question('Twilio Messaging Service SID: ');
  }

  // Email Service
  header('8. Email Service');
  const emailProvider = await question('Email provider (resend/sendgrid/skip): ');
  if (emailProvider === 'resend') {
    config.RESEND_API_KEY = await question('Resend API Key: ');
    config.RESEND_FROM_EMAIL = await question('From Email (e.g., Wasel <notifications@wasel.jo>): ');
  } else if (emailProvider === 'sendgrid') {
    config.SENDGRID_API_KEY = await question('SendGrid API Key: ');
    config.SENDGRID_FROM_EMAIL = await question('From Email: ');
  }

  // Generate secrets
  header('9. Generating Security Secrets');
  log('Generating random secrets for workers...', 'cyan');
  const crypto = await import('crypto');
  config.COMMUNICATION_WORKER_SECRET = crypto.randomBytes(32).toString('hex');
  config.AUTOMATION_WORKER_SECRET = crypto.randomBytes(32).toString('hex');
  config.COMMUNICATION_WEBHOOK_TOKEN = crypto.randomBytes(32).toString('hex');
  log('✓ Secrets generated', 'green');

  // Production safety
  config.VITE_ENABLE_SYNTHETIC_DATA = 'false';
  config.VITE_ENABLE_SYNTHETIC_TRIPS = 'false';
  config.VITE_ALLOW_DIRECT_SUPABASE_FALLBACK = 'false';
  config.VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK = 'false';
  config.VITE_ENABLE_TWO_FACTOR_AUTH = 'true';

  // Build .env.production content
  let envContent = '# Production Environment Configuration\n';
  envContent += '# Generated by setup wizard\n';
  envContent += `# Created: ${new Date().toISOString()}\n\n`;

  for (const [key, value] of Object.entries(config)) {
    envContent += `${key}=${value}\n`;
  }

  // Write file
  writeFileSync(envPath, envContent);

  header('Setup Complete!');
  log('✓ .env.production created successfully', 'green');
  log('\nNext steps:', 'cyan');
  log('1. Review .env.production and add any missing values');
  log('2. Apply KV Store migration: npm run db:migrate');
  log('3. Seed KV Store: npm run db:seed');
  log('4. Validate environment: npm run validate-production-env');
  log('5. Build production: npm run build');
  log('6. Deploy: npm run deploy\n');

  log('📖 Full guide: docs/PRODUCTION_ENVIRONMENT_SETUP.md', 'blue');

  rl.close();
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});
