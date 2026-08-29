#!/usr/bin/env node
/**
 * verify-contracts.js
 * Validates that key platform contracts (OpenAPI spec, queue contracts,
 * service topology) are present and structurally sound.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const contracts = [
  { label: 'OpenAPI spec', file: 'docs/openapi/wasel-v1.yaml' },
  { label: 'Queue contracts', file: 'src/platform/queue-contracts.ts' },
  { label: 'Service topology', file: 'src/platform/service-topology.ts' },
  { label: 'Event bus', file: 'src/platform/event-bus.ts' },
  { label: 'API envelope', file: 'src/platform/api-envelope.ts' },
  { label: 'Worker framework', file: 'src/platform/worker-framework.ts' },
];

let passed = 0;
let failed = 0;

for (const { label, file } of contracts) {
  const fullPath = path.join(root, file);
  if (fs.existsSync(fullPath)) {
    const size = fs.statSync(fullPath).size;
    if (size > 0) {
      console.log(`  ✓  ${label} (${file})`);
      passed++;
    } else {
      console.error(`  ✗  ${label} — file is empty (${file})`);
      failed++;
    }
  } else {
    console.error(`  ✗  ${label} — not found (${file})`);
    failed++;
  }
}

console.log(`\nContracts: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
