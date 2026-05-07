#!/usr/bin/env node
import process from 'node:process';

const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
  console.error('\n❌ Build failed: Missing required environment variables\n');
  console.error('The following variables must be set in Vercel:\n');
  missingVars.forEach(key => {
    console.error(`  - ${key}`);
  });
  console.error('\nPlease add these in Vercel Dashboard → Settings → Environment Variables');
  console.error('See VERCEL_ENV_SETUP.md for detailed instructions\n');
  process.exit(1);
}

// Validate URLs in production
const mode = process.env.MODE || process.env.NODE_ENV || 'development';
if (mode === 'production') {
  const appUrl = process.env.VITE_APP_URL || '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  
  if (appUrl && !appUrl.startsWith('https://')) {
    console.error('\n❌ Build failed: VITE_APP_URL must use HTTPS in production');
    console.error(`   Current value: ${appUrl}\n`);
    process.exit(1);
  }
  
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.error('\n❌ Build failed: VITE_SUPABASE_URL must use HTTPS in production');
    console.error(`   Current value: ${supabaseUrl}\n`);
    process.exit(1);
  }
}

console.log('✅ Environment variables validated');
