#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const mode =
  process.env.MODE ||
  process.env.VITE_MODE ||
  process.env.NODE_ENV ||
  process.env.VERCEL_ENV ||
  'development';

const envFileMode =
  process.env.MODE ||
  process.env.VITE_MODE ||
  process.env.NODE_ENV ||
  'production';

const SUPABASE_URL_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PROJECT_URL',
  'VITE_PUBLIC_SUPABASE_URL',
];

const SUPABASE_PUBLIC_KEY_KEYS = [
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_PUBLIC_SUPABASE_ANON_KEY',
];

const presetEnvKeys = new Set(Object.keys(process.env));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) continue;

    const normalizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separatorIndex = normalizedLine.indexOf('=');

    if (separatorIndex <= 0) continue;

    const key = normalizedLine.slice(0, separatorIndex).trim();
    if (!key || presetEnvKeys.has(key)) continue;

    let value = normalizedLine.slice(separatorIndex + 1).trim();
    const hasMatchingQuotes =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));

    if (hasMatchingQuotes) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function hydrateBuildEnv() {
  const envFiles = [
    '.env',
    '.env.local',
    `.env.${envFileMode}`,
    `.env.${envFileMode}.local`,
  ];

  for (const fileName of envFiles) {
    loadEnvFile(path.join(process.cwd(), fileName));
  }
}

function getFirstConfiguredValue(keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

hydrateBuildEnv();

const PLACEHOLDER_PATTERNS = [
  /your-project/i,
  /your-anon-key/i,
  /your-project-ref/i,
  /replace[_-]with/i,
  /example\.com/i,
  /<[^>]+>/,
  /\.\.\./,
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

const supabaseUrl = getFirstConfiguredValue(SUPABASE_URL_KEYS);
const supabasePublicKey = getFirstConfiguredValue(SUPABASE_PUBLIC_KEY_KEYS);
const missingVars = [];

if (!supabaseUrl) {
  missingVars.push(`one of: ${SUPABASE_URL_KEYS.join(', ')}`);
} else if (isPlaceholder(supabaseUrl)) {
  missingVars.push(`VITE_SUPABASE_URL still holds a placeholder value`);
}

if (!supabasePublicKey) {
  missingVars.push(`one of: ${SUPABASE_PUBLIC_KEY_KEYS.join(', ')}`);
} else if (isPlaceholder(supabasePublicKey)) {
  missingVars.push(`VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY still holds a placeholder value`);
}

// Cross-check: URL and anon key must reference the same project
if (supabaseUrl && supabasePublicKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabasePublicKey)) {
  const urlRef = getProjectRefFromUrl(supabaseUrl);
  const jwtRef = getProjectRefFromJwt(supabasePublicKey);
  if (urlRef && jwtRef && urlRef !== jwtRef) {
    missingVars.push(
      `Supabase project mismatch: URL points to "${urlRef}" but anon key belongs to "${jwtRef}"`
    );
  }
}

if (missingVars.length > 0) {
  console.error('\n❌ Build failed: Missing required environment variables\n');
  console.error(`The following variables must be set for this ${mode} build:\n`);
  missingVars.forEach(key => {
    console.error(`  - ${key}`);
  });
  console.error(
    '\nPlease add these in Vercel Dashboard → Settings → Environment Variables',
  );
  console.error('See VERCEL_ENV_SETUP.md for detailed instructions\n');
  process.exit(1);
}

// Validate URLs in production
if (mode === 'production') {
  const appUrl = process.env.VITE_APP_URL || process.env.VITE_PRODUCTION_APP_URL || '';
  
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
