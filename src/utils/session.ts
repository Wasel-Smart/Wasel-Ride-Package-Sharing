/**
 * Session Management Initialization
 * Re-exports from sessionManager for backward compatibility
 */

export { sessionManager, SessionManager } from './sessionManager';

/**
 * Initialize session management (called on app start)
 */
export function initializeSessionManagement(): void {
  // Session manager is already initialized as singleton
  // This function exists for explicit initialization if needed
  if (typeof window !== 'undefined') {
    // Ensure session ID exists
    if (!sessionStorage.getItem('wasel_session_id')) {
      const crypto = window.crypto || (window as any).msCrypto;
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const sessionId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem('wasel_session_id', sessionId);
    }
  }
}
