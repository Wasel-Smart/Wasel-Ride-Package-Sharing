import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const activePaths = [
  'src/App.tsx',
  'src/components/app/ErrorBoundary.tsx',
  'src/components/app/AppShell.tsx',
  'src/components/MobileBottomNav.tsx',
  'src/features/profile/ProfilePage.tsx',
  'src/layouts/WaselRoot.tsx',
  'src/wasel-routes.tsx',
  'src/app',
  'src/design-system/components',
];

const colorLiteralPattern = /#[0-9a-fA-F]{3,8}\b|(?:rgb|hsl)a?\(/;
const inlineStylePattern = /\bstyle=\{\{/;

function collectFiles(targetPath) {
  const absolutePath = join(root, targetPath);
  const stats = statSync(absolutePath);

  if (stats.isFile()) {
    return [absolutePath];
  }

  const entries = readdirSync(absolutePath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const next = join(targetPath, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(next);
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) {
      return [];
    }

    return [join(root, next)];
  });
}

const failures = [];

for (const targetPath of activePaths) {
  for (const filePath of collectFiles(targetPath)) {
    const contents = readFileSync(filePath, 'utf8');

    if (inlineStylePattern.test(contents)) {
      failures.push(`${relative(root, filePath)} uses inline styles.`);
    }

    if (colorLiteralPattern.test(contents)) {
      failures.push(`${relative(root, filePath)} contains hardcoded color literals.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Design-system enforcement failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Design-system enforcement passed.');
