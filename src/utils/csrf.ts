/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Implements token-based CSRF protection for state-changing operations
 */

import { generateSecureId } from './encryption';

const CSRF_TOKEN_KEY = 'wasel_csrf_token';
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CSRFTokenData {
  token: string;
  expiresAt: number;
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
  
  sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(tokenData));
  return token;
}

/**
 * Get current CSRF token, generate new one if expired or missing
 */
export function getCSRFToken(): string {
  const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!stored) {
    return generateCSRFToken();
  }
  
  try {
    const tokenData: CSRFTokenData = JSON.parse(stored);
    
    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      return generateCSRFToken();
    }
    
    return tokenData.token;
  } catch {
    return generateCSRFToken();
  }
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(token: string): boolean {
  const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!stored) {
    return false;
  }
  
  try {
    const tokenData: CSRFTokenData = JSON.parse(stored);
    
    // Check expiry
    if (Date.now() > tokenData.expiresAt) {
      return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    return constantTimeCompare(token, tokenData.token);
  } catch {
    return false;
  }
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
  const token = getCSRFToken();
  
  return {
    ...headers,
    [CSRF_TOKEN_HEADER]: token,
  };
}

/**
 * Clear CSRF token (on logout)
 */
export function clearCSRFToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
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
  // Generate initial token
  generateCSRFToken();
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
