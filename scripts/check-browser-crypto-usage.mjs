#!/usr/bin/env node
import { readFileSync } from 'fs';

const targetFile = 'src/platform/security/requestContext.ts';
const source = readFileSync(targetFile, 'utf-8');

const forbiddenPatterns = [
  /from ['\"]crypto['\"]/,
  /randomBytes\s*\(/,
];

const violations = forbiddenPatterns.filter((pattern) => pattern.test(source));

if (violations.length > 0) {
  console.error('❌ Browser build safety check failed: Node crypto usage detected in requestContext.ts');
  process.exit(1);
}

console.log('✅ Browser build safety check passed: no Node crypto usage in requestContext.ts');
