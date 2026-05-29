/**
 * Input Sanitization Utilities
 * Prevents XSS, Code Injection, and Log Injection attacks
 */

export function sanitizeForLog(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  const str = String(input);
  // Remove newlines and control characters to prevent log injection
  return str.replace(/[\r\n\t\x00-\x1F\x7F]/g, '');
}

export function sanitizeForHTML(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  const str = String(input);
  const map: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return str.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

export function sanitizeTrackingId(trackingId: string): string {
  // Only allow alphanumeric, hyphens, and underscores
  return trackingId.replace(/[^a-zA-Z0-9\-_]/g, '');
}

export function sanitizeNumericString(input: string): string {
  // Only allow digits, decimal point, and minus sign
  return input.replace(/[^0-9.\-]/g, '');
}

export function isValidURL(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    // Block private IP ranges
    const privateRanges = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^localhost$/,
    ];
    
    if (privateRanges.some(range => range.test(hostname))) {
      return false;
    }
    
    // Check against allowlist
    return allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}
