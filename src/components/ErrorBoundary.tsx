/**
 * Re-export shim — the canonical error-boundary implementation lives in
 * components/system/ErrorBoundary.tsx. This file exists only so legacy
 * imports of `WaselErrorBoundary` keep resolving.
 */
export { WaselErrorBoundary } from './system/ErrorBoundary';
