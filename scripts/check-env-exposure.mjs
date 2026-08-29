#!/usr/bin/env node
/**
 * CI guard: scan for .env files with real secrets in the repository.
 *
 * This script runs in CI and fails if any .env file contains non-placeholder
 * values that look like real secrets. It protects against accidental commits
 * of credentials, especially in OneDrive-synced trees.
 *
 * Usage:
 *   node scripts/check-env-exposure.mjs
 *
 * Exit codes:
 *   0 - No .env files found, or all contain only placeholders
 *   1 - .env file with real secrets detected
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]{24,}/i,           // Stripe secret key
  /sk_test_[a-zA-Z0-9]{24,}/i,           // Stripe test key
  /whsec_[a-zA-Z0-9]{24,}/i,             // Stripe webhook secret
  /xox[baprs]-[a-zA-Z0-9]{10,}/i,       // Slack token
  /AIza[0-9A-Za-z-_]{35}/i,             // Google API key
  /ya29\.[a-zA-Z0-9_-]+/i,              // Google OAuth token
  /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/i, // SendGrid API key
  /AC[a-f0-9]{32}/i,                     // Twilio Account SID
  /key-[a-zA-Z0-9]{32,}/i,               // Various API keys
  /(?:supabase|postgres|postgresql):\/\/[^:]+:[^@]+@[^\/]+\/[^?]+/i, // Database URLs
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, // Private keys
  /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i, // UUIDs (potential keys)
];

const PLACEHOLDER_PATTERNS = [
  /your[-_]?edge[-_]?function/i,
  /replace[-_]?with/i,
  /example/i,
  /placeholder/i,
  /your[-_]?api[-_]?key/i,
  /your[-_]?secret/i,
  /xxx/i,
  /changeme/i,
  /test/i,
  /dummy/i,
  /sample/i,
  /fake/i,
  /<.*>/i,
  /\$\{.*\}/i,
];

const ENV_FILE_PATTERNS = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.test',
  '.env.test.local',
  '.env.production',
  '.env.production.local',
  '.env.staging',
  '.env.staging.local',
];

let hasErrors = false;

function isPlaceholderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return true;
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(trimmed));
}

function containsSecret(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return false;
  return SECRET_PATTERNS.some(pattern => pattern.test(trimmed));
}

async function scanFile(filePath: string): Promise<string[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const secretLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isPlaceholderLine(line)) continue;
      if (containsSecret(line)) {
        secretLines.push(`  Line ${i + 1}: ${line.slice(0, 120)}${line.length > 120 ? '...' : ''}`);
      }
    }

    return secretLines;
  } catch {
    return [];
  }
}

async function findEnvFiles(dir: string, baseDir: string = dir): Promise<string[]> {
  const envFiles: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = relative(baseDir, fullPath);

      // Skip node_modules, .git, dist, build
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name.startsWith('.')
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        const nested = await findEnvFiles(fullPath, baseDir);
        envFiles.push(...nested);
      } else if (ENV_FILE_PATTERNS.some(pattern => entry.name === pattern || entry.name.startsWith(pattern))) {
        envFiles.push(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return envFiles;
}

async function main() {
  const repoRoot = process.cwd();

  console.log('[env-exposure-check] Scanning for .env files with real secrets...');

  const envFiles = await findEnvFiles(repoRoot);
  console.log(`[env-exposure-check] Found ${envFiles.length} .env file(s)`);

  if (envFiles.length === 0) {
    console.log('[env-exposure-check] ✓ No .env files found in repository');
    return 0;
  }

  let totalSecrets = 0;

  for (const filePath of envFiles) {
    const relativePath = relative(repoRoot, filePath);
    const secretLines = await scanFile(filePath);

    if (secretLines.length > 0) {
      hasErrors = true;
      totalSecrets += secretLines.length;
      console.error(`\n[env-exposure-check] ✗ SECRETS FOUND in ${relativePath}:`);
      for (const line of secretLines) {
        console.error(line);
      }
    } else {
      console.log(`[env-exposure-check] ✓ ${relativePath} contains only placeholders or comments`);
    }
  }

  if (hasErrors) {
    console.error(`\n[env-exposure-check] ✗ BLOCKING: ${totalSecrets} potential secret(s) found in .env files`);
    console.error('[env-exposure-check] Move real secrets to Vercel env vars, Azure Key Vault, or Supabase secrets');
    console.error('[env-exposure-check] See SECURITY.md for guidance');
    return 1;
  }

  console.log('\n[env-exposure-check] ✓ All .env files contain only placeholders');
  return 0;
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('[env-exposure-check] Error:', error);
    process.exit(1);
  });
