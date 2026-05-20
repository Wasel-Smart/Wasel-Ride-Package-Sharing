/**
 * Sanitization utilities for web application
 * Prevents XSS, log injection, and SSRF attacks
 */

/**
 * Sanitize log messages to prevent log injection attacks
 */
export function sanitizeLogMessage(message: unknown): string {
  if (message === null || message === undefined) {
    return '[null]';
  }

  const str = String(message);
  
  return str
    .replace(/[\r\n\t\x00-\x1F\x7F-\x9F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';
  
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Sanitize user input for display
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 10000);
}

/**
 * Sanitize phone number for logging
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone || phone.length < 4) return '***';
  
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '***';
  
  const start = cleaned.slice(0, 2);
  const end = cleaned.slice(-2);
  const middle = '*'.repeat(cleaned.length - 4);
  
  return `${start}${middle}${end}`;
}

/**
 * Sanitize email for logging
 */
export function sanitizeEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  
  const [username] = email.split('@');
  const atIdx = email.indexOf('@');
  const domain = atIdx >= 0 ? email.slice(atIdx + 1) : '';
  if (!domain || username.length <= 2) return `**@${domain}`;
  
  const visibleChars = Math.min(2, Math.floor((username ?? '').length / 3));
  const masked = (username ?? '').slice(0, visibleChars) + '***';
  
  return `${masked}@${domain}`;
}

/**
 * Sanitize error messages for user display
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'An error occurred';
  
  const message = error instanceof Error ? error.message : String(error);
  
  return message
    .replace(/\/[^\s]+/g, '[path]')
    .replace(/at\s+[^\n]+/g, '')
    .replace(/\([^)]+\)/g, '')
    .replace(/Error:\s*/g, '')
    .trim()
    .slice(0, 200);
}

/**
 * Safe JSON stringify that handles circular references
 */
export function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      
      if (typeof key === 'string') {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('token') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('key') ||
          lowerKey.includes('auth')
        ) {
          return '[REDACTED]';
        }
      }
      
      return value;
    }, 2);
  } catch {
    return '[Unstringifiable]';
  }
}

/**
 * Validate and sanitize URL to prevent SSRF
 * Wraps sanitizeUrl and returns a boolean for guard-expression call sites.
 */
export function validateApiUrl(url: string, allowedDomains?: string[]): boolean {
  return sanitizeUrl(url, allowedDomains) !== null;
}

/**
 * Sanitize arbitrary event payloads to eliminate control characters that could
 * poison log lines or downstream parsers.  Preserves the caller's structural
 * type so no cast is required at the call site.
 */
export function sanitizeEventPayload<T>(payload: T): T {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload === 'string') return sanitizeLogMessage(payload) as unknown as T;
  if (typeof payload === 'number' || typeof payload === 'boolean') return payload;
  if (Array.isArray(payload as unknown as unknown[]))
    return (payload as unknown[]).map(sanitizeEventPayload) as unknown as T;
  if (payload instanceof Date) return payload.toISOString() as unknown as T;
  if (typeof payload === 'object') {
    return Object.fromEntries(
      Object.entries(payload as Record<string, unknown>).map(([k, v]) => [
        k,
        sanitizeEventPayload(v),
      ]),
    ) as unknown as T;
  }
  return payload;
}

/**
 * Validate and sanitize URL to prevent SSRF
 */
export function sanitizeUrl(url: string, allowedDomains?: string[]): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    
    if (import.meta.env.PROD && parsed.protocol !== 'https:') {
      return null;
    }
    
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    const hostname = parsed.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::1$/,
      /^fe80:/,
      /^0\.0\.0\.0$/,
    ];
    
    if (import.meta.env.PROD && privatePatterns.some(pattern => pattern.test(hostname))) {
      return null;
    }
    
    if (allowedDomains && allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
      if (!isAllowed) return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize SQL-like input to prevent injection
 */
export function sanitizeSQLInput(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/sp_/gi, '')
    .trim()
    .slice(0, 1000);
}

/**
 * Sanitize command input to prevent command injection
 */
export function sanitizeCommandInput(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[;&|`$(){}[\]<>]/g, '')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .trim()
    .slice(0, 500);
}
