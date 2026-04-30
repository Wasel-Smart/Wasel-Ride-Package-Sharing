import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

if (args.length < 3) {
  console.error(
    'Usage: node scripts/merge-vitest-results.mjs <input-a.json> <input-b.json> [...input-n.json] <output.json>',
  );
  process.exit(1);
}

const outputPath = path.resolve(args.at(-1));
const inputPaths = args.slice(0, -1).map((filePath) => path.resolve(filePath));

const reports = inputPaths.map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')));

const merged = {
  numTotalTestSuites: 0,
  numPassedTestSuites: 0,
  numFailedTestSuites: 0,
  numPendingTestSuites: 0,
  numTotalTests: 0,
  numPassedTests: 0,
  numFailedTests: 0,
  numPendingTests: 0,
  numTodoTests: 0,
  snapshot: {
    added: 0,
    failure: false,
    filesAdded: 0,
    filesRemoved: 0,
    filesRemovedList: [],
    filesUnmatched: 0,
    filesUpdated: 0,
    matched: 0,
    total: 0,
    unchecked: 0,
    uncheckedKeysByFile: [],
    unmatched: 0,
    updated: 0,
    didUpdate: false,
  },
  startTime: reports.reduce(
    (earliest, report) =>
      typeof report.startTime === 'number' && report.startTime < earliest
        ? report.startTime
        : earliest,
    Number.POSITIVE_INFINITY,
  ),
  success: true,
  testResults: [],
};

for (const report of reports) {
  merged.numTotalTestSuites += report.numTotalTestSuites ?? 0;
  merged.numPassedTestSuites += report.numPassedTestSuites ?? 0;
  merged.numFailedTestSuites += report.numFailedTestSuites ?? 0;
  merged.numPendingTestSuites += report.numPendingTestSuites ?? 0;
  merged.numTotalTests += report.numTotalTests ?? 0;
  merged.numPassedTests += report.numPassedTests ?? 0;
  merged.numFailedTests += report.numFailedTests ?? 0;
  merged.numPendingTests += report.numPendingTests ?? 0;
  merged.numTodoTests += report.numTodoTests ?? 0;

  merged.snapshot.added += report.snapshot?.added ?? 0;
  merged.snapshot.failure ||= Boolean(report.snapshot?.failure);
  merged.snapshot.filesAdded += report.snapshot?.filesAdded ?? 0;
  merged.snapshot.filesRemoved += report.snapshot?.filesRemoved ?? 0;
  merged.snapshot.filesRemovedList.push(...(report.snapshot?.filesRemovedList ?? []));
  merged.snapshot.filesUnmatched += report.snapshot?.filesUnmatched ?? 0;
  merged.snapshot.filesUpdated += report.snapshot?.filesUpdated ?? 0;
  merged.snapshot.matched += report.snapshot?.matched ?? 0;
  merged.snapshot.total += report.snapshot?.total ?? 0;
  merged.snapshot.unchecked += report.snapshot?.unchecked ?? 0;
  merged.snapshot.uncheckedKeysByFile.push(...(report.snapshot?.uncheckedKeysByFile ?? []));
  merged.snapshot.unmatched += report.snapshot?.unmatched ?? 0;
  merged.snapshot.updated += report.snapshot?.updated ?? 0;
  merged.snapshot.didUpdate ||= Boolean(report.snapshot?.didUpdate);

  merged.success &&= Boolean(report.success);
  merged.testResults.push(...(report.testResults ?? []));
}

if (!Number.isFinite(merged.startTime)) {
  merged.startTime = Date.now();
}

merged.testResults.sort((left, right) => {
  const leftName = left?.name ?? '';
  const rightName = right?.name ?? '';
  return leftName.localeCompare(rightName);
});

fs.writeFileSync(outputPath, JSON.stringify(merged));
console.log(
  `Merged ${inputPaths.length} Vitest reports into ${path.relative(process.cwd(), outputPath)}`,
);
