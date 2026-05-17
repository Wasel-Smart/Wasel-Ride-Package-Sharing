#!/usr/bin/env node
/**
 * Vercel build-time environment validation.
 *
 * Rules:
 *  - REQUIRED vars missing or still holding a placeholder → BUILD FAILS (exit 1)
 *  - RECOMMENDED vars missing → warning only, build continues
 *
 * Placeholder detection: any value that contains 'your-', '<', '...', or
 * matches the known template strings is rejected as unconfigured.
 */

const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_APP_URL',
  'VITE_APP_NAME',
  'VITE_EDGE_FUNCTION_NAME',
];

const RECOMMENDED_VARS = [
  'VITE_GOOGLE_MAPS_API_KEY',
  'VITE_SENTRY_DSN',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_SUPPORT_EMAIL',
];

/** Values that look like unfilled template placeholders. */
const PLACEHOLDER_PATTERNS = [
  /your-project/i,
  /your-anon-key/i,
  /your-project-ref/i,
  /replace[_-]with/i,
  /example\.com/i,
  /<[^>]+>/,          // <set-in-vercel>, <your-key>, etc.
  /\.\.\./,           // pk_live_51...
];

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some(re => re.test(value));
}

function getProjectRefFromJwt(jwt) {
  try {
    const payload = jwt.split('.')[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded).ref ?? null;
  } catch {
    return null;
  }
}

function getProjectRefFromUrl(url) {
  try {
    return new URL(url).hostname.replace('.supabase.co', '');
  } catch {
    return null;
  }
}

console.log('\n🔍 Wasel — Vercel environment validation\n');

const errors = [];
const warnings = [];

// ── Required variables ───────────────────────────────────────────────────────
for (const key of REQUIRED_VARS) {
  const value = process.env[key] ?? '';
  if (!value) {
    errors.push(`${key} is not set`);
  } else if (isPlaceholder(value)) {
    errors.push(`${key} still holds a placeholder value: "${value.slice(0, 40)}"`);
  }
}

// ── Supabase URL ↔ anon-key project-ref cross-check ─────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';

if (supabaseUrl && anonKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(anonKey)) {
  const urlRef = getProjectRefFromUrl(supabaseUrl);
  const jwtRef = getProjectRefFromJwt(anonKey);
  if (urlRef && jwtRef && urlRef !== jwtRef) {
    errors.push(
      `Supabase project mismatch: VITE_SUPABASE_URL points to "${urlRef}" ` +
      `but VITE_SUPABASE_ANON_KEY belongs to "${jwtRef}". ` +
      `They must be from the same project.`,
    );
  }
}

// ── HTTPS enforcement in production ─────────────────────────────────────────
if (supabaseUrl && !supabaseUrl.startsWith('https://') && !isPlaceholder(supabaseUrl)) {
  errors.push(`VITE_SUPABASE_URL must use https:// in production (got "${supabaseUrl}")`);
}

const appUrl = process.env.VITE_APP_URL ?? '';
if (appUrl && !appUrl.startsWith('https://') && !isPlaceholder(appUrl)) {
  errors.push(`VITE_APP_URL must use https:// in production (got "${appUrl}")`);
}

// ── Recommended variables ────────────────────────────────────────────────────
for (const key of RECOMMENDED_VARS) {
  const value = process.env[key] ?? '';
  if (!value || isPlaceholder(value)) {
    warnings.push(`${key} is not configured (non-blocking)`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
if (warnings.length > 0) {
  console.warn('⚠️  Warnings (build will continue):');
  warnings.forEach(w => console.warn(`   · ${w}`));
  console.warn('');
}

if (errors.length > 0) {
  console.error('❌ Build blocked — required environment variables are missing or invalid:\n');
  errors.forEach(e => console.error(`   ✗ ${e}`));
  console.error('\n   Fix these in: Vercel Dashboard → Settings → Environment Variables\n');
  process.exit(1);
}

console.log('✅ All required environment variables are configured.\n');
