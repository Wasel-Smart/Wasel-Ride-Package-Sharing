#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates all required environment variables before deployment
 */

import { readFileSync } from 'fs';
import { exit } from 'process';

const REQUIRED_VARS = {
  // Supabase
  VITE_SUPABASE_URL: {
    required: true,
    pattern: /^https:\/\/.+\.supabase\.co$/,
    description: 'Supabase project URL',
  },
  VITE_SUPABASE_ANON_KEY: {
    required: true,
    pattern: /^eyJ/,
    description: 'Supabase publishable anon key (starts with eyJ)',
  },
  
  // Stripe
  VITE_STRIPE_PUBLISHABLE_KEY: {
    required: true,
    pattern: /^pk_live_/,
    description: 'Stripe LIVE publishable key (must start with pk_live_)',
  },
  
  // Sentry
  VITE_SENTRY_DSN: {
    required: true,
    pattern: /^https:\/\/[a-f0-9]+@[a-z0-9]+\.ingest\.sentry\.io\/\d+$/,
    description: 'Sentry DSN for error tracking',
  },
  
  // App Configuration
  VITE_APP_URL: {
    required: true,
    pattern: /^https:\/\/.+$/,
    description: 'Production app URL (must be HTTPS)',
  },
  VITE_APP_ENV: {
    required: true,
    pattern: /^production$/,
    description: 'Must be "production"',
  },
  
  // Google Maps
  VITE_GOOGLE_MAPS_API_KEY: {
    required: true,
    pattern: /^AIza/,
    description: 'Google Maps API key',
  },
  VITE_GOOGLE_CLIENT_ID: {
    required: true,
    pattern: /\.apps\.googleusercontent\.com$/,
    description: 'Google OAuth client ID',
  },
  
  // Support Contact
  VITE_SUPPORT_WHATSAPP_NUMBER: {
    required: true,
    pattern: /^962\d{9}$/,
    description: 'Jordan WhatsApp number (format: 962XXXXXXXXX)',
  },
  VITE_SUPPORT_EMAIL: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: 'Support email address',
  },
  
  // Feature Flags
  VITE_ENABLE_DEMO_DATA: {
    required: true,
    pattern: /^false$/,
    description: 'Must be "false" in production',
  },
  VITE_ENABLE_SYNTHETIC_TRIPS: {
    required: true,
    pattern: /^false$/,
    description: 'Must be "false" in production',
  },
  VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: {
    required: true,
    pattern: /^false$/,
    description: 'Must be "false" in production',
  },
  VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK: {
    required: true,
    pattern: /^false$/,
    description: 'Must be "false" in production',
  },
};

const BACKEND_REQUIRED_VARS = {
  SUPABASE_SERVICE_ROLE_KEY: {
    required: true,
    pattern: /^eyJ/,
    description: 'Supabase service role key (backend only)',
  },
  STRIPE_SECRET_KEY: {
    required: true,
    pattern: /^sk_live_/,
    description: 'Stripe LIVE secret key',
  },
  STRIPE_WEBHOOK_SECRET: {
    required: true,
    pattern: /^whsec_/,
    description: 'Stripe webhook signing secret',
  },
  RESEND_API_KEY: {
    required: true,
    pattern: /^re_/,
    description: 'Resend API key for emails',
  },
};

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateEnvironment(envVars: Record<string, string>, schema: typeof REQUIRED_VARS): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, config] of Object.entries(schema)) {
    const value = envVars[key];

    // Check if required variable exists
    if (config.required && !value) {
      errors.push(`❌ ${key} is required but not set. ${config.description}`);
      continue;
    }

    // Check pattern if value exists
    if (value && config.pattern && !config.pattern.test(value)) {
      errors.push(`❌ ${key} has invalid format. ${config.description}`);
      continue;
    }

    // Warn about test keys in production
    if (value && (value.includes('test') || value.includes('_test_'))) {
      warnings.push(`⚠️  ${key} appears to contain test credentials`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function loadEnvFile(path: string): Record<string, string> {
  try {
    const content = readFileSync(path, 'utf-8');
    const vars: Record<string, string> = {};

    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        vars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });

    return vars;
  } catch (error) {
    console.error(`Failed to load ${path}:`, error);
    return {};
  }
}

function main() {
  console.log('🔍 Validating Production Environment...\n');

  // Load .env.production if it exists
  const envVars = loadEnvFile('.env.production');
  
  // Also check process.env for CI/CD environments
  const allVars = { ...envVars, ...process.env };

  // Validate frontend variables
  console.log('📱 Frontend Variables:');
  const frontendResult = validateEnvironment(allVars, REQUIRED_VARS);
  
  if (frontendResult.errors.length > 0) {
    console.log('\nErrors:');
    frontendResult.errors.forEach(err => console.log(err));
  }
  
  if (frontendResult.warnings.length > 0) {
    console.log('\nWarnings:');
    frontendResult.warnings.forEach(warn => console.log(warn));
  }

  if (frontendResult.valid && frontendResult.warnings.length === 0) {
    console.log('✅ All frontend variables valid\n');
  }

  // Validate backend variables
  console.log('\n🔧 Backend Variables (Edge Functions):');
  const backendResult = validateEnvironment(allVars, BACKEND_REQUIRED_VARS);
  
  if (backendResult.errors.length > 0) {
    console.log('\nErrors:');
    backendResult.errors.forEach(err => console.log(err));
  }
  
  if (backendResult.warnings.length > 0) {
    console.log('\nWarnings:');
    backendResult.warnings.forEach(warn => console.log(warn));
  }

  if (backendResult.valid && backendResult.warnings.length === 0) {
    console.log('✅ All backend variables valid\n');
  }

  // Security checks
  console.log('\n🔒 Security Checks:');
  const securityIssues: string[] = [];

  if (allVars.VITE_SUPABASE_URL?.includes('localhost')) {
    securityIssues.push('❌ VITE_SUPABASE_URL points to localhost');
  }

  if (allVars.VITE_APP_URL?.startsWith('http://')) {
    securityIssues.push('❌ VITE_APP_URL must use HTTPS in production');
  }

  if (allVars.VITE_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')) {
    securityIssues.push('❌ Using Stripe TEST key in production');
  }

  if (allVars.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
    securityIssues.push('❌ Using Stripe TEST secret key in production');
  }

  if (securityIssues.length > 0) {
    console.log('\nSecurity Issues:');
    securityIssues.forEach(issue => console.log(issue));
  } else {
    console.log('✅ No security issues detected\n');
  }

  // Final verdict
  const allValid = frontendResult.valid && backendResult.valid && securityIssues.length === 0;
  const hasWarnings = frontendResult.warnings.length > 0 || backendResult.warnings.length > 0;

  console.log('\n' + '='.repeat(60));
  if (allValid && !hasWarnings) {
    console.log('✅ PRODUCTION ENVIRONMENT VALIDATION PASSED');
    console.log('='.repeat(60));
    exit(0);
  } else if (allValid && hasWarnings) {
    console.log('⚠️  PRODUCTION ENVIRONMENT VALIDATION PASSED WITH WARNINGS');
    console.log('='.repeat(60));
    console.log('\nPlease review warnings before deploying to production.');
    exit(0);
  } else {
    console.log('❌ PRODUCTION ENVIRONMENT VALIDATION FAILED');
    console.log('='.repeat(60));
    console.log('\nFix all errors before deploying to production.');
    exit(1);
  }
}

main();
