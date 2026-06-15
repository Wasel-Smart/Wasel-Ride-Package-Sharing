/**
 * Wasel Router — canonical entry point.
 *
 * All route definitions live in `wasel-routes.tsx` one level up.
 * This barrel keeps the import path clean:
 *
 *   import { waselRouter } from './router';
 *
 * instead of reaching into a loose root-level file.
 */
export { waselRouter } from '../wasel-routes';
