import { spawnSync } from 'node:child_process';

const args = ['--no-install', 'vitest', 'run', '--config', 'vitest.config.ts', ...process.argv.slice(2)];
const result = spawnSync('npx', args, { stdio: 'inherit', shell: true });
if (result.status === 0) process.exit(0);

console.error('[test] Vitest failed or local dependencies are unavailable. Run `npm ci` and fix test failures.');
process.exit(result.status ?? 1);
