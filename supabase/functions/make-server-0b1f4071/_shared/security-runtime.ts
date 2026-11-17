import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';


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
  admin: SupabaseClient,
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

export function sanitizeEdgeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  return 'Internal server error';
}
