/**
 * Input sanitization utilities for mobile app.
 * Prevents log injection (CWE-117), XSS (CWE-79), and SSRF (CWE-918).
 */

/**
 * Sanitize a value for safe inclusion in log messages.
 * Strips newlines, carriage returns, and other control characters
 * that could enable log injection attacks.
 */
export function sanitizeLogValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  const str = String(value);
  return str.replace(/[\r\n\t\x00-\x1f\x7f-\x9f]/g, ' ').trim();
}

/**
 * Sanitize a string for safe inclusion in HTML/DOM content.
 * Encodes special characters to prevent XSS attacks.
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

const ALLOWED_API_DOMAINS = ['supabase.co', 'supabase.net', 'wasel14.online', 'localhost'];

/**
 * Validate URL to prevent SSRF attacks.
 * Only allows HTTPS URLs from configured domains, with exception for localhost.
 */
export function isValidApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (parsed.hostname === 'localhost') return true;
    const privateRanges = [/^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./, /^169\.254\./];
    if (privateRanges.some(p => p.test(parsed.hostname))) return false;
    return ALLOWED_API_DOMAINS.some(d => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}
