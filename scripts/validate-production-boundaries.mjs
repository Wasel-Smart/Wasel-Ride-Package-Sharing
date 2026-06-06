import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const frontendRoots = ['src/services', 'src/utils', 'src/features', 'src/contexts', 'src/pages'];
const frontendAllowlist = new Set([
  path.normalize('src/services/core.ts'),
  path.normalize('src/utils/supabase/client.ts'),
  path.normalize('src/utils/supabase/info.tsx'),
]);

const productionFiles = [
  'src/platform/event-broker-redis-production.ts',
  'backend/services/ride-matching/service-production.ts',
  'backend/services/payment-reconciliation/service-production.ts',
  'backend/services/ops-analytics/service-production.ts',
];

function walk(relativeDir, files = []) {
  const absoluteDir = path.join(root, relativeDir);
  for (const entry of readdirSync(absoluteDir)) {
    const absolutePath = path.join(absoluteDir, entry);
    const relativePath = path.relative(root, absolutePath);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      walk(relativePath, files);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      files.push(path.normalize(relativePath));
    }
  }
  return files;
}

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

const violations = [];

for (const dir of frontendRoots) {
  for (const file of walk(dir)) {
    if (frontendAllowlist.has(file)) continue;
    const source = read(file);
    if (/\bsupabase\s*\.\s*from\s*\(/.test(source)) {
      violations.push(`${file}: frontend direct Supabase table access is forbidden`);
    }
    if (/\bcreateClient\s*\(/.test(source)) {
      violations.push(`${file}: frontend Supabase client creation is forbidden outside auth client module`);
    }
    if (/fallbackPolicy\s*:\s*['"]always['"]/.test(source)) {
      violations.push(`${file}: unconditional frontend fallback policy is forbidden`);
    }
  }
}

for (const file of productionFiles) {
  const source = read(file);
  const forbiddenPatterns = [
    [/\bcreateInMemoryBroker\b/, 'in-memory event broker'],
    [/\bInMemoryBroker\b/, 'in-memory event handler'],
    [/mock-provider-id/i, 'mock payment provider id'],
    [/Mock successful/i, 'mock payment behavior'],
    [/return true;\s*\/\/\s*Mock/i, 'mock success return'],
    [/return false;\s*\/\/\s*Mock/i, 'mock false return'],
  ];

  for (const [pattern, label] of forbiddenPatterns) {
    if (pattern.test(source)) {
      violations.push(`${file}: ${label} is forbidden in production runtime`);
    }
  }
}

if (violations.length > 0) {
  console.error('Production boundary validation failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Production boundary validation passed.');
