type RateLimitRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};


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

export async function consumeRateLimitToken(
  admin: RateLimitRpcClient,
  args: {
    key: string;
    maxRequests: number;
    windowMs: number;
  },
): Promise<{ allowed: boolean; unavailable: boolean }> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(args.key));
  const bucketKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const { data, error } = await admin.rpc('consume_edge_rate_limit', {
    p_bucket_key: bucketKey,
    p_max_requests: args.maxRequests,
    p_window_seconds: Math.max(1, Math.ceil(args.windowMs / 1000)),
  });

  if (error || typeof data !== 'boolean') {
    return { allowed: false, unavailable: true };
  }

  return { allowed: data, unavailable: false };
}

export function sanitizeEdgeErrorMessage(_error: unknown): string {
  // Never return provider, SQL, or implementation details to callers.
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
      new Uint8Array(encodeBytes(secret)),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, new Uint8Array(encodeBytes(`${timestamp}.${payload}`)));
    const expected = Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    return signatures.some((candidate) => timingSafeEqual(expected, candidate));
  } catch {
    return false;
  }
}
