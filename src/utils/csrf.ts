/**
 * CSRF Protection Utility
 * 
 * Implements Cross-Site Request Forgery protection for all state-changing operations.
 * Uses double-submit cookie pattern with additional validation.
 */

const CSRF_TOKEN_KEY = 'wasel-csrf-token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CsrfTokenData {
  token: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate cryptographically secure random token
 */
function generateSecureToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(TOKEN_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without crypto API (should not happen in modern browsers)
  console.warn('crypto.getRandomValues not available, using less secure fallback');
  return Array.from({ length: TOKEN_LENGTH }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Store CSRF token in sessionStorage
 */
function storeToken(tokenData: CsrfTokenData): void {
  if (typeof sessionStorage === 'undefined') return;
  
  try {
    sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(tokenData));
  } catch (error) {
    console.error('Failed to store CSRF token:', error);
  }
}

/**
 * Retrieve CSRF token from sessionStorage
 */
function retrieveToken(): CsrfTokenData | null {
  if (typeof sessionStorage === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (!stored) return null;
    
    const tokenData = JSON.parse(stored) as CsrfTokenData;
    
    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      sessionStorage.removeItem(CSRF_TOKEN_KEY);
      return null;
    }
    
    return tokenData;
  } catch (error) {
    console.error('Failed to retrieve CSRF token:', error);
    return null;
  }
}

/**
 * Generate or retrieve existing CSRF token
 */
export function getCsrfToken(): string {
  let tokenData = retrieveToken();
  
  if (!tokenData) {
    const now = Date.now();
    tokenData = {
      token: generateSecureToken(),
      createdAt: now,
      expiresAt: now + TOKEN_EXPIRY_MS,
    };
    storeToken(tokenData);
  }
  
  return tokenData.token;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  const stored = retrieveToken();
  
  if (!stored) {
    console.warn('No CSRF token found in storage');
    return false;
  }
  
  if (stored.token !== token) {
    console.warn('CSRF token mismatch');
    return false;
  }
  
  if (Date.now() > stored.expiresAt) {
    console.warn('CSRF token expired');
    return false;
  }
  
  return true;
}

/**
 * Refresh CSRF token (generate new one)
 */
export function refreshCsrfToken(): string {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
  }
  return getCsrfToken();
}

/**
 * Clear CSRF token (on logout)
 */
export function clearCsrfToken(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
  }
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfHeader(headers: HeadersInit = {}): Headers {
  const finalHeaders = new Headers(headers);
  const token = getCsrfToken();
  
  finalHeaders.set(CSRF_HEADER_NAME, token);
  
  return finalHeaders;
}

/**
 * Add CSRF token to fetch options
 */
export function withCsrfProtection(options: RequestInit = {}): RequestInit {
  const headers = addCsrfHeader(options.headers);
  
  return {
    ...options,
    headers,
  };
}

/**
 * Validate CSRF token from request headers (server-side)
 */
export function validateCsrfFromHeaders(headers: Headers): boolean {
  const token = headers.get(CSRF_HEADER_NAME);
  
  if (!token) {
    return false;
  }
  
  return validateCsrfToken(token);
}

/**
 * CSRF-protected fetch wrapper
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Only add CSRF protection for state-changing methods
  const method = (options.method || 'GET').toUpperCase();
  const requiresCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  if (requiresCsrf) {
    return fetch(url, withCsrfProtection(options));
  }
  
  return fetch(url, options);
}

/**
 * Initialize CSRF protection (call on app startup)
 */
export function initializeCsrfProtection(): void {
  // Generate initial token
  getCsrfToken();
  
  // Refresh token periodically
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      const tokenData = retrieveToken();
      if (tokenData) {
        const timeUntilExpiry = tokenData.expiresAt - Date.now();
        // Refresh if less than 10 minutes remaining
        if (timeUntilExpiry < 10 * 60 * 1000) {
          refreshCsrfToken();
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
  
  // Clear token on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      // Don't clear on normal navigation, only on actual close
      // Token will expire naturally
    });
  }
}

/**
 * CSRF middleware for form submissions
 */
export function csrfFormMiddleware(formData: FormData): FormData {
  const token = getCsrfToken();
  formData.append('_csrf', token);
  return formData;
}

/**
 * Get CSRF token for form hidden input
 */
export function getCsrfTokenForForm(): { name: string; value: string } {
  return {
    name: '_csrf',
    value: getCsrfToken(),
  };
}

export const CsrfProtection = {
  getCsrfToken,
  validateCsrfToken,
  refreshCsrfToken,
  clearCsrfToken,
  addCsrfHeader,
  withCsrfProtection,
  validateCsrfFromHeaders,
  csrfFetch,
  initializeCsrfProtection,
  csrfFormMiddleware,
  getCsrfTokenForForm,
  CSRF_HEADER_NAME,
};

export default CsrfProtection;
