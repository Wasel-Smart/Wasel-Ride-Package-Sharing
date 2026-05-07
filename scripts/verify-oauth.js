#!/usr/bin/env node

/**
 * OAuth Configuration Verification Script
 * Checks if all required OAuth environment variables are set
 */

const requiredVars = [
  'VITE_GOOGLE_CLIENT_ID',
  'SUPABASE_AUTH_GOOGLE_CLIENT_ID',
  'SUPABASE_AUTH_GOOGLE_CLIENT_SECRET',
  'VITE_FACEBOOK_APP_ID',
  'SUPABASE_AUTH_FACEBOOK_CLIENT_ID',
  'SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET',
];

const placeholders = [
  'your-google-client-id',
  'your-google-client-secret',
  'your-facebook-app-id',
  'your-facebook-app-secret',
  'placeholder',
];

console.log('🔍 Verifying OAuth Configuration...\n');

let hasErrors = false;
let hasWarnings = false;

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  
  if (!value) {
    console.log(`❌ ${varName}: NOT SET`);
    hasErrors = true;
  } else if (placeholders.some(p => value.includes(p))) {
    console.log(`⚠️  ${varName}: PLACEHOLDER VALUE (needs real credentials)`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${varName}: SET`);
  }
});

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.log('\n❌ FAILED: Missing required OAuth environment variables');
  console.log('Please add them to your .env file\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  WARNING: Placeholder values detected');
  console.log('Replace with real credentials from Google Cloud Console and Facebook Developers\n');
  process.exit(0);
} else {
  console.log('\n✅ SUCCESS: All OAuth variables are configured!\n');
  process.exit(0);
}
