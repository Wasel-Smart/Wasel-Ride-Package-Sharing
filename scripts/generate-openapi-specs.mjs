import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const contractsPath = path.resolve('src/platform/contracts/service-contracts.json');
const outputDir = path.resolve('docs/openapi');
const servicesDir = path.join(outputDir, 'services');

function toOperationYaml(operation, indent = '  ') {
  const securityLine =
    operation.authentication === 'jwt'
      ? `${indent}    security:\n${indent}      - bearerAuth: []\n${indent}      - requestSignature: []\n`
      : '';

  return [
    `${indent}${operation.method.toLowerCase()}:`,
    `${indent}  tags:`,
    `${indent}    - ${operation.tag}`,
    `${indent}  operationId: ${operation.operationId}`,
    `${indent}  summary: ${operation.summary}`,
    securityLine.trimEnd(),
    `${indent}  responses:`,
    `${indent}    '200':`,
    `${indent}      description: Successful response`,
    `${indent}    '400':`,
    `${indent}      description: Invalid request`,
    `${indent}    '401':`,
    `${indent}      description: Authentication failed`,
    `${indent}    '429':`,
    `${indent}      description: Rate limited`,
    `${indent}    '500':`,
    `${indent}      description: Internal platform error`,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildSpec(serviceContracts, scope) {
  const selected = scope === 'all'
    ? serviceContracts
    : serviceContracts.filter((contract) => contract.name === scope);

  const operations = selected.flatMap((contract) =>
    contract.operations.map((operation) => ({
      ...operation,
      tag: contract.name,
      version: contract.version,
    })),
  );

  const paths = new Map();
  for (const operation of operations) {
    const existing = paths.get(operation.path) ?? [];
    existing.push(toOperationYaml(operation));
    paths.set(operation.path, existing);
  }

  const pathYaml = Array.from(paths.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([apiPath, entries]) => {
      const renderedEntries = entries.map((entry) => entry.replace(/^  /gm, '    ')).join('\n');
      return `  ${apiPath}:\n${renderedEntries}`;
    })
    .join('\n');

  const title = scope === 'all'
    ? 'Wasel Platform API'
    : `Wasel ${scope[0].toUpperCase()}${scope.slice(1)} Service API`;

  const description = scope === 'all'
    ? 'Generated OpenAPI registry for the Wasel platform service contracts.'
    : `Generated OpenAPI contract for the ${scope} bounded domain.`;

  const version = selected[0]?.version ?? 'v1';

  return [
    'openapi: 3.1.0',
    'info:',
    `  title: ${title}`,
    `  version: ${version}`,
    `  description: ${description}`,
    'servers:',
    '  - url: https://api.wasel.app',
    '    description: Production',
    '  - url: https://staging-api.wasel.app',
    '    description: Staging',
    'tags:',
    ...selected.map((contract) => `  - name: ${contract.name}\n    description: ${contract.ownership}`),
    'components:',
    '  securitySchemes:',
    '    bearerAuth:',
    "      type: http",
    "      scheme: bearer",
    "      bearerFormat: JWT",
    '    requestSignature:',
    '      type: apiKey',
    '      in: header',
    '      name: X-Wasel-Signature',
    'paths:',
    pathYaml || '  {}',
  ].join('\n');
}

const serviceContracts = JSON.parse(await readFile(contractsPath, 'utf8'));

await mkdir(servicesDir, { recursive: true });

await writeFile(path.join(outputDir, 'openapi.yaml'), `${buildSpec(serviceContracts, 'all')}\n`);

for (const contract of serviceContracts) {
  await writeFile(
    path.join(servicesDir, `${contract.name}.yaml`),
    `${buildSpec(serviceContracts, contract.name)}\n`,
  );
}

await writeFile(
  path.join(outputDir, 'README.md'),
  [
    '# Wasel OpenAPI Registry',
    '',
    'This directory is generated from `src/platform/contracts/service-contracts.json`.',
    '',
    'Files:',
    '- `openapi.yaml`: combined platform contract registry',
    '- `services/*.yaml`: per-service API contracts',
    '',
    'Regenerate with `npm run generate:openapi`.',
  ].join('\n'),
);

console.log(`Generated OpenAPI specs in ${outputDir}`);
