import { spawnSync } from 'node:child_process';

const strict = process.argv.includes('--strict');
const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== '--strict' && arg !== '--');
const args = [
  'src',
  'tests',
  'playwright.config.ts',
  'vitest.config.ts',
  '--ext',
  '.ts,.tsx',
  '--cache',
  ...passthroughArgs,
];
if (strict && !args.includes('--max-warnings')) args.push('--max-warnings', '0');

const result = spawnSync('npx', ['--no-install', 'eslint', ...args], { stdio: 'inherit', shell: true });
if (result.status === 0) process.exit(0);

console.error('[lint] ESLint failed or local dependencies are unavailable. Run `npm ci` and fix lint errors.');
process.exit(result.status ?? 1);
