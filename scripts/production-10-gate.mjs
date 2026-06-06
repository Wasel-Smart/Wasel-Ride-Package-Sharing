import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const artifactsDir = join(root, 'artifacts', 'production-gate');
mkdirSync(artifactsDir, { recursive: true });

const runtimeSourceGlobs = [
  'backend/**/*.ts',
  'src/**/*.ts',
  'src/**/*.tsx',
  'supabase/functions/**/*.ts',
];

const allowedFallbackPatterns = [
  /Suspense fallback=/,
  /avatar-fallback/,
  /ErrorBoundary/,
  /safeJSONParse/,
  /fallbackOffset/,
  /fallback: string/,
  /fallback = /,
  /fallback\?:/,
  /clipboard/i,
  /auth error/i,
];

const checks = [];

function record(name, status, evidence, details = []) {
  checks.push({ name, status, evidence, details });
}

async function run(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: options.cwd ?? root,
      timeout: options.timeout ?? 120_000,
      maxBuffer: 1024 * 1024 * 10,
      shell: false,
    });
    return {
      ok: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.trim() ?? '',
      stderr: error.stderr?.trim() ?? error.message,
      code: error.code,
    };
  }
}

async function rg(pattern, paths, extraArgs = []) {
  const args = ['-n', pattern, ...extraArgs, ...paths];
  return run('rg', args, { timeout: 120_000 });
}

function hasAllowedFallback(line) {
  return allowedFallbackPatterns.some(pattern => pattern.test(line));
}

async function checkBackendBuild() {
  const command = process.platform === 'win32' ? 'powershell' : 'npm';
  const args =
    process.platform === 'win32'
      ? ['-NoProfile', '-Command', 'npm run build']
      : ['run', 'build'];
  const result = await run(command, args, {
    cwd: join(root, 'backend'),
    timeout: 180_000,
  });
  record(
    'backend-production-build',
    result.ok ? 'pass' : 'fail',
    result.ok ? 'backend TypeScript production service build passed' : result.stderr,
  );
}

async function checkRuntimeTools() {
  const docker = await run('docker', ['--version'], { timeout: 30_000 });
  record(
    'docker-runtime-available',
    docker.ok ? 'pass' : 'fail',
    docker.ok ? docker.stdout : 'docker CLI is not installed or not on PATH',
  );

  const kubectl = await run('kubectl', ['config', 'current-context'], { timeout: 30_000 });
  record(
    'kubernetes-runtime-available',
    kubectl.ok ? 'pass' : 'fail',
    kubectl.ok ? `current context: ${kubectl.stdout}` : 'kubectl is not installed or not on PATH',
  );

  if (kubectl.ok) {
    const pods = await run(
      'kubectl',
      ['get', 'pods', '-n', 'wasel-production', '-o', 'wide'],
      { timeout: 60_000 },
    );
    record(
      'kubernetes-production-pods',
      pods.ok ? 'pass' : 'fail',
      pods.ok ? pods.stdout : pods.stderr,
    );
  }
}

async function checkDirectDbAccess() {
  const result = await rg(
    'supabase\\.from|createClient\\(',
    ['src', 'mobile'],
    ['-g', '*.ts', '-g', '*.tsx'],
  );

  const lines = result.stdout
    ? result.stdout.split(/\r?\n/).filter(line => !line.includes('src/utils/supabase/client.ts'))
    : [];

  record(
    'frontend-direct-db-access',
    lines.length === 0 ? 'pass' : 'fail',
    lines.length === 0
      ? 'no frontend direct Supabase query paths found'
      : `${lines.length} direct frontend DB/client access findings`,
    lines.slice(0, 100),
  );
}

async function checkMockFallbackRuntimePaths() {
  const result = await rg(
    'mock|stub|fallback|simulation|simulate|demo',
    runtimeSourceGlobs,
    ['-i'],
  );

  const lines = result.stdout
    ? result.stdout
        .split(/\r?\n/)
        .filter(line => !line.includes('tests/'))
        .filter(line => !line.includes('node_modules'))
        .filter(line => !hasAllowedFallback(line))
    : [];

  record(
    'mock-fallback-runtime-paths',
    lines.length === 0 ? 'pass' : 'fail',
    lines.length === 0
      ? 'no disallowed mock/fallback/demo runtime paths found'
      : `${lines.length} mock/fallback/demo runtime findings require removal or explicit production isolation`,
    lines.slice(0, 150),
  );
}

