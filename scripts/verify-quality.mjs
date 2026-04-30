#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const REQUIRED_BUILD_ARTIFACTS = ['dist/index.html', 'dist/assets'];

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

  const reportFiles = fs.readdirSync(lighthouseDir).filter((fileName) => /^lhr-.*\.json$/i.test(fileName));
  return {
    hasResults: reportFiles.length > 0,
    count: reportFiles.length,
    source: reportFiles.length > 0 ? 'lhr-*.json' : null,
  };
}

async function verifyQuality() {
  console.log('\nQuality Verification\n');

  let allPassed = true;

  console.log('Build Artifacts:');
  for (const artifact of REQUIRED_BUILD_ARTIFACTS) {
    const exists = checkExists(artifact);
    console.log(`  ${exists ? 'OK' : 'MISSING'} ${artifact}`);
    if (!exists) {
      allPassed = false;
    }
  }

  console.log('\nCoverage:');
  const coverageSummary = readJson('coverage/coverage-summary.json');
  if (coverageSummary?.total) {
    console.log('  OK coverage-summary.json exists');
    console.log(`     Lines: ${coverageSummary.total.lines.pct}%`);
    console.log(`     Branches: ${coverageSummary.total.branches.pct}%`);
    console.log(`     Functions: ${coverageSummary.total.functions.pct}%`);
    console.log(`     Statements: ${coverageSummary.total.statements.pct}%`);
  } else {
    console.log('  WARN coverage-summary.json missing or invalid');
    console.log('     Run: npm run test:coverage');
  }

  console.log('\nPlaywright:');
  const playwrightResults = readJson('playwright-report/results.json');
  if (playwrightResults) {
    const stats = playwrightResults.stats ?? {};
    console.log('  OK results.json exists');
    console.log(`     Expected: ${stats.expected ?? 0}`);
    console.log(`     Unexpected: ${stats.unexpected ?? 0}`);
    console.log(`     Flaky: ${stats.flaky ?? 0}`);
    if ((stats.unexpected ?? 0) > 0) {
      console.log('  WARN some Playwright tests failed');
      allPassed = false;
    }
  } else {
    console.log('  WARN results.json missing');
    console.log('     Run: npm run test:e2e');
  }

  console.log('\nLighthouse:');
  const lighthouseArtifacts = getLighthouseArtifacts();
  if (lighthouseArtifacts.hasResults) {
    console.log(`  OK ${lighthouseArtifacts.source} exists`);
    console.log(`     Reports: ${lighthouseArtifacts.count}`);
  } else {
    console.log('  WARN no Lighthouse artifacts found');
    console.log('     Run: npm run test:lhci');
  }

  console.log('\nGenerating quality report...');
  try {
    execSync('node scripts/generate-quality-report.mjs --output=quality-report.json', {
      stdio: 'inherit',
      cwd: ROOT,
    });
    console.log('  OK quality-report.json generated');
  } catch {
    console.log('  FAIL failed to generate quality report');
    allPassed = false;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(allPassed ? 'All quality checks passed.\n' : 'Some quality checks need attention.\n');
}

await verifyQuality();
process.exit(0);
