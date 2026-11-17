#!/usr/bin/env node
/**
 * Env-file exposure guard.
 *
 * What it checks
 *  1. Template files (`.env.example`, `.env.*.template`, `*.sample`) must contain
 *     placeholders only. A real value in a template is a leak, because
 *     templates are committed.
 *  2. Real env files (`.env`, `.env.local`, `.env.production`, ...) must not
 *     hold live secrets while the project sits inside a cloud-synced folder
 *     (OneDrive, Dropbox, Google Drive, iCloud). Sync copies them off-machine.
 *     Point WASEL_ENV_DIR at a folder outside the project instead.
 *  3. In CI, real env files must not exist at all.
 *  4. `VITE_*` variables are shipped to the browser, so a secret-looking name
 *     (SECRET / PRIVATE / SERVICE_ROLE) with a real value is always a failure.
 *
 * Unlike the earlier version, dot-files are NOT skipped: skipping them meant
 * every `.env*` file was invisible to the scan.
 *
 * Values are never printed. Exit 0 = clean, 1 = problem found.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.venv', '.expo', '.next', '.kilo']);

const TEMPLATE_RE = /(\.example|\.template|\.sample|\.dist)$/i;
const ENV_FILE_RE = /^\.env(\..+)?$/i;

const SENSITIVE_KEY_RE =
  /(SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|SERVICE_ROLE|API_KEY|APIKEY|DATABASE_URL|DB_URL|WEBHOOK|CLIENT_SECRET|AUTH_KEY|BACKUP_CODE|OIDC)/i;
const BROWSER_SECRET_KEY_RE = /^VITE_.*(SECRET|PRIVATE|SERVICE_ROLE|PASSWORD)/i;

/** Keys that look sensitive by name but are public identifiers or plain config. */
const PUBLIC_KEY_ALLOWLIST = new Set([
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'VITE_GOOGLE_MAPS_API_KEY',
  'VITE_EVENT_BROKER_API_KEY',
]);

const SECRET_VALUE_PATTERNS = [
  /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/,
  /\bwhsec_[A-Za-z0-9+/=]{24,}/,
  /\bsb_secret_[A-Za-z0-9_-]{16,}/,
  /\bGOCSPX-[A-Za-z0-9_-]{20,}/,
  /\bAC[a-f0-9]{32}\b/,
  /\bSK[a-f0-9]{32}\b/,
  /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/,
  /\bre_[A-Za-z0-9]{32,}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

const PLACEHOLDER_HINTS = [
  'your', 'placeholder', 'replace', 'example', 'changeme', 'change-me', 'dummy', 'sample', 'fake',
  'redacted', 'xxxx', 'paste_', 'rotate_and_set', 'set_real', '<', '>', '${', '...', 'todo',
];

function isPlaceholder(value) {
  const v = value.trim().replace(/^['"]|['"]$/g, '');
  if (v === '') return true;
  const lower = v.toLowerCase();
  return PLACEHOLDER_HINTS.some((hint) => lower.includes(hint));
}

function isLocalDatabaseUrl(value) {
  return /@(localhost|127\.0\.0\.1|host\.docker\.internal|db|postgres)(:|\/|$)/i.test(value);
}

function looksLikeRealSecret(key, rawValue) {
  const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
  if (isPlaceholder(value)) return false;
  if (SECRET_VALUE_PATTERNS.some((re) => re.test(value))) return true;
  if (/^[a-z]+:\/\/[^:\s/@]+:[^@\s]+@/i.test(value) && !isLocalDatabaseUrl(value)) return true;
  if (PUBLIC_KEY_ALLOWLIST.has(key)) return false;
  // Name says "secret", value is a long non-placeholder string.
  return SENSITIVE_KEY_RE.test(key) && value.length >= 16;
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const cleaned = trimmed.replace(/^export\s+/, '');
  const idx = cleaned.indexOf('=');
  if (idx <= 0) return null;
  return { key: cleaned.slice(0, idx).trim(), value: cleaned.slice(idx + 1) };
}

async function findEnvFiles(dir, root) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      found.push(...(await findEnvFiles(full, root)));
    } else if (ENV_FILE_RE.test(entry.name) || (TEMPLATE_RE.test(entry.name) && entry.name.startsWith('.env'))) {
      found.push(full);
    }
  }
  return found;
}

async function scanFile(file) {
  let content;
  try {
    content = await readFile(file, 'utf8');
  } catch (error) {
    if (error && (error.code === 'EPERM' || error.code === 'ENOENT' || error.code === 'EACCES')) {
      return null;
    }
    throw error;
  }
  const problems = [];
  content.split(/\r?\n/).forEach((line, index) => {
    const parsed = parseEnvLine(line);
    if (!parsed) return;
    const { key, value } = parsed;
    const real = looksLikeRealSecret(key, value);
    if (!real) return;
    problems.push({ line: index + 1, key, browserExposed: BROWSER_SECRET_KEY_RE.test(key) });
  });
  return problems;
}

async function main() {
  const root = resolve(process.cwd());
  const inCloudSync = /(onedrive|dropbox|google drive|googledrive|icloud)/i.test(root);
  const inCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

  const files = await findEnvFiles(root, root);
  console.log(`[env-exposure-check] Scanned ${files.length} env file(s) under ${root}`);

  let failed = false;

  for (const file of files) {
    const rel = relative(root, file).split(sep).join('/');
    const isTemplate = TEMPLATE_RE.test(rel);
    const problems = await scanFile(file);
    if (problems === null) {
      console.log(`skip ${rel} (unreadable or offsite target)`);
      continue;
    }

    if (inCI && !isTemplate) {
      console.error(`FAIL ${rel}: real env files must not exist in CI. Use CI secrets instead.`);
      failed = true;
      continue;
    }

    if (problems.length === 0) {
      console.log(`ok   ${rel}`);
      continue;
    }

    for (const p of problems) {
      const browser = p.browserExposed ? ' (VITE_* is bundled into the browser!)' : '';
      if (isTemplate) {
        console.error(`FAIL ${rel}:${p.line} ${p.key}: template contains a real-looking value${browser}`);
        failed = true;
      } else if (inCloudSync || p.browserExposed) {
        const reason = inCloudSync ? 'file sits in a cloud-synced folder' : 'exposed to the browser bundle';
        console.error(`FAIL ${rel}:${p.line} ${p.key}: live secret, ${reason}${browser}`);
        failed = true;
      } else {
        console.warn(`warn ${rel}:${p.line} ${p.key}: live value in a local env file (keep it out of git and synced folders)`);
      }
    }
  }

  if (failed) {
    console.error('\n[env-exposure-check] BLOCKING. What to do:');
    console.error('  1. Move real secrets outside the project (set WASEL_ENV_DIR, e.g. %USERPROFILE%\\.wasel-secrets).');
    console.error('  2. Replace values in templates with placeholders.');
    console.error('  3. Rotate anything real at the provider; deleting a local copy does not invalidate it.');
    return 1;
  }

  console.log('[env-exposure-check] OK');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('[env-exposure-check] Error:', error);
    process.exit(1);
  });
