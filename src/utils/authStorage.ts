export const SUPABASE_AUTH_STORAGE_KEY = 'wasel-auth-token';
export const LOCAL_AUTH_USER_STORAGE_KEY = 'wasel_local_user_v2';

function getBrowserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window[kind];
  } catch {
    return undefined;
  }
}

export function allowPersistentClientAuthFallback(): boolean {
  // Always allow localStorage persistence for better UX - user stays logged in across tabs
  return true;
}

export function clearLegacyPersistentAuthArtifacts(): void {
  if (allowPersistentClientAuthFallback()) {
    return;
  }

  const localStorage = getBrowserStorage('localStorage');
  if (!localStorage) {
    return;
  }

  try {
    localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
    localStorage.removeItem(LOCAL_AUTH_USER_STORAGE_KEY);
  } catch {
    // Ignore client storage cleanup failures.
  }
}

export function getSupabaseAuthStorage(): Storage | undefined {
  clearLegacyPersistentAuthArtifacts();
  return allowPersistentClientAuthFallback()
    ? getBrowserStorage('localStorage')
    : getBrowserStorage('sessionStorage');
}

export function getLocalAuthUserStorage(): Storage | undefined {
  clearLegacyPersistentAuthArtifacts();
  return allowPersistentClientAuthFallback()
    ? getBrowserStorage('localStorage')
    : getBrowserStorage('sessionStorage');
}
