import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.resolve(workspaceRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const cliArgs = process.argv.slice(2);
const host = readCliOption('host') ?? process.env.HOST ?? '127.0.0.1';
const port = Number.parseInt(readCliOption('port') ?? process.env.PORT ?? '3002', 10);

if (!Number.isInteger(port) || port <= 0) {
  console.error(`[dev-server] Invalid port: ${String(port)}`);
  process.exit(1);
}

function readCliOption(name) {
  const flag = `--${name}`;

  for (let index = 0; index < cliArgs.length; index += 1) {
    const value = cliArgs[index];
    if (value === flag) {
      return cliArgs[index + 1];
    }

    if (value.startsWith(`${flag}=`)) {
      return value.slice(flag.length + 1);
    }
  }

  return null;
}

function runCommand(command, args) {
  return spawnSync(command, args, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

function runPowerShell(command) {
  return runCommand('powershell', ['-NoProfile', '-Command', command]);
}

function isPortAvailable(targetPort, targetHost) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();

    server.once('error', error => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.listen(targetPort, targetHost, () => {
      server.close(() => resolve(true));
    });
  });
}

function listListeningPids(targetPort) {
  if (process.platform === 'win32') {
    const result = runPowerShell(
      `$pids = Get-NetTCPConnection -LocalPort ${targetPort} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($pids) { $pids }`,
    );

    return parsePidList(result.stdout);
  }

  const result = runCommand('lsof', ['-n', `-iTCP:${targetPort}`, '-sTCP:LISTEN', '-t']);
  return parsePidList(result.stdout);
}

function parsePidList(output) {
  return String(output ?? '')
    .split(/\r?\n/)
    .map(value => Number.parseInt(value.trim(), 10))
    .filter(value => Number.isInteger(value) && value > 0);
}

function getProcessDetails(pid) {
  if (process.platform === 'win32') {
    const result = runPowerShell(
      `$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue | Select-Object ProcessId,Name,CommandLine; if ($process) { $process | ConvertTo-Json -Compress }`,
    );

    if (!result.stdout.trim()) {
      return { pid, name: '', commandLine: '' };
    }

    try {
      const parsed = JSON.parse(result.stdout);
      return {
        pid,
        name: String(parsed.Name ?? ''),
        commandLine: String(parsed.CommandLine ?? ''),
      };
    } catch {
      return { pid, name: '', commandLine: result.stdout.trim() };
    }
  }

  const result = runCommand('ps', ['-p', String(pid), '-o', 'comm=', '-o', 'args=']);
  const [name = '', ...commandLine] = String(result.stdout ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    pid,
    name,
    commandLine: commandLine.join(' '),
  };
}

function isTrustedStaleProcess(details) {
  const name = details.name.toLowerCase();
  const commandLine = details.commandLine.toLowerCase();

  if (!name.includes('node')) {
    return false;
  }

  if (!commandLine) {
    return true;
  }

  return [
    workspaceRoot.toLowerCase(),
    'vite',
    'npm run dev',
    'vite.js',
    '--port 3002',
  ].some(marker => commandLine.includes(marker));
}

function stopProcess(pid) {
  if (process.platform === 'win32') {
    const result = runCommand('taskkill', ['/PID', String(pid), '/T', '/F']);
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || `taskkill failed for PID ${pid}`);
    }
    return;
  }

  const result = runCommand('kill', ['-TERM', String(pid)]);
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `kill failed for PID ${pid}`);
  }
}

function describeProcess(details) {
  const commandLine = details.commandLine.trim();
  return commandLine
    ? `${details.name || 'process'} (${details.pid}): ${commandLine}`
    : `${details.name || 'process'} (${details.pid})`;
}

async function ensurePortReady(targetPort, targetHost) {
  if (await isPortAvailable(targetPort, targetHost)) {
    return;
  }

  const pidList = listListeningPids(targetPort);
  const processDetails = pidList.map(getProcessDetails);

  if (!processDetails.length) {
    throw new Error(`Port ${targetPort} is busy, but the owning process could not be detected.`);
  }

  const untrustedProcess = processDetails.find(details => !isTrustedStaleProcess(details));
  if (untrustedProcess) {
    throw new Error(
      `Port ${targetPort} is already in use by ${describeProcess(untrustedProcess)}. Stop it or run dev on another port.`,
    );
  }

  for (const details of processDetails) {
    console.warn(`[dev-server] Reclaiming port ${targetPort} from ${describeProcess(details)}.`);
    stopProcess(details.pid);
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await isPortAvailable(targetPort, targetHost)) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  throw new Error(`Port ${targetPort} is still busy after stopping the previous dev process.`);
}

async function main() {
  await ensurePortReady(port, host);

  const child = spawn(process.execPath, [viteBin, '--host', host, '--port', String(port), '--strictPort', ...cliArgs], {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
    windowsHide: false,
  });

  child.on('exit', code => {
    process.exit(code ?? 0);
  });
}

main().catch(error => {
  console.error(`[dev-server] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
