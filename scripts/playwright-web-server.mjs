import { spawn } from 'node:child_process';

const HOST = '127.0.0.1';
const PORT = '4173';
const isWindows = process.platform === 'win32';

const env = {
  ...process.env,
  VITE_APP_ENV: 'test',
  VITE_APP_URL: 'https://wasel.test',
  VITE_SUPABASE_URL: 'https://wasel-test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'playwright-e2e-anon-key',
  VITE_EDGE_FUNCTION_NAME: '',
  VITE_API_URL: '',
  VITE_ENABLE_DEMO_DATA: 'true',
  VITE_ENABLE_SYNTHETIC_TRIPS: 'false',
  VITE_ALLOW_DIRECT_SUPABASE_FALLBACK: 'true',
  VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK: 'true',
  VITE_ENABLE_FAKE_PAYMENTS: 'true',
  VITE_ENABLE_FAKE_BUS_BOOKINGS: 'true',
  VITE_ENABLE_PERSISTED_TEST_AUTH: 'true',
  VITE_ENABLE_TWO_FACTOR_AUTH: 'false',
  VITE_ENABLE_EMAIL_NOTIFICATIONS: 'true',
  VITE_ENABLE_SMS_NOTIFICATIONS: 'true',
  VITE_ENABLE_WHATSAPP_NOTIFICATIONS: 'true',
  VITE_SUPPORT_EMAIL: 'support@wasel.jo',
};

function runNpx(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(isWindows ? process.env.ComSpec ?? 'cmd.exe' : 'npx', isWindows ? ['/d', '/s', '/c', `npx ${args.join(' ')}`] : args, {
      stdio: 'inherit',
      env,
      shell: false,
    });

    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`npx ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

let previewChild = null;

function shutdown(signal) {
  if (previewChild && !previewChild.killed) {
    previewChild.kill(signal);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', () => shutdown('SIGTERM'));

async function main() {
  await runNpx(['vite', 'build', '--mode', 'test']);

  previewChild = spawn(isWindows ? process.env.ComSpec ?? 'cmd.exe' : 'npx', isWindows ? ['/d', '/s', '/c', `npx vite preview --host ${HOST} --port ${PORT} --strictPort`] : ['vite', 'preview', '--host', HOST, '--port', PORT, '--strictPort'], {
    stdio: 'inherit',
    env,
    shell: false,
  });

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
