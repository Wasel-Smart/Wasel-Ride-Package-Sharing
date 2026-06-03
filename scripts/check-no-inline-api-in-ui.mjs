import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const uiRoots = ['src/ui', 'src/components', 'src/app/pages/surfaces'];
const blockedPatterns = [
  { pattern: /\bsupabase\s*\./, message: 'Supabase calls belong in src/services or feature hooks.' },
  { pattern: /\bfetch\s*\(/, message: 'Network fetches belong in src/services.' },
  { pattern: /\bcreateClient\s*\(/, message: 'Supabase clients must be created by the service layer.' },
];
const allowlist = new Set();

function collectFiles(targetPath) {
  const absolutePath = join(root, targetPath);
  const stats = statSync(absolutePath);

  if (stats.isFile()) return [absolutePath];

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const next = join(targetPath, entry.name);
    if (entry.isDirectory()) return collectFiles(next);
    return /\.(ts|tsx)$/.test(entry.name) ? [join(root, next)] : [];
  });
}

const violations = [];

for (const uiRoot of uiRoots) {
  for (const filePath of collectFiles(uiRoot)) {
    const file = relative(root, filePath).replace(/\\/g, '/');
    if (allowlist.has(file)) continue;

    const contents = readFileSync(filePath, 'utf8');
    for (const { pattern, message } of blockedPatterns) {
      if (pattern.test(contents)) violations.push(`${file}: ${message}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Inline API usage detected in UI files:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('No inline API usage detected in enforced UI paths.');
