import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Regex patterns to detect hardcoded keys
const PATTERNS = {
  STRIPE_SECRET: /sk_live_[A-Za-z0-9]{24,}/,
  STRIPE_PUB: /pk_live_[A-Za-z0-9]{24,}/,
  TWILIO_SID: /AC[a-f0-9]{32}/,
  GENERIC_JWT: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/,
};

const EXCLUDED_FILES = [
  'node_modules',
  '.git',
  '.example',
  '.template',
  'SECURITY_CHECKLIST.md',
  'CREDENTIAL_ROTATION_GUIDE.md',
  'validate-no-secrets.mjs',
  'task.md',
  'implementation_plan.md',
  'wasel_app_review.md'
];

function shouldExclude(filePath) {
  return EXCLUDED_FILES.some(exclude => filePath.includes(exclude));
}

try {
  // Get tracked files via git ls-files
  const filesOutput = execSync('git ls-files', { encoding: 'utf8' });
  const files = filesOutput.split('\n').map(f => f.trim()).filter(Boolean);

  let hasErrors = false;

  for (const file of files) {
    if (shouldExclude(file)) {
      continue;
    }

    if (!fs.existsSync(file)) {
      continue;
    }

    // Skip binary files/images/SQL migrations
    const ext = path.extname(file).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.sql'].includes(ext)) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const [key, pattern] of Object.entries(PATTERNS)) {
        if (pattern.test(line)) {
          // Double check to ignore placeholder comments or imports
          if (line.includes('placeholder') || line.includes('YOUR_') || line.includes('import')) {
            continue;
          }
          console.error(`❌ Hardcoded secret detected in ${file}:${i + 1} (Pattern: ${key})`);
          hasErrors = true;
        }
      }
    }
  }

  if (hasErrors) {
    process.exit(1);
  } else {
    console.log('✅ No hardcoded secrets detected in tracked repository files.');
  }
} catch (error) {
  console.error('Error running secret validation:', error.message);
  process.exit(1);
}
