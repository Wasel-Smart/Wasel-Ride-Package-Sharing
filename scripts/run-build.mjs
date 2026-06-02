import { spawnSync } from 'node:child_process';

const allowToolSkip = process.env.WASEL_ALLOW_TOOL_SKIP === 'true';

const tsc = spawnSync('tsc', ['--noEmit', '-p', 'tsconfig.check.json'], { stdio: 'inherit', shell: true });
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

const vite = spawnSync('npx', ['--no-install', 'vite', 'build'], { stdio: 'inherit', shell: true });
if (vite.status === 0) process.exit(0);

const status = vite.status ?? 1;
const message = '[build] Vite production build failed or local dependencies are unavailable. Install dependencies with `npm ci` and rerun build.';
if (allowToolSkip) {
  console.warn(`${message} Continuing after TypeScript validation because WASEL_ALLOW_TOOL_SKIP=true.`);
  process.exit(0);
}

console.error(message);
process.exit(status);
