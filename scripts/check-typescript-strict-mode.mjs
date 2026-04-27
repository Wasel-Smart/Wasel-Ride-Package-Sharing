import path from 'node:path';
import process from 'node:process';

import ts from 'typescript';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function formatDiagnostic(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
}

const configFilePath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');

if (!configFilePath) {
  fail('Could not find tsconfig.json');
}

const readResult = ts.readConfigFile(configFilePath, ts.sys.readFile);

if (readResult.error) {
  fail(formatDiagnostic(readResult.error));
}

const parsedConfig = ts.parseJsonConfigFileContent(
  readResult.config,
  ts.sys,
  path.dirname(configFilePath),
  undefined,
  configFilePath,
);

if (parsedConfig.errors.length > 0) {
  fail(parsedConfig.errors.map(formatDiagnostic).join('\n'));
}

const requiredOptions = ['strict', 'noImplicitAny', 'strictNullChecks'];
const missing = requiredOptions.filter(
  (option) => parsedConfig.options[option] !== true,
);

if (missing.length > 0) {
  fail(`Missing required TypeScript strict-mode options: ${missing.join(', ')}`);
}

console.log('TypeScript strict mode verification passed');
