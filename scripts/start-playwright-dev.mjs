import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = path.join(workspaceRoot, 'dist', 'index.html');
const buildMarker = path.join(workspaceRoot, 'dist', '.playwright-e2e-build.json');
const viteBin = path.join(workspaceRoot, 'node_modules', 'vite', 'bin', 'vite.js');

const useDemoData = process.env.PLAYWRIGHT_USE_DEMO_DATA === 'true';
const forceDevServer = process.env.PLAYWRIGHT_USE_DEV_SERVER === 'true';
const skipBuild = process.env.PLAYWRIGHT_SKIP_BUILD === 'true';
const playwrightEnv = {
  ...process.env,
  VITE_ENABLE_DEMO_DATA: useDemoData ? 'true' : 'false',
  VITE_E2E_LOCAL_AUTH: 'true',
};

const buildInputs = [
  'index.html',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'src',
  'public',
].map(input => path.join(workspaceRoot, input));

function getLatestMtimeMs(target) {
  if (!existsSync(target)) return 0;

  const stats = statSync(target);
  if (!stats.isDirectory()) return stats.mtimeMs;

  return readdirSync(target, { withFileTypes: true }).reduce((latest, entry) => {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
      return latest;
    }

    return Math.max(latest, getLatestMtimeMs(path.join(target, entry.name)));
  }, stats.mtimeMs);
}

function readBuildMarker() {
  if (!existsSync(buildMarker)) return null;

  try {
    return JSON.parse(readFileSync(buildMarker, 'utf8'));
  } catch {
    return null;
  }
}

const latestInputMtimeMs = Math.max(...buildInputs.map(getLatestMtimeMs));
const marker = readBuildMarker();
const markerMatchesEnv =
  marker?.viteE2eLocalAuth === playwrightEnv.VITE_E2E_LOCAL_AUTH &&
  marker?.viteEnableDemoData === playwrightEnv.VITE_ENABLE_DEMO_DATA;
const shouldBuild =
  !forceDevServer &&
  !skipBuild &&
  (!existsSync(distIndex) ||
    !markerMatchesEnv ||
    typeof marker?.builtAtMs !== 'number' ||
    marker.builtAtMs < latestInputMtimeMs);

if (shouldBuild) {
  const build = spawnSync(process.execPath, [viteBin, 'build'], {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: playwrightEnv,
  });

  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }

  writeFileSync(
    buildMarker,
    `${JSON.stringify(
      {
        builtAtMs: Date.now(),
        viteE2eLocalAuth: playwrightEnv.VITE_E2E_LOCAL_AUTH,
        viteEnableDemoData: playwrightEnv.VITE_ENABLE_DEMO_DATA,
      },
      null,
      2,
    )}\n`,
  );
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
