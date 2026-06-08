#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const timeoutMs = Number(process.env.LIVE_INTEGRATION_TIMEOUT_MS ?? 12_000);
const artifactsDir = path.join(root, 'artifacts', 'live-integrations');

const PLACEHOLDER_PATTERNS = [
  /^$/,
  /^<.*>$/,
  /\.\.\./,
  /your[-_\s]/i,
  /replace/i,
  /placeholder/i,
  /example/i,
  /dummy/i,
  /test_(secret|key|token)/i,
];

const checks = [];
const env = {};

function loadEnvFile(fileName) {
  const filePath = path.join(root, fileName);
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in env)) env[key] = value;
  }
}

for (const fileName of ['.env', '.env.local', '.env.production']) {
  loadEnvFile(fileName);
}

for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined) env[key] = value;
}

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(String(value ?? '').trim()));
}

function hasValue(key) {
  const value = env[key]?.trim();
  return Boolean(value) && !isPlaceholder(value);
}

function maskedStatus(key) {
  if (!(key in env)) return 'missing';
  if (isPlaceholder(env[key])) return 'placeholder';
  return 'set';
}

function record(provider, name, status, detail) {
  checks.push({ provider, name, status, detail });
}

function requireEnv(provider, keys) {
  for (const key of keys) {
    const ok = hasValue(key);
    record(provider, `env:${key}`, ok ? 'pass' : 'fail', maskedStatus(key));
  }
}

function requireOneOf(provider, keys) {
  const ok = keys.some(hasValue);
  record(
    provider,
    `env:any:${keys.join('|')}`,
    ok ? 'pass' : 'fail',
    ok ? keys.filter(hasValue).join(', ') : keys.map(key => `${key}=${maskedStatus(key)}`).join(', '),
  );
}

function requireFormat(provider, key, pattern, description) {
  if (!hasValue(key)) return;
  const ok = pattern.test(env[key].trim());
  record(provider, `format:${key}`, ok ? 'pass' : 'fail', ok ? description : `expected ${description}`);
}

function readSource(relativePath) {
  const filePath = path.join(root, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function readTree(relativePath) {
  const directoryPath = path.join(root, relativePath);
  if (!existsSync(directoryPath)) return '';

  const chunks = [];
  const stack = [directoryPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const stats = statSync(current);
    if (stats.isDirectory()) {
      for (const entry of readdirSync(current)) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        stack.push(path.join(current, entry));
      }
      continue;
    }
    if (/\.(ts|tsx|js|jsx|json|ya?ml)$/.test(current)) {
      chunks.push(readFileSync(current, 'utf8'));
    }
  }
  return chunks.join('\n');
}

function requireSourceToken(provider, relativePath, token, name = token) {
  const content = readSource(relativePath);
  record(
    provider,
    `code:${name}`,
    content.includes(token) ? 'pass' : 'fail',
    content ? `${relativePath}` : `${relativePath} missing`,
  );
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function liveProbe(provider, name, fn) {
  if (process.env.LIVE_INTEGRATION_SKIP_NETWORK === 'true') {
    record(provider, name, 'skip', 'LIVE_INTEGRATION_SKIP_NETWORK=true');
    return;
  }
  try {
    const detail = await fn();
    record(provider, name, 'pass', detail);
  } catch (error) {
    record(provider, name, 'fail', error instanceof Error ? error.message : String(error));
  }
}

async function verifySupabaseAndOAuth() {
  const provider = 'Supabase/Auth/OAuth';
  requireEnv(provider, ['VITE_SUPABASE_URL']);
  requireOneOf(provider, ['VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY']);
  requireEnv(provider, [
    'SUPABASE_AUTH_GOOGLE_CLIENT_ID',
    'SUPABASE_AUTH_GOOGLE_CLIENT_SECRET',
    'SUPABASE_AUTH_FACEBOOK_CLIENT_ID',
    'SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET',
  ]);
  requireSourceToken(provider, 'supabase/config.toml', '[auth.external.google]', 'google-provider');
  requireSourceToken(provider, 'supabase/config.toml', '[auth.external.facebook]', 'facebook-provider');
  requireSourceToken(provider, 'src/contexts/AuthContext.tsx', 'signInWithGoogle');
  requireSourceToken(provider, 'src/contexts/AuthContext.tsx', 'signInWithFacebook');

  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (hasValue('VITE_SUPABASE_URL') && anonKey && !isPlaceholder(anonKey)) {
    await liveProbe(provider, 'live:supabase-auth-health', async () => {
      const response = await fetchWithTimeout(`${supabaseUrl}/auth/v1/health`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });
      if (!response.ok) throw new Error(`Supabase auth health returned HTTP ${response.status}`);
      return 'auth health endpoint reachable';
    });
  }
}

async function verifyStripe() {
  const provider = 'Stripe';
  requireEnv(provider, [
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_WASEL_PLUS_PRICE_ID',
  ]);
  requireFormat(provider, 'VITE_STRIPE_PUBLISHABLE_KEY', /^pk_(test|live)_[A-Za-z0-9]+/, 'Stripe publishable key');
  requireFormat(provider, 'STRIPE_SECRET_KEY', /^sk_(test|live)_[A-Za-z0-9]+/, 'Stripe secret key');
  requireFormat(provider, 'STRIPE_WEBHOOK_SECRET', /^whsec_[A-Za-z0-9]+/, 'Stripe webhook secret');
  requireSourceToken(provider, 'backend/services/payment-reconciliation/service-production.ts', 'paymentIntents.capture');
  requireSourceToken(provider, 'backend/services/payment-reconciliation/service-production.ts', 'refunds.create');
  requireSourceToken(provider, 'supabase/functions/make-server-0b1f4071/index.ts', 'checkout.session.completed');

  if (hasValue('STRIPE_SECRET_KEY')) {
    await liveProbe(provider, 'live:balance', async () => {
      const response = await fetchWithTimeout('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
      });
      if (!response.ok) throw new Error(`Stripe balance returned HTTP ${response.status}`);
      return 'secret key accepted';
    });
  }

  if (hasValue('STRIPE_SECRET_KEY') && hasValue('STRIPE_WASEL_PLUS_PRICE_ID')) {
    await liveProbe(provider, 'live:wasel-plus-price', async () => {
      const priceId = encodeURIComponent(env.STRIPE_WASEL_PLUS_PRICE_ID);
      const response = await fetchWithTimeout(`https://api.stripe.com/v1/prices/${priceId}`, {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
      });
      if (!response.ok) throw new Error(`Stripe price lookup returned HTTP ${response.status}`);
      return 'price exists';
    });
  }
}

