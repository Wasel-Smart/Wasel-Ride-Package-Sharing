/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Implements token-based CSRF protection for state-changing operations
 */

import { generateSecureId } from './encryption';
import {
  safeStorageGetItem,
  safeStorageRemoveItem,
  safeStorageSetItem,
} from './browserStorage';

const CSRF_TOKEN_KEY = 'wasel_csrf_token';
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CSRFTokenData {
  token: string;
  expiresAt: number;
}

let inMemoryTokenData: CSRFTokenData | null = null;

function persistToken(tokenData: CSRFTokenData): void {
  inMemoryTokenData = tokenData;
  safeStorageSetItem('sessionStorage', CSRF_TOKEN_KEY, JSON.stringify(tokenData));
}

function readTokenData(): CSRFTokenData | null {
  const stored = safeStorageGetItem('sessionStorage', CSRF_TOKEN_KEY);

  if (!stored) {
    return inMemoryTokenData;
  }

  try {
    const parsed = JSON.parse(stored) as CSRFTokenData;
    inMemoryTokenData = parsed;
    return parsed;
  } catch {
    safeStorageRemoveItem('sessionStorage', CSRF_TOKEN_KEY);
    return inMemoryTokenData;
  }
}

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  const token = generateSecureId(32);
  const tokenData: CSRFTokenData = {
    token,
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  };

  persistToken(tokenData);
  return token;
}

/**
 * Get current CSRF token, generate new one if expired or missing
 */
export function getCSRFToken(): string {
  const tokenData = readTokenData();

  if (!tokenData) {
    return generateCSRFToken();
  }

  // Check if token is expired
  if (Date.now() > tokenData.expiresAt) {
    return generateCSRFToken();
  }

  return tokenData.token;
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(token: string): boolean {
  const tokenData = readTokenData();

  if (!tokenData) {
    return false;
  }

  // Check expiry
  if (Date.now() > tokenData.expiresAt) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(token, tokenData.token);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Add CSRF token to request headers
 */
export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  let token = '';

  try {
    token = getCSRFToken();
  } catch {
    token = '';
  }

  if (!token) {
    return headers;
  }

  return {
    ...headers,
    [CSRF_TOKEN_HEADER]: token,
  };
}

/**
 * Clear CSRF token (on logout)
 */
export function clearCSRFToken(): void {
  inMemoryTokenData = null;
  safeStorageRemoveItem('sessionStorage', CSRF_TOKEN_KEY);
}

/**
 * Refresh CSRF token (extend expiry)
 */
export function refreshCSRFToken(): string {
  return generateCSRFToken();
}

/**
 * Get CSRF token header name
 */
export function getCSRFHeaderName(): string {
  return CSRF_TOKEN_HEADER;
}

/**
 * Initialize CSRF protection (called on app start)
 */
export function initializeCsrfProtection(): void {
  try {
    getCSRFToken();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Wasel] CSRF bootstrap skipped.', error);
    }
  }
}

export const CSRF = {
  generateToken: generateCSRFToken,
  getToken: getCSRFToken,
  validateToken: validateCSRFToken,
  addHeader: addCSRFHeader,
  clearToken: clearCSRFToken,
  refreshToken: refreshCSRFToken,
  getHeaderName: getCSRFHeaderName,
  initialize: initializeCsrfProtection,
};

export default CSRF;
