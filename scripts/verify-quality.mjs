#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const REQUIRED_BUILD_ARTIFACTS = ['dist/index.html', 'dist/assets'];
const COVERAGE_METRICS = ['lines', 'branches', 'functions', 'statements'];

function checkExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function readJson(relativePath) {
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

function getLighthouseArtifacts() {
  const manifest = readJson('.lighthouseci/manifest.json');
  if (Array.isArray(manifest) && manifest.length > 0) {
    return {
      hasResults: true,
      count: manifest.length,
      source: 'manifest.json',
    };
  }

  const lighthouseDir = path.join(ROOT, '.lighthouseci');
  if (!fs.existsSync(lighthouseDir)) {
    return { hasResults: false, count: 0, source: null };
  }

  const reportFiles = fs.readdirSync(lighthouseDir).filter((fileName) => /^lhr-.*\\.json$/i.test(fileName));
  return {
    hasResults: reportFiles.length > 0,
    count: reportFiles.length,
    source: reportFiles.length > 0 ? 'lhr-*.json' : null,
  };
}

async function verifyQuality() {
  console.log('\\nQuality Verification\\n');

  let allPassed = true;

  console.log('Build Artifacts:');
  for (const artifact of REQUIRED_BUILD_ARTIFACTS) {
    const exists = checkExists(artifact);
    console.log(`  ${exists ? 'OK' : 'MISSING'} ${artifact}`);
    if (!exists) {
      allPassed = false;
    }
  }

  console.log('\\nCoverage:');
  const coverageSummary = readJson('coverage/coverage-summary.json');
  if (!coverageSummary?.total) {
    console.error('  FAIL coverage/coverage-summary.json is missing or invalid.');
    console.error('       Run: npm run test:coverage');
    allPassed = false;
  } else {
    for (const metric of COVERAGE_METRICS) {
      const percentage = coverageSummary.total[metric]?.pct;
      if (typeof percentage !== 'number' || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        console.error(`  FAIL coverage metric "${metric}" is missing or invalid.`);
        allPassed = false;
        continue;
      }

      console.log(`  OK ${metric}: ${percentage}%`);
    }
  }

  console.log('\\nPlaywright:');
  const playwrightResults = readJson('playwright-report/results.json');
  if (playwrightResults) {
    const stats = playwrightResults.stats ?? {};
    console.log('  OK results.json exists');
    console.log(`     Expected: ${stats.expected ?? 0}`);
    console.log(`     Unexpected: ${stats.unexpected ?? 0}`);
    console.log(`     Flaky: ${stats.flaky ?? 0}`);
    if ((stats.unexpected ?? 0) > 0) {
      console.error('  FAIL one or more Playwright tests failed.');
      allPassed = false;
    }
  } else {
    // Core, accessibility, and RTL E2E suites run in separate CI jobs.
    console.log('  INFO no local Playwright report; E2E suites are gated by their own CI jobs.');
  }

  console.log('\\nLighthouse:');
  const lighthouseArtifacts = getLighthouseArtifacts();
  if (lighthouseArtifacts.hasResults) {
    console.log(`  OK ${lighthouseArtifacts.source} exists`);
    console.log(`     Reports: ${lighthouseArtifacts.count}`);
  } else {
    // Lighthouse runs in a separate CI job and is not expected in this job's workspace.
    console.log('  INFO no local Lighthouse artifacts; the dedicated Lighthouse CI job is authoritative.');
  }

  console.log('\\nGenerating quality report...');
  try {
    execSync('node scripts/generate-quality-report.mjs --output=quality-report.json', {
      stdio: 'inherit',
      cwd: ROOT,
    });
    console.log('  OK quality-report.json generated');
  } catch {
    console.error('  FAIL failed to generate quality report.');
    allPassed = false;
  }

  console.log(`\\n${'='.repeat(50)}`);
  console.log(allPassed ? 'All quality checks passed.\\n' : 'Quality verification failed.\\n');
  return allPassed;
}

const passed = await verifyQuality();
process.exitCode = passed ? 0 : 1;
