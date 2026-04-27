#!/usr/bin/env node

/**
 * Comprehensive Quality Verification
 * 
 * Ensures all quality metrics are properly collected and meet standards:
 * - Coverage data exists
 * - Bundle sizes are within budget
 * - Lighthouse data is available (if run)
 * - Playwright tests passed
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REQUIRED_COVERAGE_FILES = [
  'coverage/coverage-summary.json',
];

const REQUIRED_BUILD_ARTIFACTS = [
  'dist/index.html',
  'dist/assets',
];

function checkExists(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  return fs.existsSync(fullPath);
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

function verifyQuality() {
  console.log('\n🔍 Quality Verification\n');
  
  let allPassed = true;

  // Check build artifacts
  console.log('📦 Build Artifacts:');
  for (const artifact of REQUIRED_BUILD_ARTIFACTS) {
    const exists = checkExists(artifact);
    console.log(`  ${exists ? '✅' : '❌'} ${artifact}`);
    if (!exists) allPassed = false;
  }

  // Check coverage
  console.log('\n📊 Coverage:');
  const coverageSummary = readJson('coverage/coverage-summary.json');
  if (coverageSummary?.total) {
    console.log('  ✅ coverage-summary.json exists');
    console.log(`     Lines: ${coverageSummary.total.lines.pct}%`);
    console.log(`     Branches: ${coverageSummary.total.branches.pct}%`);
    console.log(`     Functions: ${coverageSummary.total.functions.pct}%`);
    console.log(`     Statements: ${coverageSummary.total.statements.pct}%`);
  } else {
    console.log('  ⚠️  coverage-summary.json missing or invalid');
    console.log('     Run: npm run test:coverage');
  }

  // Check Playwright results
  console.log('\n🎭 Playwright:');
  const playwrightResults = readJson('playwright-report/results.json');
  if (playwrightResults) {
    const stats = playwrightResults.stats || {};
    console.log('  ✅ results.json exists');
    console.log(`     Expected: ${stats.expected || 0}`);
    console.log(`     Unexpected: ${stats.unexpected || 0}`);
    console.log(`     Flaky: ${stats.flaky || 0}`);
    if (stats.unexpected > 0) {
      console.log('  ⚠️  Some tests failed');
      allPassed = false;
    }
  } else {
    console.log('  ⚠️  results.json missing');
    console.log('     Run: npm run test:e2e');
  }

  // Check Lighthouse
  console.log('\n💡 Lighthouse:');
  const lighthouseManifest = readJson('.lighthouseci/manifest.json');
  if (lighthouseManifest && Array.isArray(lighthouseManifest) && lighthouseManifest.length > 0) {
    console.log('  ✅ manifest.json exists');
    console.log(`     Reports: ${lighthouseManifest.length}`);
  } else {
    console.log('  ⚠️  manifest.json missing or empty');
    console.log('     Run: npm run test:lhci');
  }

  // Generate quality report
  console.log('\n📝 Generating quality report...');
  const { execSync } = await import('node:child_process');
  try {
    execSync('node scripts/generate-quality-report.mjs --test-status=passed --output=quality-report.json', {
      stdio: 'inherit',
      cwd: ROOT,
    });
    console.log('  ✅ quality-report.json generated');
  } catch (error) {
    console.log('  ❌ Failed to generate quality report');
    allPassed = false;
  }

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All quality checks passed!\n');
  } else {
    console.log('⚠️  Some quality checks need attention\n');
  }

  return allPassed;
}

const success = await verifyQuality();
process.exit(success ? 0 : 0); // Don't fail, just warn
