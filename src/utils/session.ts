/**
 * Session Management Initialization
 * Re-exports from sessionManager for backward compatibility
 */

export { sessionManager, SessionManager } from './sessionManager';
import { safeStorageGetItem, safeStorageSetItem } from './browserStorage';

const SESSION_ID_KEY = 'wasel_session_id';

/**
 * Generate a cryptographically secure session ID using the Web Crypto API.
 * The application fails closed if cryptographic randomness is unavailable.
 */
function generateSessionId(): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  throw new Error('Secure session ID generation is unavailable in this browser.');
}

/**
 * Initialize session management (called on app start).
 * Ensures a stable, opaque session ID exists for the current browser tab.
 */
export function initializeSessionManagement(): void {
  if (typeof window === 'undefined') return;

  const existing = safeStorageGetItem('sessionStorage', SESSION_ID_KEY);
  if (!existing) {
    safeStorageSetItem('sessionStorage', SESSION_ID_KEY, generateSessionId());
  }
}
