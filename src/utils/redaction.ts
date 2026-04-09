const SENSITIVE_KEY_PATTERN = /(authorization|token|secret|password|cookie|apikey|api_key|key|otp|code|backup|credential)/i;

function redactString(value: string): string {
  if (!value) return value;
  if (value.length <= 8) return '[REDACTED]';
  return `${value.slice(0, 2)}...[REDACTED]...${value.slice(-2)}`;
}

export function redactSensitiveValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          return [key, typeof entry === 'string' ? redactString(entry) : '[REDACTED]'];
        }
        return [key, redactSensitiveValue(entry)];
      }),
    );
  }

  if (typeof value === 'string' && value.startsWith('Bearer ')) {
    return 'Bearer [REDACTED]';
  }

  return value;
}

export function sanitizeErrorMessage(error: unknown, fallback = 'Unexpected error'): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : fallback;

  return String(redactSensitiveValue(message));
}
