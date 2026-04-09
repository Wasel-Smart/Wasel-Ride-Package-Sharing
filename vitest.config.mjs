/**
 * @deprecated This file exists only for backward compatibility.
 * The canonical Vitest configuration is vitest.config.ts.
 * All package.json scripts have been updated to reference vitest.config.ts.
 * This file will be removed in a future cleanup.
 */

// Re-exporting from the TypeScript config is not directly possible in .mjs
// without a bundler pass. Scripts now reference vitest.config.ts directly.
// If you're seeing this, update your npm script to: --config vitest.config.ts
export { default } from './vitest.config.ts';
