/**
 * Session Management Initialization
 * Re-exports from sessionManager for backward compatibility
 */

export { sessionManager, SessionManager } from './sessionManager';
import { safeStorageGetItem, safeStorageSetItem } from './browserStorage';

const SESSION_ID_KEY = 'wasel_session_id';

/**
 * Generate a cryptographically secure session ID using the Web Crypto API.
 * Falls back to a timestamp+Math.random string only if the environment
 * genuinely lacks crypto.getRandomValues (very old WebViews).
 */
function generateSessionId(): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: timestamp + random for environments without Web Crypto
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
