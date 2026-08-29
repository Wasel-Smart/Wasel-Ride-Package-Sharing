#!/usr/bin/env node
/**
 * Generate ALL Vercel Environment Variables
 * This script creates a complete list of all VITE_* variables with default values
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

console.log('🔧 Generating ALL Vercel Environment Variables...\n');

const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

// Read existing .env if it exists
let existingVars = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    
    const normalizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separatorIndex = normalizedLine.indexOf('=');
    if (separatorIndex <= 0) continue;
    
    const key = normalizedLine.slice(0, separatorIndex).trim();
    let value = normalizedLine.slice(separatorIndex + 1).trim();
    
    const hasMatchingQuotes =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    
    if (hasMatchingQuotes) {
      value = value.slice(1, -1);
    }
    
    existingVars[key] = value;
  }
}

// All VITE_* environment variables with defaults
const allViteVars = {
  // CRITICAL - Required for build
  'VITE_SUPABASE_URL': existingVars['VITE_SUPABASE_URL'] || 'https://your-project.supabase.co',
  'VITE_SUPABASE_ANON_KEY': existingVars['VITE_SUPABASE_ANON_KEY'] || 'your-anon-key',
  'VITE_SUPABASE_PUBLISHABLE_KEY': existingVars['VITE_SUPABASE_PUBLISHABLE_KEY'] || existingVars['VITE_SUPABASE_ANON_KEY'] || 'your-publishable-key-or-anon-key',
  
  // App Configuration
  'VITE_APP_URL': existingVars['VITE_APP_URL'] || 'https://your-app.vercel.app',
  'VITE_APP_NAME': existingVars['VITE_APP_NAME'] || 'Wasel',
  
  // Edge Functions
  'VITE_EDGE_FUNCTION_NAME': existingVars['VITE_EDGE_FUNCTION_NAME'] || 'make-server-0b1f4071',
  'VITE_EDGE_FUNCTIONS_BASE_URL': existingVars['VITE_EDGE_FUNCTIONS_BASE_URL'] || '',
  'VITE_API_URL': existingVars['VITE_API_URL'] || '',
  
  // Maps
  'VITE_GOOGLE_MAPS_API_KEY': existingVars['VITE_GOOGLE_MAPS_API_KEY'] || 'your-google-maps-api-key',
  
  // OAuth
  'VITE_GOOGLE_CLIENT_ID': existingVars['VITE_GOOGLE_CLIENT_ID'] || 'your-google-client-id.apps.googleusercontent.com',
  'VITE_FACEBOOK_APP_ID': existingVars['VITE_FACEBOOK_APP_ID'] || 'your-facebook-app-id',
  'VITE_AUTH_CALLBACK_PATH': existingVars['VITE_AUTH_CALLBACK_PATH'] || '/app/auth/callback',
  
  // Support Contact
  'VITE_SUPPORT_WHATSAPP_NUMBER': existingVars['VITE_SUPPORT_WHATSAPP_NUMBER'] || '962790000000',
  'VITE_SUPPORT_EMAIL': existingVars['VITE_SUPPORT_EMAIL'] || 'support@wasel.jo',
  'VITE_SUPPORT_PHONE_NUMBER': existingVars['VITE_SUPPORT_PHONE_NUMBER'] || '962790000000',
  'VITE_SUPPORT_SMS_NUMBER': existingVars['VITE_SUPPORT_SMS_NUMBER'] || '962790000000',
  
  // Feature Flags
  'VITE_ENABLE_TWO_FACTOR_AUTH': existingVars['VITE_ENABLE_TWO_FACTOR_AUTH'] || 'false',
  'VITE_ENABLE_EMAIL_NOTIFICATIONS': existingVars['VITE_ENABLE_EMAIL_NOTIFICATIONS'] || 'true',
  'VITE_ENABLE_SMS_NOTIFICATIONS': existingVars['VITE_ENABLE_SMS_NOTIFICATIONS'] || 'true',
  'VITE_ENABLE_WHATSAPP_NOTIFICATIONS': existingVars['VITE_ENABLE_WHATSAPP_NOTIFICATIONS'] || 'true',
  'VITE_ENABLE_DEMO_DATA': existingVars['VITE_ENABLE_DEMO_DATA'] || 'false',
  'VITE_ENABLE_SYNTHETIC_TRIPS': existingVars['VITE_ENABLE_SYNTHETIC_TRIPS'] || 'false',
  'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK': existingVars['VITE_ALLOW_DIRECT_SUPABASE_FALLBACK'] || 'false',
  
  // Payments
  'VITE_STRIPE_PUBLISHABLE_KEY': existingVars['VITE_STRIPE_PUBLISHABLE_KEY'] || 'pk_live_...',
  
  // Monitoring & Analytics
  'VITE_SENTRY_DSN': existingVars['VITE_SENTRY_DSN'] || 'https://your-dsn@sentry.io/project-id',
  'VITE_ANALYTICS_ENDPOINT': existingVars['VITE_ANALYTICS_ENDPOINT'] || 'https://analytics.wasel14.online/api/v1',
  'VITE_CDN_URL': existingVars['VITE_CDN_URL'] || 'https://cdn.wasel14.online',
};

// Categorize variables
const categories = {
  critical: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
  recommended: ['VITE_APP_URL', 'VITE_APP_NAME', 'VITE_GOOGLE_MAPS_API_KEY', 'VITE_STRIPE_PUBLISHABLE_KEY'],
  oauth: ['VITE_GOOGLE_CLIENT_ID', 'VITE_FACEBOOK_APP_ID', 'VITE_AUTH_CALLBACK_PATH'],
  support: ['VITE_SUPPORT_EMAIL', 'VITE_SUPPORT_PHONE_NUMBER', 'VITE_SUPPORT_WHATSAPP_NUMBER', 'VITE_SUPPORT_SMS_NUMBER'],
  features: ['VITE_ENABLE_TWO_FACTOR_AUTH', 'VITE_ENABLE_EMAIL_NOTIFICATIONS', 'VITE_ENABLE_SMS_NOTIFICATIONS', 'VITE_ENABLE_WHATSAPP_NOTIFICATIONS', 'VITE_ENABLE_DEMO_DATA', 'VITE_ENABLE_SYNTHETIC_TRIPS', 'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK'],
  monitoring: ['VITE_SENTRY_DSN', 'VITE_ANALYTICS_ENDPOINT', 'VITE_CDN_URL'],
  edge: ['VITE_EDGE_FUNCTION_NAME', 'VITE_EDGE_FUNCTIONS_BASE_URL', 'VITE_API_URL'],
  other: ['VITE_SUPABASE_PUBLISHABLE_KEY'],
};

console.log('=' .repeat(80));
console.log('COPY ALL VARIABLES BELOW TO VERCEL DASHBOARD');
console.log('=' .repeat(80));
console.log('\n📋 ALL ENVIRONMENT VARIABLES:\n');

// Print all variables
for (const [key, value] of Object.entries(allViteVars)) {
  if (value) {
    console.log(`${key}=${value}`);
  }
}

console.log('\n' + '=' .repeat(80));
console.log(`✅ Total: ${Object.keys(allViteVars).length} variables`);
console.log('=' .repeat(80));

// Print categorized view
console.log('\n\n📊 CATEGORIZED VIEW:\n');

console.log('🔴 CRITICAL (Required for build):');
categories.critical.forEach(key => {
  console.log(`   ${key}=${allViteVars[key]}`);
});

console.log('\n🟡 RECOMMENDED (Highly recommended):');
categories.recommended.forEach(key => {
  console.log(`   ${key}=${allViteVars[key]}`);
});

console.log('\n🔵 OAUTH (For social login):');
categories.oauth.forEach(key => {
  console.log(`   ${key}=${allViteVars[key]}`);
});

console.log('\n🟢 SUPPORT (Contact information):');
categories.support.forEach(key => {
  console.log(`   ${key}=${allViteVars[key]}`);
});

console.log('\n🟣 FEATURE FLAGS (Enable/disable features):');
categories.features.forEach(key => {
  console.log(`   ${key}=${allViteVars[key]}`);
});

console.log('\n🟠 MONITORING (Analytics & error tracking):');
categories.monitoring.forEach(key => {
  console.log(`   ${key}=${allViteVars[key]}`);
});

console.log('\n⚪ EDGE FUNCTIONS (API configuration):');
categories.edge.forEach(key => {
  if (allViteVars[key]) {
    console.log(`   ${key}=${allViteVars[key]}`);
  }
});

console.log('\n⚫ OTHER:');
categories.other.forEach(key => {
  console.log(`   ${key}=${allViteVars[key]}`);
});

// Save to file
const outputPath = path.join(process.cwd(), 'vercel-env-variables.txt');
let fileContent = '# Vercel Environment Variables\n';
fileContent += '# Copy these to: Vercel Dashboard → Settings → Environment Variables\n\n';

for (const [key, value] of Object.entries(allViteVars)) {
  if (value) {
    fileContent += `${key}=${value}\n`;
  }
}

fs.writeFileSync(outputPath, fileContent, 'utf8');

console.log('\n\n📝 Instructions:');
console.log('1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables');
console.log('2. For each variable above, click "Add New"');
console.log('3. Enter the Name and Value');
console.log('4. Select environment scope:');
console.log('   ✅ Production (required)');
console.log('   ✅ Preview (recommended)');
console.log('   ⚠️  Development (optional)');
console.log('5. Click "Save"');
console.log('6. After adding all variables, redeploy your project');
console.log('\n💾 Variables also saved to: vercel-env-variables.txt');
console.log('\n⚠️  IMPORTANT: Update placeholder values with your actual credentials!');
console.log('   - Replace "your-project" with your actual Supabase project ID');
console.log('   - Replace "your-anon-key" with your actual Supabase anon key');
console.log('   - Replace "your-app.vercel.app" with your actual Vercel domain');
console.log('   - Update all other placeholder values\n');
