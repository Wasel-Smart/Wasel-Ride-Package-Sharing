export interface JwtValidationResult {
  isValid: boolean;
  reason?: string;
  claims?: Record<string, unknown>;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

export function decodeJwt(token: string): Record<string, unknown> | null {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(segments[1])) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function validateJwtClaims(
  token: string,
  options: {
    audience?: string;
    issuerIncludes?: string;
    requiredClaims?: string[];
  } = {},
): JwtValidationResult {
  const claims = decodeJwt(token);
  if (!claims) {
    return { isValid: false, reason: 'Token payload could not be decoded.' };
  }

  const exp = typeof claims.exp === 'number' ? claims.exp : null;
  if (exp !== null && Date.now() >= exp * 1000) {
    return { isValid: false, reason: 'Token is expired.', claims };
  }

  if (options.audience && claims.aud !== options.audience) {
    return { isValid: false, reason: 'Token audience does not match.', claims };
  }

  if (
    options.issuerIncludes &&
    typeof claims.iss === 'string' &&
    !claims.iss.includes(options.issuerIncludes)
  ) {
    return { isValid: false, reason: 'Token issuer is not trusted.', claims };
  }

  if (options.requiredClaims) {
    const missing = options.requiredClaims.filter((key) => !(key in claims));
    if (missing.length > 0) {
      return {
        isValid: false,
        reason: `Token is missing required claims: ${missing.join(', ')}`,
        claims,
      };
    }
  }

  return { isValid: true, claims };
}
