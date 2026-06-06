import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = path.join(workspaceRoot, 'dist', 'index.html');
const viteBin = path.join(workspaceRoot, 'node_modules', 'vite', 'bin', 'vite.js');

const useDemoData = process.env.PLAYWRIGHT_USE_DEMO_DATA === 'true';
const forceDevServer = process.env.PLAYWRIGHT_USE_DEV_SERVER === 'true';
const skipBuild = process.env.PLAYWRIGHT_SKIP_BUILD === 'true';
const playwrightEnv = {
  ...process.env,
  VITE_ENABLE_DEMO_DATA: useDemoData ? 'true' : 'false',
  VITE_E2E_LOCAL_AUTH: 'true',
};

if (!forceDevServer && (!skipBuild || !existsSync(distIndex))) {
  const build = spawnSync(process.execPath, [viteBin, 'build'], {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: playwrightEnv,
  });

  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

const command = process.execPath;
const args = forceDevServer
  ? [viteBin, '--host', '127.0.0.1', '--port', '4173']
  : [viteBin, 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'];

const child = spawn(command, args, {
  cwd: workspaceRoot,
  stdio: 'inherit',
  env: playwrightEnv,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
