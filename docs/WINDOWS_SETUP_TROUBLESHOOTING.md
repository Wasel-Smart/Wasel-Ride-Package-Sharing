# Windows Setup Troubleshooting (Type-check / Vitest / ESLint)

This guide fixes the exact failures shown in terminal screenshots like:

- `TS2688: Cannot find type definition file for 'vite/client'`
- `ERR_MODULE_NOT_FOUND ... node_modules/vitest/config`
- npm permission / file-in-use install failures on Windows

## 1) Close file locks and clean install

On Windows, editors/antivirus can lock files inside `node_modules`.

```powershell
# close running dev servers/tests first
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# clean stale install artifacts
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force

# install exactly from lockfile (preferred)
npm ci
```

If `npm ci` still fails with permission errors, run PowerShell as Administrator and retry.

## 2) Verify critical packages

```powershell
npm ls vite vitest @types/node @eslint/js
```

All should resolve without `UNMET DEPENDENCY`.

## 3) Re-run checks in order

```powershell
npm run -s type-check
npm run -s lint:strict
npm run -s test
npm run -s test:security
```

## 4) Why this works

- `vite/client` types come from Vite package installation.
- `vitest/config` module is provided by Vitest package installation.
- Missing modules in these errors indicate incomplete/corrupted install, not app logic regressions.

## 5) Project-side compatibility hardening already applied

`tsconfig.json` includes:

- `"ignoreDeprecations": "6.0"`

This removes TS6 deprecation blocking noise while migrating to future TS7-safe options.
