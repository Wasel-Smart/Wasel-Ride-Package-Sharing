import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  }),
);

function readJsonIfExists(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return null;
  }
}

function collectBundleMetrics() {
  const assetsDir = path.join(ROOT, 'dist', 'assets');
  if (!fs.existsSync(assetsDir)) {
    return null;
  }

  function collectJsFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectJsFiles(fullPath);
      }
      return entry.name.endsWith('.js') ? [fullPath] : [];
    });
  }

  const chunks = collectJsFiles(assetsDir)
    .map((filePath) => {
      const size = fs.statSync(filePath).size;
      return {
        file: path.relative(assetsDir, filePath).replace(/\\/g, '/'),
        bytes: size,
        kilobytes: Number((size / 1024).toFixed(2)),
      };
    })
    .sort((left, right) => right.bytes - left.bytes);

  return {
    totalJsBytes: chunks.reduce((sum, chunk) => sum + chunk.bytes, 0),
    largestChunks: chunks.slice(0, 10),
    overBudgetChunks: chunks.filter((chunk) => chunk.bytes > 200 * 1024),
  };
}

function collectCoverageMetrics() {
  const summary = readJsonIfExists('coverage/coverage-summary.json');
  if (!summary?.total) {
    return null;
  }

  return {
    lines: summary.total.lines.pct,
    branches: summary.total.branches.pct,
    statements: summary.total.statements.pct,
    functions: summary.total.functions.pct,
  };
}

function collectVitestMetrics() {
  const results = readJsonIfExists('vitest-results.json');
  if (!results) {
    return null;
  }

  return {
    status: typeof results.success === 'boolean'
      ? (results.success ? 'passed' : 'failed')
      : 'unknown',
    suites: {
      total: results.numTotalTestSuites ?? null,
      passed: results.numPassedTestSuites ?? null,
      failed: results.numFailedTestSuites ?? null,
      pending: results.numPendingTestSuites ?? null,
    },
    tests: {
      total: results.numTotalTests ?? null,
      passed: results.numPassedTests ?? null,
      failed: results.numFailedTests ?? null,
      pending: results.numPendingTests ?? null,
      todo: results.numTodoTests ?? null,
    },
  };
}

function collectPlaywrightMetrics() {
  const results = readJsonIfExists('playwright-report/results.json');
  if (!results) {
    return null;
  }

  const stats = results.stats ?? {};
  const status = typeof results.status === 'string'
    ? results.status
    : typeof stats.unexpected === 'number'
      ? (stats.unexpected > 0 ? 'failed' : 'passed')
      : 'unknown';

  return {
    status,
    expected: stats.expected ?? null,
    unexpected: stats.unexpected ?? null,
    flaky: stats.flaky ?? null,
    skipped: stats.skipped ?? null,
  };
}

function collectLighthouseMetrics() {
  const manifest = readJsonIfExists('.lighthouseci/manifest.json');
  if (Array.isArray(manifest) && manifest.length > 0) {
    return manifest.map((entry) => ({
      url: entry.url ?? null,
      isRepresentativeRun: Boolean(entry.isRepresentativeRun),
      summary: entry.summary ?? null,
    }));
  }

  const lighthouseDir = path.join(ROOT, '.lighthouseci');
  if (!fs.existsSync(lighthouseDir)) {
    return null;
  }

  const lhrReports = fs.readdirSync(lighthouseDir)
    .filter((fileName) => /^lhr-.*\.json$/i.test(fileName))
    .map((fileName) => readJsonIfExists(path.join('.lighthouseci', fileName)))
    .filter(Boolean);

  if (lhrReports.length === 0) {
    return null;
  }

  return lhrReports.map((report, index) => ({
    url: report.finalDisplayedUrl ?? report.requestedUrl ?? null,
    isRepresentativeRun: index === 0,
    summary: {
      performance: report.categories?.performance?.score ?? null,
      accessibility: report.categories?.accessibility?.score ?? null,
      bestPractices: report.categories?.['best-practices']?.score ?? null,
      seo: report.categories?.seo?.score ?? null,
      pwa: report.categories?.pwa?.score ?? null,
    },
  }));
}

function inferTestStatus(explicitStatus, vitestMetrics) {
  if (explicitStatus) {
    return explicitStatus;
  }

  return vitestMetrics?.status ?? 'unknown';
}

const vitest = collectVitestMetrics();

const report = {
  generatedAt: new Date().toISOString(),
  testStatus: inferTestStatus(args.get('test-status'), vitest),
  vitest,
  coverage: collectCoverageMetrics(),
  bundle: collectBundleMetrics(),
  playwright: collectPlaywrightMetrics(),
  lighthouse: collectLighthouseMetrics(),
};

const outputPath = path.join(ROOT, args.get('output') ?? 'quality-report.json');
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(`Quality report written to ${path.relative(ROOT, outputPath)}`);
