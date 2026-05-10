export interface PlatformRequestContext {
  correlationId: string;
  idempotencyKey: string;
  locale: string;
  requestId: string;
  sessionId: string;
  timestamp: string;
}

function generateHexEntropy(byteLength: number): string {
  try {
    const bytes = new Uint8Array(byteLength);
    globalThis.crypto?.getRandomValues?.(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch {
    return Array.from({ length: byteLength }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
  }
}

function randomId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return `${prefix}-${uuid}`;
  }

  return `${prefix}-${Date.now()}-${generateHexEntropy(16)}`;
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
