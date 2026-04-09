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

export function sanitizeEdgeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return 'Internal server error';
}
