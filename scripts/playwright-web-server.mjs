import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const HOST = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const PORT = process.env.PLAYWRIGHT_PORT ?? '4273';
const OUT_DIR = process.env.PLAYWRIGHT_OUT_DIR ?? '.playwright-dist';
const viteBin = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');

const env = {
  ...process.env,
  VITE_APP_ENV: 'test',
  VITE_APP_URL: 'https://wasel.test',
  VITE_SUPABASE_URL: 'https://wasel-test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'playwright-e2e-anon-key',
  VITE_EDGE_FUNCTION_NAME: '',
  VITE_API_URL: '',
  VITE_ENABLE_DEMO_DATA: 'false',
  VITE_ENABLE_SYNTHETIC_TRIPS: 'false',
  VITE_ENABLE_LOCAL_AUTH: 'true',
  VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'true',
  VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK: 'false',
  VITE_ENABLE_FAKE_PAYMENTS: 'false',
  VITE_ENABLE_FAKE_BUS_BOOKINGS: 'false',
  VITE_ENABLE_BUS: 'false',
  VITE_ENABLE_TWO_FACTOR_AUTH: 'false',
  VITE_ENABLE_EMAIL_NOTIFICATIONS: 'true',
  VITE_ENABLE_SMS_NOTIFICATIONS: 'true',
  VITE_ENABLE_WHATSAPP_NOTIFICATIONS: 'true',
  VITE_SUPPORT_EMAIL: 'support@wasel.jo',
};

function runVite(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [viteBin, ...args], {
      stdio: 'inherit',
      env,
      cwd: process.cwd(),
      shell: false,
    });

    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`vite ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

let previewChild = null;
let shuttingDown = false;

function terminateProcessTree(child) {
  if (!child?.pid) {
    return;
  }

  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      return;
    } catch {}
  }

  child.kill('SIGTERM');
}

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (previewChild && !previewChild.killed) {
    terminateProcessTree(previewChild);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);

async function main() {
  await runVite(['build', '--mode', 'test', '--outDir', OUT_DIR, '--emptyOutDir']);

  previewChild = spawn(
    process.execPath,
    [viteBin, 'preview', '--host', HOST, '--port', PORT, '--strictPort', '--outDir', OUT_DIR],
    {
      stdio: ['ignore', 'inherit', 'inherit'],
      env,
      cwd: process.cwd(),
      shell: false,
    },
  );

  previewChild.once('error', error => {
    console.error(error);
    process.exitCode = 1;
  });

  previewChild.once('exit', code => {
    process.exit(code ?? 0);
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
