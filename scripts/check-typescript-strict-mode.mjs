import process from 'node:process';
import ts from 'typescript';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');

if (!configPath) {
  fail('Unable to locate tsconfig.json');
}

const diagnostics = [];
const parsedConfig = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
});

if (!parsedConfig) {
  const message =
    diagnostics.length > 0
      ? ts.formatDiagnosticsWithColorAndContext(diagnostics, {
          getCanonicalFileName: (fileName) => fileName,
          getCurrentDirectory: () => process.cwd(),
          getNewLine: () => '\n',
        })
      : 'Failed to parse tsconfig.json';
  fail(message);
}

const requiredOptions = ['strict', 'noImplicitAny', 'strictNullChecks'];
const missing = requiredOptions.filter(
  (option) => parsedConfig.options[option] !== true,
);

if (missing.length > 0) {
  fail(`Missing required TypeScript strict-mode options: ${missing.join(', ')}`);
}

console.log('TypeScript strict mode verification passed');