async function verifyGoogleMaps() {
  const provider = 'Google Maps/Routes';
  requireEnv(provider, ['VITE_GOOGLE_MAPS_API_KEY']);
  requireSourceToken(provider, 'src/services/googleRoutesTraffic.ts', 'routes.googleapis.com/directions/v2:computeRoutes');
  requireSourceToken(provider, 'src/components/WaselMap.tsx', 'maps.googleapis.com/maps/vt');

  if (hasValue('VITE_GOOGLE_MAPS_API_KEY')) {
    await liveProbe(provider, 'live:routes-compute', async () => {
      const response = await fetchWithTimeout('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.VITE_GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: 31.9539, longitude: 35.9106 } } },
          destination: { location: { latLng: { latitude: 32.0608, longitude: 36.0942 } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
        }),
      });
      if (!response.ok) throw new Error(`Google Routes returned HTTP ${response.status}`);
      return 'Routes API accepted key';
    });
  }
}

async function verifyEmail() {
  const provider = 'Email';
  requireOneOf(provider, ['RESEND_API_KEY', 'SENDGRID_API_KEY']);
  if (hasValue('RESEND_API_KEY')) requireEnv(provider, ['RESEND_FROM_EMAIL']);
  if (hasValue('SENDGRID_API_KEY')) requireEnv(provider, ['SENDGRID_FROM_EMAIL']);
  requireSourceToken(provider, 'supabase/functions/make-server-0b1f4071/_shared/communication-runtime.ts', 'https://api.resend.com/emails');
  requireSourceToken(provider, 'supabase/functions/make-server-0b1f4071/_shared/communication-runtime.ts', 'https://api.sendgrid.com/v3/mail/send');

  if (hasValue('RESEND_API_KEY')) {
    await liveProbe(provider, 'live:resend-domains', async () => {
      const response = await fetchWithTimeout('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
      });
      if (!response.ok) throw new Error(`Resend domains returned HTTP ${response.status}`);
      return 'Resend key accepted';
    });
  }

  if (hasValue('SENDGRID_API_KEY')) {
    await liveProbe(provider, 'live:sendgrid-account', async () => {
      const response = await fetchWithTimeout('https://api.sendgrid.com/v3/user/account', {
        headers: { Authorization: `Bearer ${env.SENDGRID_API_KEY}` },
      });
      if (!response.ok) throw new Error(`SendGrid account returned HTTP ${response.status}`);
      return 'SendGrid key accepted';
    });
  }
}

