/**
 * Input sanitization utilities for security hardening
 */

/**
 * Sanitize string input by removing control characters and newlines
 * to prevent log injection and other injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return Array.from(input)
    .filter(char => {
      const code = char.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('');
}

/**
 * Sanitize object for event bus publishing
 * Ensures all string values are sanitized to prevent code injection
 */
export function sanitizeEventPayload<T extends Record<string, unknown>>(payload: T): T {
  const sanitized: Record<string, unknown> = { ...payload };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeEventPayload(value as Record<string, unknown>);
    }
  }

  return sanitized as T;
}

/**
 * Validate and sanitize URL to prevent SSRF attacks
 * Only allows HTTPS URLs from configured domains, with exception for localhost development
 */
export function validateApiUrl(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url);
    
    // Allow both HTTP and HTTPS for localhost development
    const isLocalhost = parsed.hostname === 'localhost';
    if (!isLocalhost && parsed.protocol !== 'https:') {
      return false;
    }
    
    // Block private IP ranges (except localhost which we handle above)
    const hostname = parsed.hostname;
    if (hostname !== 'localhost') {
      const privateIpPatterns = [
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^169\.254\./,
      ];

      if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
        return false;
      }
    }

    // Check against allowlist
    return allowedDomains.some(domain => hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Sanitize HTML/text content to prevent XSS
 * Encodes special characters
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize log message to prevent log injection
 */
export function sanitizeLogMessage(message: string): string {
  return sanitizeString(message).slice(0, 1000); // Also limit length
}
