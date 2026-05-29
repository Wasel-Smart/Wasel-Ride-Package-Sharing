export interface PlatformRequestContext {
  correlationId: string;
  idempotencyKey: string;
  locale: string;
  requestId: string;
  sessionId: string;
  timestamp: string;
}

function randomId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return uuid;
  }

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}-${Date.now()}-${hex}`;
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return randomId('session');
  }

  const key = 'wasel:platform-session-id';
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) {
      return existing;
    }

    const created = randomId('session');
    window.sessionStorage.setItem(key, created);
    return created;
  } catch {
    return randomId('session');
  }
}

export function createRequestContext(locale = 'en'): PlatformRequestContext {
  const requestId = randomId('req');
  return {
    correlationId: randomId('corr'),
    idempotencyKey: randomId('idem'),
    locale,
    requestId,
    sessionId: getOrCreateSessionId(),
    timestamp: new Date().toISOString(),
  };
}

export function toRequestHeaders(context: PlatformRequestContext): Record<string, string> {
  return {
    'x-correlation-id': context.correlationId,
    'x-idempotency-key': context.idempotencyKey,
    'x-request-id': context.requestId,
    'x-session-id': context.sessionId,
    'x-request-timestamp': context.timestamp,
    'x-request-locale': context.locale,
    'x-api-version': '2026-04-27',
  };
}
