import { spawn } from 'node:child_process';

const useDemoData = process.env.PLAYWRIGHT_USE_DEMO_DATA === 'true';
const port = process.env.PLAYWRIGHT_PORT ?? '4173';
const args = ['run', 'dev', '--', '--host', '127.0.0.1', '--port', port];
const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'npm';
const commandArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', `npm ${args.join(' ')}`]
  : args;

const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_ENABLE_DEMO_DATA: useDemoData ? 'true' : 'false',
    VITE_E2E_LOCAL_AUTH: 'true',
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
