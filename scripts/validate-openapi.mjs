import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const specPath = path.join(process.cwd(), 'docs', 'openapi', 'wasel-v1.yaml');
const spec = await readFile(specPath, 'utf8');

if (!/^openapi:\s*3\.1\.0\s*$/m.test(spec)) {
  throw new Error('Expected OpenAPI 3.1.0');
}

if (!/^\s*title:\s*\S+/m.test(spec) || !/^\s*version:\s*\S+/m.test(spec)) {
  throw new Error('OpenAPI spec must include info.title and info.version');
}

const requiredPaths = [
  '/rides',
  '/rides/{rideId}/accept',
  '/packages',
  '/packages/{packageId}/location',
  '/payments/packages/{packageId}/authorize',
  '/ops/health',
];

for (const requiredPath of requiredPaths) {
  const pathPattern = new RegExp(`^\\s{2}${requiredPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*$`, 'm');
  if (!pathPattern.test(spec)) {
    throw new Error(`Missing required path in OpenAPI spec: ${requiredPath}`);
  }
}

for (const schemaName of [
  'RideResponseEnvelope',
  'PackageResponseEnvelope',
  'PaymentResponseEnvelope',
  'HealthResponseEnvelope',
  'ErrorEnvelope',
]) {
  const schemaPattern = new RegExp(`^\\s{4}${schemaName}:\\s*$`, 'm');
  if (!schemaPattern.test(spec)) {
    throw new Error(`Missing required schema in OpenAPI spec: ${schemaName}`);
  }
}

console.log(`OpenAPI contract validated: ${specPath}`);
