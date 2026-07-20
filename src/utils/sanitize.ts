/**
 * Re-export shim — all sanitization helpers now live in the canonical
 * src/utils/sanitization.ts. This file exists so legacy imports from
 * `@/utils/sanitize` keep resolving.
 */
export * from './sanitization';
