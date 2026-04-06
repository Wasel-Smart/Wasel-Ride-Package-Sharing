import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
const args = new Set(process.argv.slice(2));

function parseEnvFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {};
  }

  return fs
    .readFileSync(absolutePath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return acc;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex < 0) {
        return acc;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (key) {
        acc[key] = value;
      }
      return acc;
    }, {});
}

function readSupabaseInfoDefaults() {
  const actualInfoPath = path.join(root, 'src/utils/supabase/info.tsx');
  if (!fs.existsSync(actualInfoPath)) {
    return {};
  }

  const text = fs.readFileSync(actualInfoPath, 'utf8');
  const urlMatch = text.match(/const DEFAULT_SUPABASE_URL = '([^']+)'/);
  const keyMatch = text.match(/const DEFAULT_SUPABASE_ANON_KEY = '([^']+)'/);
  return {
    VITE_SUPABASE_URL: urlMatch?.[1] ?? '',
    VITE_SUPABASE_ANON_KEY: keyMatch?.[1] ?? '',
  };
}

function pickValue(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function isPlaceholder(value) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('your-project.supabase.co') ||
    normalized.includes('your-anon-key') ||
    normalized.includes('replace_with') ||
    normalized.includes('example.com')
  );
}

const localEnv = parseEnvFile('.env');
const exampleEnv = parseEnvFile('.env.example');
const infoDefaults = readSupabaseInfoDefaults();

const supabaseUrl = pickValue(
  process.env.VITE_SUPABASE_URL,
  localEnv.VITE_SUPABASE_URL,
  infoDefaults.VITE_SUPABASE_URL,
);
const supabaseAnonKey = pickValue(
  process.env.VITE_SUPABASE_ANON_KEY,
  localEnv.VITE_SUPABASE_ANON_KEY,
  infoDefaults.VITE_SUPABASE_ANON_KEY,
);
const authCallbackPath = pickValue(
  process.env.VITE_AUTH_CALLBACK_PATH,
  localEnv.VITE_AUTH_CALLBACK_PATH,
  exampleEnv.VITE_AUTH_CALLBACK_PATH,
  '/app/auth/callback',
);
const productionAppUrl = pickValue(
  process.env.VITE_PRODUCTION_APP_URL,
  exampleEnv.VITE_APP_URL,
  'https://wasel14.online',
);

if (!supabaseUrl || !supabaseAnonKey || isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
  console.error('Missing a real Supabase public URL or anon key for production auth verification.');
  process.exit(1);
}

const redirectTo = new URL(authCallbackPath, productionAppUrl).toString();
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const providerTargets = {
  google: 'google.com',
  facebook: 'facebook.com',
};

function printHeader(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

async function verifyProvider(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return {
      ok: false,
      provider,
      detail: error.message,
    };
  }

  if (!data?.url) {
    return {
      ok: false,
      provider,
      detail: 'Supabase did not return an OAuth URL.',
    };
  }

  const response = await fetch(data.url, { redirect: 'manual' });
  const location = response.headers.get('location') ?? '';
  const locationHost = location ? new URL(location).host : '';
  const expectedHost = providerTargets[provider];
  const matchesProvider = locationHost === expectedHost || locationHost.endsWith(`.${expectedHost}`);

  if (response.status < 300 || response.status > 399 || !matchesProvider) {
    return {
      ok: false,
      provider,
      detail: `Expected redirect to ${expectedHost}, got status ${response.status} and host ${locationHost || 'n/a'}.`,
    };
  }

  return {
    ok: true,
    provider,
    detail: `${response.status} -> ${locationHost}`,
  };
}

async function verifySignup() {
  const email = `codex-auth-smoke-${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'SmokeTest!234',
    options: {
      data: {
        full_name: 'Codex Smoke',
      },
    },
  });

  if (error) {
    return {
      ok: false,
      email,
      detail: error.message,
    };
  }

  return {
    ok: true,
    email,
    detail: `Created auth user ${data.user?.id ?? 'unknown'}${data.session ? ' with a live session.' : ' without a session.'}`,
  };
}

printHeader('Production Auth Verification');
console.log(`Supabase project: ${new URL(supabaseUrl).host}`);
console.log(`OAuth callback: ${redirectTo}`);

const providerResults = [];
for (const provider of ['google', 'facebook']) {
  providerResults.push(await verifyProvider(provider));
}

printHeader('OAuth Providers');
for (const result of providerResults) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.provider}: ${result.detail}`);
}

let signupResult = null;
if (!args.has('--skip-signup')) {
  signupResult = await verifySignup();
  printHeader('Email Signup Smoke');
  console.log(`${signupResult.ok ? 'PASS' : 'FAIL'} ${signupResult.email}: ${signupResult.detail}`);
}

const hasFailures =
  providerResults.some((result) => !result.ok) ||
  Boolean(signupResult && !signupResult.ok);

if (hasFailures) {
  console.error('\nProduction auth verification found at least one blocker.');
  process.exitCode = 1;
} else {
  console.log('\nProduction auth verification passed.');
}
