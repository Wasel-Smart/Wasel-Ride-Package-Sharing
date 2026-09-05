const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function isVercelPreviewUrl ( hostname: string ): boolean {
  return /^(?:wasel|wasel14|wasel-14|wasel14\.online)-[a-z0-9-]*--[^\.]+\.vercel\.app$/.test( hostname )
    || hostname.endsWith( '.vercel.app' )
    || hostname.endsWith( '.vercel-dev.com' );
}

function normalizeOrigin(origin: string | null | undefined): string | null {
  if (!origin) return null;

  try {
    const parsed = new URL(origin);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function splitConfiguredOrigins(origins: string | null | undefined): string[] {
  return String(origins ?? '')
    .split(/[,\r\n\s]+/)
    .map(value => value.trim())
    .filter(Boolean);
}

export function buildAllowedOrigins(
  appBaseUrl: string,
  configuredOrigins?: string | null,
  allowLocalOrigins = false,
): string[] {
  const normalizedBase = normalizeOrigin(appBaseUrl);
  // Preserve the original scheme when deriving the non-www variant. The
  // previous implementation replaced the matched prefix with a hardcoded
  // 'http://', which silently downgraded an https base URL (e.g.
  // https://www.wasel14.online) to an insecure http origin
  // (http://wasel14.online) that should never appear in an allow-list.
  const baseWithoutWww = normalizedBase?.replace(/^(https?:\/\/)www\./, '$1');
  const baseWithWww = normalizedBase?.startsWith('http://') || normalizedBase?.startsWith('https://')
    ? normalizedBase.replace(/^https?:\/\//, 'https://www.')
    : null;

  const candidates = [
    normalizedBase,
    baseWithoutWww,
    baseWithWww,
    ...(allowLocalOrigins ? DEFAULT_LOCAL_ORIGINS : []),
    ...splitConfiguredOrigins(configuredOrigins).map(value => normalizeOrigin(value)),
  ];

  // Auto-detect Vercel deployment URLs and preview URLs from env.
  // On Supabase Edge Functions, VERCEL_URL isn't available, but the
  // ALLOWED_ORIGINS env var (mapped from Vercel's env) can carry
  // the production deployment domain. We also accept any *.vercel.app
  // hostname in non-production or when explicitly listed, so preview
  // deployments from CI branches work without manual allow-list updates.
  const vercelUrl = Deno.env.get('VERCEL_URL');
  if (vercelUrl) {
    try {
      const parsed = new URL(`https://${vercelUrl}`);
      if (isVercelPreviewUrl(parsed.hostname)) {
        candidates.push(`https://${vercelUrl}`);
      }
    } catch {
      // ignore invalid VERCEL_URL
    }
  }

  // In dev mode, accept all Vercel preview URLs automatically.
  const env = Deno.env.get('APP_ENV') ?? Deno.env.get('NODE_ENV') ?? 'production';
  if (env === 'development') {
    candidates.push('https://*.vercel.app');
  }

  const unique = Array.from(new Set(candidates.filter((value): value is string => Boolean(value))));

  // Always ensure both www and non-www variants of the app base are present.
  if (normalizedBase) {
    const wwwVariant = normalizedBase.replace(/^(https?:\/\/)([^.]+)\./, '$1');
    const nonWwwVariant = normalizedBase.startsWith('https://www.')
      ? `https://${normalizedBase.slice(12)}`
      : `https://www.${normalizedBase.slice(8)}`;
    const variants = [wwwVariant, nonWwwVariant];
    for (const variant of variants) {
      if (variant && !unique.includes(variant)) {
        unique.push(variant);
      }
    }
  }

  return unique;
}

export function resolveAllowedOrigin(
  requestOrigin: string | null | undefined,
  appBaseUrl: string,
  configuredOrigins?: string | null,
  allowLocalOrigins = false,
): string | null {
  const normalizedOrigin = normalizeOrigin(requestOrigin);
  if (!normalizedOrigin) {
    return null;
  }

  const allowed = buildAllowedOrigins(appBaseUrl, configuredOrigins, allowLocalOrigins);

  if (allowed.includes(normalizedOrigin)) {
    return normalizedOrigin;
  }

  // Support wildcard origins (e.g. 'https://*.vercel.app') for preview deployments
  if (allowLocalOrigins) {
    for (const entry of allowed) {
      if (entry.endsWith('*.vercel.app')) {
        const prefix = entry.slice(0, -'*.vercel.app'.length);
        if (normalizedOrigin.startsWith(prefix) && normalizedOrigin.endsWith('.vercel.app')) {
          return normalizedOrigin;
        }
      }
    }
  }

  if (typeof console !== 'undefined' && console.warn) {
    const env = Deno.env.get('APP_ENV') ?? Deno.env.get('NODE_ENV') ?? 'production';
    if (env === 'development') {
      console.warn('[security] Origin not allowed:', normalizedOrigin, 'allowed:', allowed);
    }
  }

  return null;
}

export function isRuntimeAdminEnabled(flag: string | null | undefined): boolean {
  return String(flag ?? '').trim().toLowerCase() === 'true';
}

export function buildPublicHealthPayload(service: string) {
  return {
    ok: true,
    service,
  };
}