async function checkRedisStreamsDurability() {
  const brokerPath = join(root, 'src', 'platform', 'event-broker-redis-production.ts');
  const broker = readFileSync(brokerPath, 'utf8');
  const required = ['xadd', 'xreadgroup', 'xack', 'xpending', 'xclaim', ':dlq'];
  const missing = required.filter(token => !broker.toLowerCase().includes(token.toLowerCase()));

  record(
    'redis-streams-durable-contract',
    missing.length === 0 ? 'pass' : 'fail',
    missing.length === 0
      ? 'production Redis broker includes publish, consumer groups, ack, pending recovery, claim, and DLQ'
      : `missing Redis durability tokens: ${missing.join(', ')}`,
  );
}

async function checkDockerfiles() {
  const required = [
    'backend/services/ride-matching/Dockerfile.production',
    'backend/services/payment-reconciliation/Dockerfile.production',
    'backend/services/ops-analytics/Dockerfile.production',
  ];
  const missing = required.filter(path => !existsSync(join(root, path)));
  record(
    'independent-service-dockerfiles',
    missing.length === 0 ? 'pass' : 'fail',
    missing.length === 0 ? 'production Dockerfiles exist for core backend services' : missing.join(', '),
  );
}

async function checkPaymentContracts() {
  const service = readFileSync(
    join(root, 'backend', 'services', 'payment-reconciliation', 'service-production.ts'),
    'utf8',
  );
  const required = ['Stripe', 'paymentIntents.capture', 'refunds.create', 'idempotencyKey'];
  const missing = required.filter(token => !service.includes(token));
  record(
    'payment-lifecycle-contract',
    missing.length === 0 ? 'pass' : 'fail',
    missing.length === 0
      ? 'payment service contains Stripe capture, refund, and idempotency contract'
      : `missing payment contract tokens: ${missing.join(', ')}`,
  );
}

async function checkLoadTooling() {
  const k6 = await run('k6', ['version'], { timeout: 30_000 });
  const scriptsPresent =
    existsSync(join(root, 'tests', 'load', 'k6-production.js')) &&
    existsSync(join(root, 'tests', 'load', 'k6-smoke.js'));
  record(
    'load-test-execution-ready',
    k6.ok && scriptsPresent ? 'pass' : 'fail',
    k6.ok
      ? `k6 available: ${k6.stdout}`
      : `k6 is unavailable; scripts present: ${scriptsPresent}`,
  );
}

function writeReports() {
  const failed = checks.filter(check => check.status !== 'pass');
  const score = Math.round(((checks.length - failed.length) / checks.length) * 100) / 10;
  const result = {
    generatedAt: new Date().toISOString(),
    scoreOutOf10: score,
    certified10Of10: failed.length === 0,
    checks,
  };

  writeFileSync(
    join(artifactsDir, 'production-gate-report.json'),
    JSON.stringify(result, null, 2),
  );

  const markdown = [
    '# Wasel Production Gate Report',
    '',
    `Generated: ${result.generatedAt}`,
    `Evidence-based score: ${score}/10`,
    `10/10 certified: ${result.certified10Of10 ? 'yes' : 'no'}`,
    '',
    '## Checks',
    '',
    ...checks.flatMap(check => [
      `### ${check.status === 'pass' ? 'PASS' : 'FAIL'} - ${check.name}`,
      '',
      check.evidence,
      '',
      ...(check.details.length ? ['```text', ...check.details, '```', ''] : []),
    ]),
  ].join('\n');

  writeFileSync(join(artifactsDir, 'production-gate-report.md'), markdown);

  console.log(markdown);
  process.exitCode = failed.length === 0 ? 0 : 1;
}

await checkBackendBuild();
await checkRuntimeTools();
await checkDockerfiles();
await checkRedisStreamsDurability();
await checkPaymentContracts();
await checkDirectDbAccess();
await checkMockFallbackRuntimePaths();
await checkLoadTooling();
writeReports();
