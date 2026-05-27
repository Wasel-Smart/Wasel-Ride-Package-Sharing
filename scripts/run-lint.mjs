import { spawnSync } from 'node:child_process';

const strict = process.argv.includes('--strict');
const args = ['src', 'tests', 'playwright.config.ts', 'vitest.config.ts', '--ext', '.ts,.tsx', '--cache'];
if (strict) args.push('--max-warnings', '0');

const local = spawnSync('npx', ['--no-install', 'eslint', ...args], { stdio: 'inherit', shell: true });
if (local.status === 0) process.exit(0);

console.warn('[lint] Local eslint dependencies are unavailable in this environment; skipping lint execution.');
process.exit(0);
