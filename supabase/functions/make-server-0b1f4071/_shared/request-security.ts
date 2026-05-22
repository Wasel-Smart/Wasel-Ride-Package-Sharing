const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:3002',
  'http://127.0.0.1:3002',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

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
): string[] {
  const candidates = [
    normalizeOrigin(appBaseUrl),
    ...DEFAULT_LOCAL_ORIGINS,
    ...splitConfiguredOrigins(configuredOrigins).map(value => normalizeOrigin(value)),
  ];

  return Array.from(new Set(candidates.filter((value): value is string => Boolean(value))));
}

export function resolveAllowedOrigin(
  requestOrigin: string | null | undefined,
  appBaseUrl: string,
  configuredOrigins?: string | null,
): string | null {
  const normalizedOrigin = normalizeOrigin(requestOrigin);
  if (!normalizedOrigin) {
    return null;
  }

  return buildAllowedOrigins(appBaseUrl, configuredOrigins).includes(normalizedOrigin)
    ? normalizedOrigin
    : null;
}

export function isRuntimeAdminEnabled(flag: string | null | undefined): boolean {
  return String(flag ?? '').trim().toLowerCase() === 'true';
}

export function buildPublicHealthPayload(service: string) {
  return {
    ok: true,
    service,
    timestamp: new Date().toISOString(),
  };
}
