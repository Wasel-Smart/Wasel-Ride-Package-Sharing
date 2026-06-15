import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse } from 'yaml';

const specPath = path.join(process.cwd(), 'docs', 'openapi', 'wasel-v1.yaml');
const spec = parse(await readFile(specPath, 'utf8'));

if (spec.openapi !== '3.1.0') {
  throw new Error(`Expected OpenAPI 3.1.0 but received ${spec.openapi}`);
}

if (!spec.info?.title || !spec.info?.version) {
  throw new Error('OpenAPI spec must include info.title and info.version');
}

const paths = spec.paths ?? {};
const requiredPaths = [
  '/rides',
  '/rides/{rideId}/accept',
  '/packages',
  '/packages/{packageId}/location',
  '/payments/packages/{packageId}/authorize',
  '/ops/health',
];

for (const requiredPath of requiredPaths) {
  if (!paths[requiredPath]) {
    throw new Error(`Missing required path in OpenAPI spec: ${requiredPath}`);
  }
}

const schemas = spec.components?.schemas ?? {};
for (const schemaName of [
  'RideResponseEnvelope',
  'PackageResponseEnvelope',
  'PaymentResponseEnvelope',
  'HealthResponseEnvelope',
  'ErrorEnvelope',
]) {
  if (!schemas[schemaName]) {
    throw new Error(`Missing required schema in OpenAPI spec: ${schemaName}`);
  }
}

console.log(`OpenAPI contract validated: ${specPath}`);
