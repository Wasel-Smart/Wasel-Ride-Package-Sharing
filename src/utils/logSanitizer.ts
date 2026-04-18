/**
 * Log Sanitizer - Prevents log injection attacks
 * Sanitizes user inputs before logging to prevent CWE-117 vulnerabilities
 */

export function sanitizeForLog(input: unknown): string {
  if (input === null || input === undefined) {
    return 'null';
  }
  
  const str = String(input);
  
  // Remove or encode dangerous characters that could break log integrity
  return str
    .replace(/\r\n/g, '\\r\\n')  // Windows line endings
    .replace(/\n/g, '\\n')      // Unix line endings
    .replace(/\r/g, '\\r')      // Mac line endings
    .replace(/\t/g, '\\t')      // Tabs
    .replace(/\x00/g, '\\0')    // Null bytes
    .replace(/[\x01-\x1F\x7F]/g, (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`); // Control characters
}

export function sanitizeObjectForLog(obj: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    sanitized[sanitizeForLog(key)] = sanitizeForLog(value);
  }
  
  return sanitized;
}