/**
 * Sanitization utilities for mobile app
 * Prevents log injection and XSS attacks
 */

/**
 * Sanitize log messages to prevent log injection attacks
 * Removes newlines, carriage returns, and control characters
 */
export function sanitizeLogMessage(message: unknown): string {
  if (message === null || message === undefined) {
    return '[null]';
  }

  const str = String(message);
  
  // Remove control characters, newlines, and carriage returns
  return str
    .replace(/[\r\n\t\x00-\x1F\x7F-\x9F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500); // Limit length to prevent log flooding
}

/**
 * Sanitize user input for display
 * Prevents XSS by escaping HTML entities
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
    .slice(0, 1000); // Reasonable limit for user input
}

/**
 * Sanitize phone number for logging
 * Masks middle digits for privacy
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
 * Masks username partially
 */
export function sanitizeEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  
  const [username, domain] = email.split('@');
  if (username.length <= 2) return `**@${domain}`;
  
  const visibleChars = Math.min(2, Math.floor(username.length / 3));
  const masked = username.slice(0, visibleChars) + '***';
  
  return `${masked}@${domain}`;
}

/**
 * Sanitize error messages for user display
 * Removes technical details that could leak sensitive info
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'An error occurred';
  
  const message = error instanceof Error ? error.message : String(error);
  
  // Remove file paths, stack traces, and technical details
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
      
      // Redact sensitive keys
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
 * Validate and sanitize URL
 * Prevents SSRF attacks
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    
    // Only allow https in production
    if (__DEV__) {
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
    } else {
      if (parsed.protocol !== 'https:') {
        return null;
      }
    }
    
    // Block private IP ranges
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
    ];
    
    if (!__DEV__ && privatePatterns.some(pattern => pattern.test(hostname))) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}
