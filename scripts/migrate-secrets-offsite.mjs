import fs from 'fs';
import path from 'path';
import os from 'os';

const PROJECT_ROOT = process.cwd();
const DEFAULT_OFFSITE_DIR = path.join(os.homedir(), '.wasel-secrets');

const SENSITIVE_PATTERNS = [
  /sk_live_[A-Za-z0-9]{24,}/,
  /sk_test_[A-Za-z0-9]{24,}/,
  /pk_live_[A-Za-z0-9]{24,}/,
  /pk_test_[A-Za-z0-9]{24,}/,
  /AC[a-f0-9]{32}/,
  /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/,
  /sb_publishable_[A-Za-z0-9]+/,
  /https?:\/\/[^/]*\.supabase\.co/,
  /whsec_[A-Za-z0-9]+/,
  /re_live_[A-Za-z0-9]+/,
  /VA[a-f0-9]{32}/,
  /MG[a-f0-9]{32}/,
];

const PLACEHOLDER_INDICATORS = [
  'YOUR_', 'PASTE_', 'REPLACE_', 'EXAMPLE', 'PLACEHOLDER', 'TEST_',
];

function isPlaceholder(value) {
  return PLACEHOLDER_INDICATORS.some(ind => value.includes(ind));
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];

  lines.forEach((line, idx) => {
    if (!line.trim() || line.trim().startsWith('#')) return;
    const value = line.includes('=') ? line.split('=').slice(1).join('=') : line;
    if (isPlaceholder(value)) return;

    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(value)) {
        findings.push({ line: idx + 1, pattern: pattern.source, value: value.slice(0, 40) + '...' });
      }
    }
  });

  return findings;
}

function checkProjectEnvFiles() {
  const envFiles = ['.env', '.env.local', '.env.production', '.env.staging'];
  const findings = [];

  for (const file of envFiles) {
    const fullPath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(fullPath)) continue;

    const fileFindings = scanFile(fullPath);
    if (fileFindings.length > 0) {
      findings.push({ file, findings: fileFindings });
    }
  }

  return findings;
}

function main() {
  const offsiteDir = process.env.WASEL_ENV_DIR || DEFAULT_OFFSITE_DIR;
  const findings = checkProjectEnvFiles();

  if (findings.length === 0) {
    console.log('✅ No real secrets detected in project .env files.');
    console.log(`   Recommended offsite secrets directory: ${offsiteDir}`);
    return;
  }

  console.error('❌ Real secrets detected in project .env files:');
  for (const { file, findings: fileFindings } of findings) {
    console.error(`\n  ${file}:`);
    for (const f of fileFindings) {
      console.error(`    Line ${f.line}: pattern matched → ${f.value}`);
    }
  }

  console.error(`\n⚠️  MIGRATE THESE SECRETS IMMEDIATELY:`);
  console.error(`   1. Create directory: ${offsiteDir}`);
  console.error(`   2. Move real .env files there: move "${PROJECT_ROOT}\\.env" "${offsiteDir}\\"`);
  console.error(`   3. Set WASEL_ENV_DIR="${offsiteDir}" before running dev/build.`);
  console.error(`   4. Replace project .env files with placeholders only.`);
  console.error(`\n   PowerShell example:`);
  console.error(`     $env:WASEL_ENV_DIR="${offsiteDir}"`);
  console.error(`     npm run dev`);
  process.exit(1);
}

main();
