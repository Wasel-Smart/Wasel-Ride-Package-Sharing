import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const envPath = path.join(process.cwd(), '.env.example');
const envContents = await readFile(envPath, 'utf8');

const requiredKeys = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_EDGE_FUNCTION_NAME',
  'VITE_SUPPORT_WHATSAPP_NUMBER',
  'VITE_SUPPORT_EMAIL',
  'VITE_SUPPORT_PHONE_NUMBER',
  'VITE_SUPPORT_SMS_NUMBER',
  'VITE_ENABLE_TWO_FACTOR_AUTH',
  'VITE_ENABLE_EMAIL_NOTIFICATIONS',
  'VITE_ENABLE_SMS_NOTIFICATIONS',
  'VITE_ENABLE_WHATSAPP_NOTIFICATIONS',
  'VITE_ENABLE_DEMO_DATA',
  'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK',
  'VITE_SENTRY_DSN',
  'VITE_APP_URL',
  'VITE_APP_NAME',
  'SUPABASE_SERVICE_ROLE_KEY',
  'COMMUNICATION_WORKER_SECRET',
  'TWILIO_AUTH_TOKEN',
];

for (const key of requiredKeys) {
  if (!envContents.includes(`${key}=`)) {
    throw new Error(`.env.example is missing required key ${key}`);
  }
}

if (!envContents.includes('VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false')) {
  throw new Error('.env.example must default VITE_ALLOW_DIRECT_SUPABASE_FALLBACK to false');
}

if (
  !envContents.includes('VITE_API_URL=https://api.example.com') &&
  !envContents.includes('VITE_EDGE_FUNCTIONS_BASE_URL=')
) {
  throw new Error('.env.example must document an API transport override path');
}

console.log(`Environment contract validated: ${envPath}`);
