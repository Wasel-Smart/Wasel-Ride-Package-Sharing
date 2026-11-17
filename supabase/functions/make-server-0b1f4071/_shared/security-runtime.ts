type RateLimitState = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitState>();

function encodeBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = encodeBytes(left);
  const rightBytes = encodeBytes(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length === rightBytes.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}

export function isAllowedOrigin(origin: string | null, appUrl: string | null): boolean {
  if (!origin || !appUrl) {
    return false;
  }

  try {
    return new URL(origin).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('cf-connecting-ip')?.trim()
    || 'unknown';
}

export function takeRateLimitToken(args: {
  key: string;
  maxRequests: number;
  windowMs: number;
}): boolean {
  const now = Date.now();
  const current = rateLimitStore.get(args.key);

  if (!current || now >= current.resetAt) {
    rateLimitStore.set(args.key, {
      count: 1,
      resetAt: now + args.windowMs,
    });
    return true;
  }

  current.count += 1;
  return current.count <= args.maxRequests;
}

export function sanitizeEdgeErrorMessage(_error: unknown): string {
  // Exception messages may contain provider responses, SQL details, identifiers,
  // or other implementation data. Keep client-facing failures generic; log
  // structured diagnostics separately on the server without returning them.
  return 'Internal server error';
}


export async function verifyTimestampedHmacSignature(
  secret: string,
  payload: string,
  signatureHeader: string | null,
  toleranceSeconds = 300,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!secret || !signatureHeader || !Number.isFinite(nowMs) || !Number.isFinite(toleranceSeconds) || toleranceSeconds < 0) {
    return false;
  }

  const parts = signatureHeader.split(',').map((part) => {
    const separator = part.indexOf('=');
    return separator > 0
      ? [part.slice(0, separator).trim(), part.slice(separator + 1).trim()] as const
      : ['', ''] as const;
  });
  const timestampValue = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key, value]) => key === 'v1' && value).map(([, value]) => value);
  if (!timestampValue || !/^\d+$/.test(timestampValue)) {
    return false;
  }
  const timestamp = Number(timestampValue);

  if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || signatures.length === 0) {
    return false;
  }
  if (Math.abs(nowMs / 1000 - timestamp) > toleranceSeconds) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encodeBytes(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, encodeBytes(`${timestamp}.${payload}`));
    const expected = Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    return signatures.some((candidate) => timingSafeEqual(expected, candidate));
  } catch {
    return false;
  }
}


export function generateSixDigitOtp(): string {
  const range = 900_000;
  const ceiling = Math.floor(0x1_0000_0000 / range) * range;
  const random = new Uint32Array(1);
  let value = 0;

  do {
    crypto.getRandomValues(random);
    value = random[0] ?? 0;
  } while (value >= ceiling);

  return String(100_000 + (value % range));
}