async function verifyTwilioAndWhatsApp() {
  const provider = 'Twilio/SMS/WhatsApp';
  requireEnv(provider, [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_VERIFY_SERVICE_SID',
    'TWILIO_WHATSAPP_FROM',
  ]);
  requireOneOf(provider, ['TWILIO_MESSAGING_SERVICE_SID', 'TWILIO_SMS_FROM']);
  requireFormat(provider, 'TWILIO_ACCOUNT_SID', /^AC[a-f0-9]{32}$/i, 'Twilio Account SID');
  requireFormat(provider, 'TWILIO_VERIFY_SERVICE_SID', /^VA[a-f0-9]{32}$/i, 'Twilio Verify Service SID');
  requireFormat(provider, 'TWILIO_WHATSAPP_FROM', /^whatsapp:\+\d{8,15}$/i, 'whatsapp:+E.164 sender');
  requireSourceToken(provider, 'supabase/functions/make-server-0b1f4071/_shared/communication-runtime.ts', 'api.twilio.com/2010-04-01/Accounts');
  requireSourceToken(provider, 'supabase/functions/make-server-0b1f4071/index.ts', 'startTwilioPhoneVerification');

  if (hasValue('TWILIO_ACCOUNT_SID') && hasValue('TWILIO_AUTH_TOKEN')) {
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    await liveProbe(provider, 'live:account', async () => {
      const response = await fetchWithTimeout(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}.json`,
        { headers: { Authorization: `Basic ${auth}` } },
      );
      if (!response.ok) throw new Error(`Twilio account returned HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.status !== 'active') throw new Error(`Twilio account is ${payload.status}`);
      return 'Twilio account active';
    });
  }
}

function verifyCommunicationsWorker() {
  const provider = 'Communications Worker';
  requireEnv(provider, ['COMMUNICATION_WORKER_SECRET', 'COMMUNICATION_WEBHOOK_TOKEN']);
  requireSourceToken(provider, 'supabase/functions/make-server-0b1f4071/index.ts', '/communications/process');
  requireSourceToken(provider, 'supabase/functions/provider-webhooks/index.ts', '/twilio');
  const inlineEnabled = env.COMMUNICATION_PROCESS_INLINE === 'true';
  const scheduled = readSource('scripts/deploy-edge-function.sh').includes('/communications/process') ||
    readTree('.github/workflows').includes('/communications/process');
  record(
    provider,
    'delivery-processing-trigger',
    inlineEnabled || scheduled ? 'pass' : 'fail',
    inlineEnabled
      ? 'COMMUNICATION_PROCESS_INLINE=true'
      : scheduled
        ? 'external process trigger found'
        : 'no inline processing or scheduler found for /communications/process',
  );
}

function verifyCliq() {
  const provider = 'CliQ';
  requireEnv(provider, [
    'CLIQ_API_BASE_URL',
    'CLIQ_MERCHANT_ID',
    'CLIQ_API_KEY',
    'CLIQ_WEBHOOK_SECRET',
    'CLIQ_CHECKOUT_URL_TEMPLATE',
  ]);
  requireSourceToken(provider, 'supabase/functions/make-server-0b1f4071/index.ts', 'buildCliqCheckoutUrl');
  const server = readSource('supabase/functions/make-server-0b1f4071/index.ts').toLowerCase();
  const hasWebhook = server.includes('cliq') && server.includes('webhook') && server.includes('cliq_webhook_secret');
  record(
    provider,
    'code:verified-webhook',
    hasWebhook ? 'pass' : 'fail',
    hasWebhook ? 'CliQ webhook verification code found' : 'CliQ only builds checkout URL; no verified webhook finalization found',
  );
}

function verifySanad() {
  const provider = 'Sanad';
  requireEnv(provider, [
    'SANAD_API_BASE_URL',
    'SANAD_CLIENT_ID',
    'SANAD_CLIENT_SECRET',
    'SANAD_WEBHOOK_SECRET',
  ]);
  requireSourceToken(provider, 'supabase/functions/make-server-0b1f4071/index.ts', 'app_submit_sanad_verification');
  const server = readSource('supabase/functions/make-server-0b1f4071/index.ts').toLowerCase();
  const hasLiveSanad = server.includes('sanad_api_base_url') || server.includes('sanad_client_secret');
  record(
    provider,
    'code:live-provider-client',
    hasLiveSanad ? 'pass' : 'fail',
    hasLiveSanad ? 'Sanad provider client found' : 'Sanad is manual/pending workflow; no live API client found',
  );
}

