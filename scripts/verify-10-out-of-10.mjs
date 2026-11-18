#!/usr/bin/env node

/**
 * Deprecated: file-presence checks cannot establish a 10/10 product score,
 * security posture, or production readiness.
 *
 * Use npm run verify:full for repository validation. A production rating also
 * requires live database, payment-provider, deployment, and user-flow evidence.
 */

console.error(
  'This legacy 10/10 shortcut is disabled: it measured file presence, not application quality or production readiness.',
);
console.error('Run npm run verify:full, then complete the documented production-readiness checks.');
process.exit(1);
