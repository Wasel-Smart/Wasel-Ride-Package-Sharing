import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const targetUrl = process.argv[2] ?? process.env.BASE_URL ?? 'https://wasel14.online/health';
const totalRequests = Number(process.env.LOAD_TOTAL_REQUESTS ?? 60);
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 6);
const timeoutMs = Number(process.env.LOAD_TIMEOUT_MS ?? 10_000);
const artifactsDir = join(process.cwd(), 'artifacts', 'load');

mkdirSync(artifactsDir, { recursive: true });

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

async function requestOnce(index) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'wasel-load-smoke/1.0',
        'X-Wasel-Load-Request': String(index),
      },
    });
    const body = await response.text();
    const durationMs = performance.now() - startedAt;
    const contentType = response.headers.get('content-type') ?? undefined;
    const traceId = response.headers.get('x-wasel-trace-id') ?? undefined;
    const requiresHealthJson = new URL(targetUrl).pathname.endsWith('/health');
    const validHealthJson =
      !requiresHealthJson ||
      (contentType?.includes('application/json') &&
        Boolean(traceId) &&
        (() => {
          try {
            const payload = JSON.parse(body);
            return payload.status === 'ok' && payload.service === 'wasel-web' && payload.traceId === traceId;
          } catch {
            return false;
          }
        })());

    return {
      ok: response.ok && validHealthJson,
      status: response.status,
      durationMs,
      traceId,
      contentType,
      bodySample: body.slice(0, 120),
      validation: validHealthJson ? 'pass' : 'fail',
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: performance.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

const results = [];
let next = 0;

async function worker() {
  while (next < totalRequests) {
    const current = next;
    next += 1;
    results.push(await requestOnce(current + 1));
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const latencies = results.map(result => result.durationMs);
const failures = results.filter(result => !result.ok);
const statusCounts = results.reduce((counts, result) => {
  counts[result.status] = (counts[result.status] ?? 0) + 1;
  return counts;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  targetUrl,
  totalRequests,
  concurrency,
  passed: failures.length === 0,
  errorRate: Math.round((failures.length / results.length) * 10_000) / 100,
  latencyMs: {
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: Math.round(Math.max(...latencies) * 100) / 100,
  },
  statusCounts,
  traceIdsObserved: results.filter(result => result.traceId).length,
  failures: failures.slice(0, 10),
};

writeFileSync(join(artifactsDir, 'node-smoke-report.json'), JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));

if (!report.passed) {
  process.exitCode = 1;
}
