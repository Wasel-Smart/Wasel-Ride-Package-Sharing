import { spawnSync } from 'node:child_process';

const allowToolSkip = process.env.WASEL_ALLOW_TOOL_SKIP === 'true';
const result = spawnSync('npx', ['--no-install', 'vitest', 'run', '--config', 'vitest.config.ts'], { stdio: 'inherit', shell: true });
if (result.status === 0) process.exit(0);

const status = result.status ?? 1;
const message = '[test] Vitest failed or local dependencies are unavailable. Install dependencies with `npm ci` and rerun tests.';
if (allowToolSkip) {
  console.warn(`${message} Continuing because WASEL_ALLOW_TOOL_SKIP=true.`);
  process.exit(0);
}

console.error(message);
process.exit(status);
