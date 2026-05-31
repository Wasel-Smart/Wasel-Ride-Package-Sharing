import { spawnSync } from 'node:child_process';

const tsc = spawnSync('npx', ['--no-install', 'tsc', '--noEmit', '-p', 'tsconfig.json'], { stdio: 'inherit', shell: true });
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

const vite = spawnSync('npx', ['--no-install', 'vite', 'build'], { stdio: 'inherit', shell: true });
if (vite.status === 0) process.exit(0);

console.error('[build] Vite build failed or local dependencies are unavailable. Run `npm ci` and fix build errors.');
process.exit(vite.status ?? 1);
