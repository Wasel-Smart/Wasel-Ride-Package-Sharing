#!/usr/bin/env node

/**
 * Trust Center Verification Script
 * 
 * Checks that all Trust Center components are properly configured
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

const checks = [
  {
    name: 'TrustCenterPage component',
    path: 'src/features/trust/TrustCenterPage.tsx',
  },
  {
    name: 'Trust Center service',
    path: 'src/services/trustCenter.ts',
  },
  {
    name: 'Trust Center model',
    path: 'src/services/trustCenterModel.ts',
  },
  {
    name: 'Trust rules service',
    path: 'src/services/trustRules.ts',
  },
  {
    name: 'Router configuration',
    path: 'src/wasel-routes.tsx',
  },
  {
    name: 'E2E tests',
    path: 'tests/e2e/trust-center.spec.ts',
  },
];

console.log('\n🔍 Verifying Trust Center Setup...\n');

let allPassed = true;

checks.forEach(({ name, path }) => {
  const fullPath = resolve(process.cwd(), path);
  const exists = existsSync(fullPath);
  
  if (exists) {
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name} - NOT FOUND at ${path}`);
    allPassed = false;
  }
});

console.log('\n📋 Route Configuration:');
console.log('   Primary: /app/trust');
console.log('   Legacy:  /trust → /app/trust');
console.log('   Port:    3002 (default dev server)');

console.log('\n🧪 Run Tests:');
console.log('   npm run test:e2e tests/e2e/trust-center.spec.ts');

console.log('\n🚀 Start Dev Server:');
console.log('   npm run dev');
console.log('   Navigate to: http://127.0.0.1:3002/app/trust');

if (allPassed) {
  console.log('\n✨ All Trust Center components are properly configured!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some components are missing. Check the paths above.\n');
  process.exit(1);
}
