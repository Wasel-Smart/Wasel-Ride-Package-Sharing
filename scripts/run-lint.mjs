import { spawnSync } from 'node:child_process';

const strict = process.argv.includes('--strict') || process.argv.includes('--max-warnings');
const allowToolSkip = process.env.WASEL_ALLOW_TOOL_SKIP === 'true';
const args = ['src', 'tests', 'playwright.config.ts', 'vitest.config.ts', '--ext', '.ts,.tsx', '--cache'];
if (strict) args.push('--max-warnings', '0');

const local = spawnSync('npx', ['--no-install', 'eslint', ...args], { stdio: 'inherit', shell: true });
if (local.status === 0) process.exit(0);

const status = local.status ?? 1;
const message = '[lint] ESLint failed or local dependencies are unavailable. Install dependencies with `npm ci` and rerun lint.';
if (allowToolSkip) {
  console.warn(`${message} Continuing because WASEL_ALLOW_TOOL_SKIP=true.`);
  process.exit(0);
}

console.error(message);
process.exit(status);
