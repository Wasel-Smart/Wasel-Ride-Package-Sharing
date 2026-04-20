#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

const structureChecks = [
  {
    name: 'Rides module architecture',
    files: [
      'src/modules/rides/ride.service.ts',
      'src/modules/rides/ride.controller.ts',
      'src/modules/rides/ride.types.ts',
      'src/modules/rides/ride.state.ts',
      'src/modules/rides/ride.queue.ts',
      'src/modules/rides/ride.hooks.ts',
      'src/components/rides/RideSearchForm.tsx',
      'src/components/rides/RideResults.tsx',
      'src/components/rides/RideCard.tsx',
      'src/components/rides/LocationInput.tsx',
      'src/features/rides/FindRidePage.tsx',
    ],
  },
  {
    name: 'Bus and trips service modules',
    files: [
      'src/modules/bus/bus.service.ts',
      'src/modules/bus/bus.controller.ts',
      'src/modules/bus/bus.hooks.ts',
      'src/modules/trips/trip.service.ts',
      'src/modules/trips/trip.controller.ts',
      'src/modules/trips/trip.hooks.ts',
    ],
  },
  {
    name: 'Landing-system integration',
    files: [
      'src/features/home/landing/LandingServiceHero.tsx',
      'src/features/home/DeferredLandingMap.tsx',
      'src/components/PrivacyConsentBanner.tsx',
    ],
  },
  {
    name: 'Ride verification tests',
    files: [
      'tests/unit/services/rideModule.test.ts',
      'tests/unit/services/rideHooks.test.tsx',
    ],
  },
];

const commandChecks = [
  { name: 'TypeScript', command: 'npm run type-check' },
  { name: 'Lint', command: 'npm run lint -- --max-warnings 0' },
  { name: 'Unit tests', command: 'npm test' },
  { name: 'Production build', command: 'npm run build' },
  { name: 'Bundle budgets', command: 'npx size-limit' },
];

function logLine(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function runStructureCheck(check) {
  const missing = check.files.filter((file) => !existsSync(file));
  if (missing.length === 0) {
    logLine(colors.green, 'OK', check.name);
    return { name: check.name, ok: true };
  }

  logLine(colors.red, 'FAIL', `${check.name} (${missing.length} missing)`);
  for (const file of missing) {
    console.log(`   - ${file}`);
  }
  return { name: check.name, ok: false };
}

function runCommandCheck(check) {
  try {
    execSync(check.command, {
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    logLine(colors.green, 'OK', check.name);
    return { name: check.name, ok: true };
  } catch (error) {
    const output = String(error.stdout ?? error.stderr ?? error.message ?? '')
      .trim()
      .split(/\r?\n/)
      .slice(-12)
      .join('\n');

    logLine(colors.red, 'FAIL', check.name);
    if (output) {
      console.log(output);
    }
    return { name: check.name, ok: false };
  }
}

function run() {
  console.log(`${colors.blue}Wasel Quality Gate${colors.reset}`);
  console.log('');

  const structureResults = structureChecks.map(runStructureCheck);
  console.log('');
  const commandResults = commandChecks.map(runCommandCheck);
  console.log('');

  const allResults = [...structureResults, ...commandResults];
  const passed = allResults.filter((result) => result.ok).length;
  const failed = allResults.length - passed;

  console.log(`${colors.blue}Summary${colors.reset}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log('');
    logLine(colors.green, 'DONE', 'All structure and quality checks passed.');
    process.exit(0);
  }

  console.log('');
  logLine(colors.red, 'BLOCKED', 'Quality gate failed.');
  process.exit(1);
}

run();
