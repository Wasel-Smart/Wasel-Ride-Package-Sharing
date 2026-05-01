import { spawn } from 'node:child_process';

const useDemoData = process.env.PLAYWRIGHT_USE_DEMO_DATA === 'true';

const child = spawn('npm run dev -- --host 127.0.0.1 --port 4173', {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    VITE_ENABLE_DEMO_DATA: useDemoData ? 'true' : 'false',
    VITE_E2E_LOCAL_AUTH: 'true',
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