function verifyMobile() {
  const provider = 'Mobile';
  requireSourceToken(provider, 'mobile/src/lib/config.ts', 'stripePublishableKey');
  const source = `${readTree('mobile/src')}\n${readTree('mobile/app')}`;
  const packageJson = readSource('mobile/package.json');
  record(
    provider,
    'code:stripe-native-flow',
    /initPaymentSheet|presentPaymentSheet|StripeProvider|useStripe|CardField/.test(source) ? 'pass' : 'fail',
    'requires native Stripe UI flow, not only config flag',
  );
  record(
    provider,
    'code:map-native-flow',
    /MapView/.test(source) ? 'pass' : 'fail',
    packageJson.includes('react-native-maps')
      ? 'react-native-maps dependency exists, but rendered MapView flow is required'
      : 'requires rendered map flow',
  );
  record(
    provider,
    'code:oauth-mobile-flow',
    /signInWithOAuth|signInWithGoogle|signInWithFacebook|provider:\s*['"](google|facebook)['"]/i.test(source) ? 'pass' : 'fail',
    'requires Google/Facebook mobile OAuth flow',
  );
}

await verifySupabaseAndOAuth();
await verifyStripe();
await verifyGoogleMaps();
await verifyEmail();
await verifyTwilioAndWhatsApp();
verifyCommunicationsWorker();
verifyCliq();
verifySanad();
verifyMobile();

const failed = checks.filter(check => check.status === 'fail');
const skipped = checks.filter(check => check.status === 'skip');
const passed = checks.filter(check => check.status === 'pass');
const scoreOutOf10 = Number(((passed.length / Math.max(passed.length + failed.length, 1)) * 10).toFixed(1));

mkdirSync(artifactsDir, { recursive: true });

const providerSummary = Object.values(
  checks.reduce((summary, check) => {
    summary[check.provider] ??= {
      provider: check.provider,
      passed: 0,
      failed: 0,
      skipped: 0,
      blockers: [],
    };

    summary[check.provider][check.status === 'pass' ? 'passed' : check.status === 'skip' ? 'skipped' : 'failed'] += 1;
    if (check.status === 'fail') {
      summary[check.provider].blockers.push(`${check.name}: ${check.detail}`);
    }

    return summary;
  }, {}),
);

const report = {
  generatedAt: new Date().toISOString(),
  scoreOutOf10,
  passed: passed.length,
  failed: failed.length,
  skipped: skipped.length,
  liveIntegrated: failed.length === 0,
  providerSummary,
  checks,
};

writeFileSync(
  path.join(artifactsDir, 'live-integration-report.json'),
  JSON.stringify(report, null, 2),
);

writeFileSync(
  path.join(artifactsDir, 'live-integration-report.md'),
  [
    '# Wasel Live Integration Gate',
    '',
    `Generated: ${report.generatedAt}`,
    `Evidence-based score: ${scoreOutOf10}/10`,
    `Live integrated: ${report.liveIntegrated ? 'yes' : 'no'}`,
    '',
    '## Provider Summary',
    '',
    ...providerSummary.flatMap(provider => [
      `### ${provider.provider}`,
      '',
      `Passed: ${provider.passed}`,
      `Failed: ${provider.failed}`,
      `Skipped: ${provider.skipped}`,
      '',
      ...(provider.blockers.length
        ? ['Blockers:', ...provider.blockers.map(blocker => `- ${blocker}`), '']
        : ['No blockers.', '']),
    ]),
  ].join('\n'),
);

console.log('\n# Live Integration Gate\n');
console.log(`Score: ${scoreOutOf10}/10`);
console.log(`Passed: ${passed.length}`);
console.log(`Failed: ${failed.length}`);
console.log(`Skipped: ${skipped.length}`);
console.log(`Report: ${path.join('artifacts', 'live-integrations', 'live-integration-report.md')}`);

for (const check of checks) {
  const marker = check.status === 'pass' ? 'PASS' : check.status === 'skip' ? 'SKIP' : 'FAIL';
  console.log(`${marker} [${check.provider}] ${check.name} - ${check.detail}`);
}

if (failed.length > 0) {
  console.error('\nLive integration gate failed. Fix every FAIL before calling the platform 100% live-integrated.');
  process.exit(1);
}

console.log('\nLive integration gate passed.');
