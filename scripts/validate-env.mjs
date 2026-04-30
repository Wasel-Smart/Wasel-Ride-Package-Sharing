#!/usr/bin/env node

/**
 * Production Environment Validator
 * Validates all environment variables for production deployment
 */

const REQUIRED_PROD_VARS = [
  'VITE_APP_ENV',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_PRODUCTION_APP_URL',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_SUPPORT_EMAIL',
  'VITE_SUPPORT_WHATSAPP_NUMBER',
];

const SECURITY_CHECKS = [
  { key: 'VITE_ENABLE_SYNTHETIC_DATA', expected: 'false' },
  { key: 'VITE_ENABLE_SYNTHETIC_TRIPS', expected: 'false' },
  { key: 'VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK', expected: 'false' },
];

function validateProductionEnv() {
  console.log('🔍 Validating production environment...\n');
  
  let hasErrors = false;
  
  // Check required variables
  console.log('📋 Required Variables:');
  for (const varName of REQUIRED_PROD_VARS) {
    const value = process.env[varName];
    if (!value || value.includes('your-') || value.includes('example.com')) {
      console.log(`❌ ${varName}: Missing or contains placeholder`);
      hasErrors = true;
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  }
  
  // Security checks
  console.log('\n🔒 Security Checks:');
  for (const { key, expected } of SECURITY_CHECKS) {
    const value = process.env[key];
    if (value !== expected) {
      console.log(`❌ ${key}: Should be "${expected}", got "${value}"`);
      hasErrors = true;
    } else {
      console.log(`✅ ${key}: Secure`);
    }
  }
  
  // URL validation
  console.log('\n🌐 URL Validation:');
  const appUrl = process.env.VITE_PRODUCTION_APP_URL;
  if (appUrl && !appUrl.startsWith('https://')) {
    console.log('❌ VITE_PRODUCTION_APP_URL: Must use HTTPS in production');
    hasErrors = true;
  } else if (appUrl) {
    console.log('✅ VITE_PRODUCTION_APP_URL: Uses HTTPS');
  }
  
  if (hasErrors) {
    console.log('\n❌ Environment validation failed. Fix the issues above before deploying.');
    process.exit(1);
  } else {
    console.log('\n✅ Environment validation passed. Ready for production!');
  }
}

validateProductionEnv();
