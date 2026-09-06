import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILES = ['.env', '.env.local'];

const SECRET_PATTERNS = [
  { regex: /^(VITE_SUPABASE_PUBLISHABLE_KEY)=.+$/m, placeholder: '$1=PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE' },
  { regex: /^(VITE_SUPABASE_ANON_KEY)=.+$/m, placeholder: '$1=PASTE_YOUR_SUPABASE_ANON_KEY_HERE' },
  { regex: /^(SUPABASE_SECRET_KEY)=.+$/m, placeholder: '$1=PASTE_YOUR_SUPABASE_SECRET_KEY_HERE' },
  { regex: /^(SUPABASE_SERVICE_ROLE_KEY)=.+$/m, placeholder: '$1=PASTE_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE' },
  { regex: /^(SUPABASE_JWT_SECRET)=.+$/m, placeholder: '$1=PASTE_YOUR_SUPABASE_JWT_SECRET_HERE' },
  { regex: /^(VITE_GOOGLE_MAPS_API_KEY)=.+$/m, placeholder: '$1=PASTE_YOUR_GOOGLE_MAPS_API_KEY_HERE' },
  { regex: /^(VITE_GOOGLE_CLIENT_ID)=.+$/m, placeholder: '$1=PASTE_YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com' },
  { regex: /^(SUPABASE_AUTH_GOOGLE_CLIENT_ID)=.+$/m, placeholder: '$1=PASTE_YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com' },
  { regex: /^(SUPABASE_AUTH_GOOGLE_CLIENT_SECRET)=.+$/m, placeholder: '$1=PASTE_YOUR_GOOGLE_CLIENT_SECRET_HERE' },
  { regex: /^(VITE_FACEBOOK_APP_ID)=.+$/m, placeholder: '$1=PASTE_YOUR_FACEBOOK_APP_ID_HERE' },
  { regex: /^(SUPABASE_AUTH_FACEBOOK_CLIENT_ID)=.+$/m, placeholder: '$1=PASTE_YOUR_FACEBOOK_APP_ID_HERE' },
  { regex: /^(SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET)=.+$/m, placeholder: '$1=PASTE_YOUR_FACEBOOK_APP_SECRET_HERE' },
  { regex: /^(VITE_STRIPE_PUBLISHABLE_KEY)=.+$/m, placeholder: '$1=pk_live_PASTE_YOUR_STRIPE_PUBLISHABLE_KEY_HERE' },
  { regex: /^(STRIPE_SECRET_KEY)=.+$/m, placeholder: '$1=sk_live_PASTE_YOUR_STRIPE_SECRET_KEY_HERE' },
  { regex: /^(STRIPE_WEBHOOK_SECRET)=.+$/m, placeholder: '$1=whsec_PASTE_YOUR_STRIPE_WEBHOOK_SECRET_HERE' },
  { regex: /^(STRIPE_WASEL_PLUS_PRICE_ID)=.+$/m, placeholder: '$1=price_PASTE_YOUR_STRIPE_PRICE_ID_HERE' },
  { regex: /^(VITE_SENTRY_DSN)=.+$/m, placeholder: '$1=https://PASTE_YOUR_SENTRY_DSN@oPASTE_YOUR_ORG.ingest.sentry.io/PASTE_YOUR_PROJECT_ID' },
  { regex: /^(VITE_APP_INSIGHTS_KEY)=.+$/m, placeholder: '$1=PASTE_YOUR_APP_INSIGHTS_KEY_HERE' },
  { regex: /^(RESEND_API_KEY)=.+$/m, placeholder: '$1=re_live_PASTE_YOUR_RESEND_API_KEY_HERE' },
  { regex: /^(SENDGRID_API_KEY)=.+$/m, placeholder: '$1=SG.PASTE_YOUR_SENDGRID_API_KEY_HERE' },
  { regex: /^(TWILIO_ACCOUNT_SID)=.+$/m, placeholder: '$1=AC_PASTE_YOUR_TWILIO_ACCOUNT_SID_HERE' },
  { regex: /^(TWILIO_AUTH_TOKEN)=.+$/m, placeholder: '$1=PASTE_YOUR_TWILIO_AUTH_TOKEN_HERE' },
  { regex: /^(TWILIO_VERIFY_SERVICE_SID)=.+$/m, placeholder: '$1=VA_PASTE_YOUR_TWILIO_VERIFY_SERVICE_SID_HERE' },
  { regex: /^(TWILIO_MESSAGING_SERVICE_SID)=.+$/m, placeholder: '$1=MG_PASTE_YOUR_TWILIO_MESSAGING_SERVICE_SID_HERE' },
  { regex: /^(SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID)=.+$/m, placeholder: '$1=AC_PASTE_YOUR_TWILIO_ACCOUNT_SID_HERE' },
  { regex: /^(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)=.+$/m, placeholder: '$1=PASTE_YOUR_TWILIO_AUTH_TOKEN_HERE' },
  { regex: /^(SUPABASE_AUTH_SMS_TWILIO_VERIFY_SERVICE_SID)=.+$/m, placeholder: '$1=VA_PASTE_YOUR_TWILIO_VERIFY_SERVICE_SID_HERE' },
  { regex: /^(CLIQ_MERCHANT_ID)=.+$/m, placeholder: '$1=PASTE_YOUR_CLIQ_MERCHANT_ID_HERE' },
  { regex: /^(CLIQ_API_KEY)=.+$/m, placeholder: '$1=PASTE_YOUR_CLIQ_API_KEY_HERE' },
  { regex: /^(CLIQ_WEBHOOK_SECRET)=.+$/m, placeholder: '$1=PASTE_YOUR_CLIQ_WEBHOOK_SECRET_HERE' },
  { regex: /^(SANAD_CLIENT_ID)=.+$/m, placeholder: '$1=PASTE_YOUR_SANAD_CLIENT_ID_HERE' },
  { regex: /^(SANAD_CLIENT_SECRET)=.+$/m, placeholder: '$1=PASTE_YOUR_SANAD_CLIENT_SECRET_HERE' },
  { regex: /^(SANAD_WEBHOOK_SECRET)=.+$/m, placeholder: '$1=PASTE_YOUR_SANAD_WEBHOOK_SECRET_HERE' },
  { regex: /^(COMMUNICATION_WORKER_SECRET)=.+$/m, placeholder: '$1=PASTE_YOUR_COMMUNICATION_WORKER_SECRET_HERE' },
  { regex: /^(COMMUNICATION_WEBHOOK_TOKEN)=.+$/m, placeholder: '$1=PASTE_YOUR_COMMUNICATION_WEBHOOK_TOKEN_HERE' },
  { regex: /^(WASEL_INTERNAL_HEALTH_TOKEN)=.+$/m, placeholder: '$1=PASTE_YOUR_WASEL_INTERNAL_HEALTH_TOKEN_HERE' },
  { regex: /^(VERCEL_OIDC_TOKEN)=.+$/m, placeholder: '$1=PASTE_YOUR_VERCEL_OIDC_TOKEN_HERE' },
  { regex: /^(VITE_EVENT_BROKER_WORKER_SECRET)=.+$/m, placeholder: '$1=replace-with-a-long-random-secret' },
  { regex: /^(VITE_EVENT_BROKER_PROXY_URL)=.+$/m, placeholder: '$1=https://your-project.supabase.co/functions/v1/event-broker-proxy' },
  { regex: /^(VITE_GEO_STREAM_URL)=.+$/m, placeholder: '$1=' },
  { regex: /^(VITE_AUTH_CAPTCHA_PROVIDER)=.+$/m, placeholder: '$1=' },
  { regex: /^(VITE_AUTH_CAPTCHA_SITE_KEY)=.+$/m, placeholder: '$1=' },
  { regex: /^(SUPABASE_JWKS_URL)=.+$/m, placeholder: '$1=https://YOUR-PROJECT-REF.supabase.co/auth/v1/.well-known/jwks.json' },
  { regex: /^(VITE_EDGE_FUNCTIONS_BASE_URL)=.+$/m, placeholder: '$1=https://YOUR-PROJECT-REF.supabase.co/functions/v1' },
];

let sanitized = 0;

for (const file of FILES) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP ${file} — not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  for (const pattern of SECRET_PATTERNS) {
    content = content.replace(pattern.regex, pattern.placeholder);
  }

  if (content !== original) {
    const backupPath = `${filePath}.backup.${new Date().toISOString().slice(0, 10)}`;
    fs.writeFileSync(backupPath, original, 'utf-8');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`SANITIZED ${file} — backup saved to ${path.basename(backupPath)}`);
    sanitized++;
  } else {
    console.log(`CLEAN  ${file} — no secrets found`);
  }
}

if (sanitized === 0) {
  console.log('\nNo .env files needed sanitization.');
} else {
  console.log(`\nSanitized ${sanitized} file(s).`);
  console.log('Next steps:');
  console.log('  1. Review the backup files (*.backup.YYYY-MM-DD) to confirm values.');
  console.log('  2. Move real secrets to a directory outside OneDrive sync, e.g.:');
  console.log('       $env:WASEL_ENV_DIR="$env:USERPROFILE\\.wasel-secrets"');
  console.log('  3. Re-populate secrets there using the backup as reference.');
  console.log('  4. Delete the backup files once confirmed.');
}
