#!/usr/bin/env node

/**
 * Interactive OAuth Credentials Setup
 * Helps you add Google and Facebook credentials to .env
 */

import { createInterface } from 'readline';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🔐 OAuth Credentials Setup\n');
  console.log('This will help you add your OAuth credentials to .env\n');
  
  const provider = await question('Which provider? (google/facebook/both): ');
  
  let envContent = readFileSync(envPath, 'utf8');
  
  if (provider === 'google' || provider === 'both') {
    console.log('\n📝 Google OAuth Credentials:\n');
    
    const googleClientId = await question('Google Client ID: ');
    const googleClientSecret = await question('Google Client Secret: ');
    
    if (googleClientId && googleClientSecret) {
      envContent = envContent.replace(
        /VITE_GOOGLE_CLIENT_ID=.*/,
        `VITE_GOOGLE_CLIENT_ID=${googleClientId}`
      );
      envContent = envContent.replace(
        /SUPABASE_AUTH_GOOGLE_CLIENT_ID=.*/,
        `SUPABASE_AUTH_GOOGLE_CLIENT_ID=${googleClientId}`
      );
      envContent = envContent.replace(
        /SUPABASE_AUTH_GOOGLE_CLIENT_SECRET=.*/,
        `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET=${googleClientSecret}`
      );
      
      console.log('✅ Google credentials will be added\n');
    }
  }
  
  if (provider === 'facebook' || provider === 'both') {
    console.log('\n📝 Facebook OAuth Credentials:\n');
    
    const facebookAppId = await question('Facebook App ID: ');
    const facebookAppSecret = await question('Facebook App Secret: ');
    
    if (facebookAppId && facebookAppSecret) {
      envContent = envContent.replace(
        /VITE_FACEBOOK_APP_ID=.*/,
        `VITE_FACEBOOK_APP_ID=${facebookAppId}`
      );
      envContent = envContent.replace(
        /SUPABASE_AUTH_FACEBOOK_CLIENT_ID=.*/,
        `SUPABASE_AUTH_FACEBOOK_CLIENT_ID=${facebookAppId}`
      );
      envContent = envContent.replace(
        /SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET=.*/,
        `SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET=${facebookAppSecret}`
      );
      
      console.log('✅ Facebook credentials will be added\n');
    }
  }
  
  const confirm = await question('Save to .env? (yes/no): ');
  
  if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
    writeFileSync(envPath, envContent, 'utf8');
    console.log('\n✅ Credentials saved to .env!\n');
    console.log('Next steps:');
    console.log('1. Run: npm run verify:oauth');
    console.log('2. Configure Supabase Dashboard');
    console.log('3. Run: npm run dev\n');
  } else {
    console.log('\n❌ Cancelled. No changes made.\n');
  }
  
  rl.close();
}

main().catch(console.error);
