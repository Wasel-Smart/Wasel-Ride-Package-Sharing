/**
 * Log Sanitizer - Prevents log injection attacks
 * Sanitizes user inputs before logging to prevent CWE-117 vulnerabilities
 */

export function sanitizeForLog(input: unknown): string {
  if (input === null || input === undefined) {
    return 'null';
  }
  
  const str = String(input);
  
  // Remove or encode dangerous characters that could break log integrity.
  return Array.from(str, (char) => {
    switch (char) {
      case '\r':
        return '\\r';
      case '\n':
        return '\\n';
      case '\t':
        return '\\t';
      default: {
        const charCode = char.charCodeAt(0);
        if (charCode === 0) {
          return '\\0';
        }
        if (charCode < 32 || charCode === 127) {
          return `\\x${charCode.toString(16).padStart(2, '0')}`;
        }
        return char;
      }
    }
  }).join('');
}

export function sanitizeObjectForLog(obj: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    sanitized[sanitizeForLog(key)] = sanitizeForLog(value);
  }
  
  return sanitized;
}
