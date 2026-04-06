const AUTH_RETURN_TO_STORAGE_KEY = 'wasel_auth_return_to';
const DEFAULT_AUTH_RETURN_TO = '/app/find-ride';

export function normalizeAuthReturnTo(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  return trimmed;
}

export function buildAuthPagePath(
  tab: 'signin' | 'signup' = 'signin',
  returnTo = DEFAULT_AUTH_RETURN_TO,
): string {
  const params = new URLSearchParams({
    tab,
    returnTo: normalizeAuthReturnTo(returnTo),
  });

  return `/app/auth?${params.toString()}`;
}

export function buildAuthReturnTo(
  pathname: string,
  search = '',
  hash = '',
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  const safePath = normalizeAuthReturnTo(pathname, fallback);
  const normalizedSearch = search.startsWith('?') ? search : search ? `?${search}` : '';
  const normalizedHash = hash.startsWith('#') ? hash : hash ? `#${hash}` : '';
  return `${safePath}${normalizedSearch}${normalizedHash}`;
}

export function persistAuthReturnTo(returnTo: string) {
  try {
    localStorage.setItem(
      AUTH_RETURN_TO_STORAGE_KEY,
      normalizeAuthReturnTo(returnTo),
    );
  } catch {
    // Ignore storage failures and continue with the auth flow.
  }
}

export function readPersistedAuthReturnTo(
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  try {
    return normalizeAuthReturnTo(
      localStorage.getItem(AUTH_RETURN_TO_STORAGE_KEY),
      fallback,
    );
  } catch {
    return fallback;
  }
}

export function consumePersistedAuthReturnTo(
  fallback = DEFAULT_AUTH_RETURN_TO,
): string {
  const value = readPersistedAuthReturnTo(fallback);

  try {
    localStorage.removeItem(AUTH_RETURN_TO_STORAGE_KEY);
  } catch {
    // Ignore storage failures and continue with the auth flow.
  }

  return value;
}
