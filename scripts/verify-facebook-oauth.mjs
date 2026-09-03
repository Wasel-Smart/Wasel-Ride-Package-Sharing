#!/usr/bin/env node
/**
 * verify-facebook-oauth.mjs
 *
 * Verifies the Facebook OAuth wiring without printing or storing any secrets.
 *
 * Checks:
 *   1. Local .env / .env.production point at the expected Supabase project.
 *   2. VITE_FACEBOOK_APP_ID is a 15-16 digit numeric string.
 *   3. The Supabase /auth/v1/authorize?provider=facebook endpoint returns a 302
 *      to facebook.com/dialog/oauth with the matching client_id and a
 *      redirect_uri that points at /auth/v1/callback on the same Supabase host.
 *   4. The production site (optional, --production) does NOT return a redirect
 *      to vercel.com/sso-api or vercel.com/login, which would indicate Vercel
 *      Authentication is still enabled.
 *
 * Usage:
 *   node scripts/verify-facebook-oauth.mjs
 *   node scripts/verify-facebook-oauth.mjs --production
 *
 * Exit codes:
 *   0  all checks passed
 *   1  one or more checks failed
 *   2  configuration missing
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const EXPECTED_SUPABASE_HOST = 'zexlxabdcsjefptmjhuq.supabase.co';
const EXPECTED_FACEBOOK_APP_ID = '1438623708121685';
const EXPECTED_FACEBOOK_OAUTH_CALLBACK_PATH = '/auth/v1/callback';

const colors = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function log(level, msg) {
  const prefix = {
    pass: colors.green('PASS'),
    fail: colors.red('FAIL'),
    warn: colors.yellow('WARN'),
    info: colors.cyan('INFO'),
  }[level];
  console.log(`${prefix} ${msg}`);
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

function isPlaceholder(v) {
  if (!v) return true;
  const u = v.toUpperCase();
  return u.includes('SET_IN_') || u.includes('PASTE_') || u.includes('REPLACE') || u === 'TODO' || u === 'CHANGEME';
}

function isAppIdValid(v) {
  return /^\d{15,16}$/.test(String(v || '').trim());
}

async function fetchNoRedirect(url) {
  const res = await fetch(url, { redirect: 'manual' });
  return {
    status: res.status,
    location: res.headers.get('location') || '',
  };
}

async function fetchFollowing(url) {
  const res = await fetch(url, { redirect: 'follow' });
  return {
    status: res.status,
    finalUrl: res.url,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const checkProduction = args.includes('--production');

  let failed = 0;
  let warned = 0;

  console.log(colors.cyan('Facebook OAuth self-check'));
  console.log(colors.dim(`Repo: ${repoRoot}`));
  console.log();

  // ---- 1. Local env files ----
  for (const envFile of ['.env', '.env.production']) {
    const envPath = join(repoRoot, envFile);
    const env = parseEnvFile(envPath);

    if (!existsSync(envPath)) {
      log('warn', `${envFile} does not exist`);
      warned++;
      continue;
    }

    const url = env.VITE_SUPABASE_URL || '';
    const host = (() => {
      try {
        return new URL(url).host;
      } catch {
        return '';
      }
    })();
    if (host === EXPECTED_SUPABASE_HOST) {
      log('pass', `${envFile}: VITE_SUPABASE_URL -> ${host}`);
    } else {
      log('fail', `${envFile}: VITE_SUPABASE_URL is "${url}", expected host ${EXPECTED_SUPABASE_HOST}`);
      failed++;
    }

    const appId = env.VITE_FACEBOOK_APP_ID || '';
    if (appId === EXPECTED_FACEBOOK_APP_ID) {
      log('pass', `${envFile}: VITE_FACEBOOK_APP_ID matches expected App ID`);
    } else if (isAppIdValid(appId)) {
      log('warn', `${envFile}: VITE_FACEBOOK_APP_ID="${appId}" does not match expected "${EXPECTED_FACEBOOK_APP_ID}" (both are valid 15-16 digit IDs)`);
      warned++;
    } else if (isPlaceholder(appId)) {
      log('fail', `${envFile}: VITE_FACEBOOK_APP_ID is a placeholder ("${appId}")`);
      failed++;
    } else {
      log('fail', `${envFile}: VITE_FACEBOOK_APP_ID="${appId}" is not a 15-16 digit numeric ID`);
      failed++;
    }

    const pubKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    if (isPlaceholder(pubKey)) {
      log('warn', `${envFile}: VITE_SUPABASE_PUBLISHABLE_KEY is a placeholder (will be missing at runtime)`);
      warned++;
    } else if (pubKey.startsWith('sb_publishable_')) {
      log('pass', `${envFile}: VITE_SUPABASE_PUBLISHABLE_KEY looks like a Supabase publishable key`);
    } else if (pubKey.startsWith('eyJ')) {
      log('pass', `${envFile}: VITE_SUPABASE_PUBLISHABLE_KEY looks like a Supabase legacy anon JWT`);
    } else {
      log('warn', `${envFile}: VITE_SUPABASE_PUBLISHABLE_KEY has an unrecognized format`);
      warned++;
    }
  }

  // ---- 2. Live Supabase endpoint ----
  const authorizeUrl = `https://${EXPECTED_SUPABASE_HOST}/auth/v1/authorize?provider=facebook`;
  try {
    const res = await fetchNoRedirect(authorizeUrl);
    if (res.status === 302) {
      log('pass', `Supabase /auth/v1/authorize returned 302`);
    } else {
      log('fail', `Supabase /auth/v1/authorize returned ${res.status}, expected 302`);
      failed++;
      return summarize(failed, warned);
    }

    let parsed;
    try {
      parsed = new URL(res.location);
    } catch {
      log('fail', `Supabase 302 Location is not a valid URL: "${res.location}"`);
      failed++;
      return summarize(failed, warned);
    }

    if (parsed.host === 'www.facebook.com' && parsed.pathname === '/dialog/oauth') {
      log('pass', `302 Location points at facebook.com/dialog/oauth`);
    } else {
      log('fail', `302 Location is "${res.location}" (expected facebook.com/dialog/oauth)`);
      failed++;
    }

    const clientId = parsed.searchParams.get('client_id');
    if (clientId === EXPECTED_FACEBOOK_APP_ID) {
      log('pass', `client_id matches expected App ID (${clientId})`);
    } else {
      log('fail', `client_id is "${clientId}", expected "${EXPECTED_FACEBOOK_APP_ID}"`);
      failed++;
    }

    const redirectUri = parsed.searchParams.get('redirect_uri') || '';
    let redirectHost = '';
    let redirectPath = '';
    try {
      const ru = new URL(redirectUri);
      redirectHost = ru.host;
      redirectPath = ru.pathname;
    } catch {
      // ignore
    }
    if (redirectHost === EXPECTED_SUPABASE_HOST && redirectPath === EXPECTED_FACEBOOK_OAUTH_CALLBACK_PATH) {
      log('pass', `redirect_uri points at ${redirectHost}${redirectPath}`);
    } else {
      log('fail', `redirect_uri is "${redirectUri}" (expected ${EXPECTED_SUPABASE_HOST}${EXPECTED_FACEBOOK_OAUTH_CALLBACK_PATH})`);
      failed++;
    }
  } catch (e) {
    log('fail', `Supabase probe failed: ${e?.message || e}`);
    failed++;
  }

  // ---- 3. Optional: production site accessibility ----
  if (checkProduction) {
    const siteUrl = 'https://www.wasel14.online/app/auth';
    try {
      const res = await fetchFollowing(siteUrl);
      const finalUrl = res.finalUrl || '';
      if (finalUrl.includes('vercel.com/sso-api') || finalUrl.includes('vercel.com/login')) {
        log('fail', `Production site ${siteUrl} is gated by Vercel Authentication (final URL: ${finalUrl}). Turn off Deployment Protection in the Vercel dashboard.`);
        failed++;
      } else if (res.status === 200) {
        log('pass', `Production site ${siteUrl} returns 200 (not behind Vercel SSO)`);
      } else {
        log('warn', `Production site ${siteUrl} returned ${res.status}, final URL: ${finalUrl}`);
        warned++;
      }
    } catch (e) {
      log('warn', `Production probe failed: ${e?.message || e}`);
      warned++;
    }
  } else {
    log('info', `Skipping production accessibility check. Re-run with --production to include.`);
  }

  return summarize(failed, warned);
}

function summarize(failed, warned) {
  console.log();
  if (failed === 0) {
    log('pass', `All checks passed${warned ? ` (${warned} warning${warned === 1 ? '' : 's'})` : ''}.`);
    process.exit(0);
  } else {
    log('fail', `${failed} check${failed === 1 ? '' : 's'} failed, ${warned} warning${warned === 1 ? '' : 's'}.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(colors.red(`Unexpected error: ${e?.stack || e}`));
  process.exit(2);
});
