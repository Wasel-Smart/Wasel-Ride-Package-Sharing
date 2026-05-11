#!/usr/bin/env node
/**
 * Vercel-specific environment validation
 * Warns about missing variables but doesn't fail the build
 */

const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const RECOMMENDED_VARS = [
  'VITE_APP_URL',
  'VITE_APP_NAME',
  'VITE_GOOGLE_MAPS_API_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
];

console.log('🔍 Checking Vercel environment variables...\n');

const missing = [];
const missingRecommended = [];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    missing.push(key);
  }
}

for (const key of RECOMMENDED_VARS) {
  if (!process.env[key]) {
    missingRecommended.push(key);
  }
}

if (missing.length > 0) {
  console.warn('⚠️  Missing required environment variables:');
  missing.forEach(key => console.warn(`   - ${key}`));
  console.warn('\n⚠️  Build will continue but app may not work correctly');
  console.warn('   Add these in: Vercel Dashboard → Settings → Environment Variables\n');
}

if (missingRecommended.length > 0) {
  console.warn('ℹ️  Missing recommended environment variables:');
  missingRecommended.forEach(key => console.warn(`   - ${key}`));
  console.warn('');
}

if (missing.length === 0 && missingRecommended.length === 0) {
  console.log('✅ All environment variables configured\n');
} else if (missing.length === 0) {
  console.log('✅ Required environment variables configured\n');
}
