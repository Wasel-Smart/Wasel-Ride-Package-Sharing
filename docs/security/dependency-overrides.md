# Dependency override rationale

These overrides pin patched transitive development-tool dependencies. Do not remove them until the dependency graph no longer requires them and `npm audit` confirms the relevant advisories are resolved.

- `basic-ftp@6.2.1` and `nanoid@5.1.16` pin patched transitive versions.
- `@puppeteer/browsers@^3.2.7` replaces the exact 2.x version pinned by the Lighthouse/Puppeteer toolchain. The 2.x tree brings in `extract-zip@2.0.1`, for which reviewed GitHub advisories report no patched release. Version 3.x removes that dependency and uses `modern-tar`.
- `@puppeteer/browsers@3.x` requires Node.js 22.12 or newer for the ESM/CommonJS interop used by the current Puppeteer toolchain. CI therefore runs on Node.js 22.12.0.

Verification required after changing these overrides:
1. `npm ci`
2. `npm audit --audit-level=high`
3. `npm run test:lhci`
4. `npm run type-check && npm test && npm run build`

Retire the Puppeteer override only when the upstream Lighthouse/Puppeteer dependency graph resolves a patched browser package without it, and the full audit plus Lighthouse tests pass.
