export const SUPABASE_AUTH_STORAGE_KEY = 'wasel-auth-token';
export const LOCAL_AUTH_USER_STORAGE_KEY = 'wasel_local_user_v2';

const AUTH_PERSISTENCE_STORAGE_KEY = 'wasel_auth_persistence_v1';
const STORAGE_KEYS_TO_MIGRATE = [SUPABASE_AUTH_STORAGE_KEY, LOCAL_AUTH_USER_STORAGE_KEY] as const;

type AuthPersistenceMode = 'local' | 'session';

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

function getPersistenceStore(): Storage | undefined {
  return getBrowserStorage('localStorage');
}

function readStoredPersistenceMode(): AuthPersistenceMode {
  const store = getPersistenceStore();
  if (!store) {
    return 'local';
  }

  try {
    return store.getItem(AUTH_PERSISTENCE_STORAGE_KEY) === 'session' ? 'session' : 'local';
  } catch {
    return 'local';
  }
}

function writeStoredPersistenceMode(mode: AuthPersistenceMode): void {
  const store = getPersistenceStore();
  if (!store) {
    return;
  }

  try {
    store.setItem(AUTH_PERSISTENCE_STORAGE_KEY, mode);
  } catch {
    // Ignore persistence failures and continue with runtime defaults.
  }
}

function getActiveStorage(mode = readStoredPersistenceMode()): Storage | undefined {
  return getBrowserStorage(mode === 'session' ? 'sessionStorage' : 'localStorage');
}

function getInactiveStorage(mode = readStoredPersistenceMode()): Storage | undefined {
  return getBrowserStorage(mode === 'session' ? 'localStorage' : 'sessionStorage');
}

function migrateStorageKeys(mode: AuthPersistenceMode): void {
  const targetStorage = getActiveStorage(mode);
  const staleStorage = getInactiveStorage(mode);

  if (!targetStorage || !staleStorage) {
    return;
  }

  for (const key of STORAGE_KEYS_TO_MIGRATE) {
    try {
      const staleValue = staleStorage.getItem(key);
      if (staleValue !== null) {
        targetStorage.setItem(key, staleValue);
      }
      staleStorage.removeItem(key);
    } catch {
      // Ignore individual storage migration failures.
    }
  }
}

function createAdaptiveStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return {
    get length() {
      return getActiveStorage()?.length ?? 0;
    },
    clear() {
      getActiveStorage()?.clear();
      getInactiveStorage()?.clear();
    },
    getItem(key: string) {
      const activeStorage = getActiveStorage();
      const inactiveStorage = getInactiveStorage();
      return activeStorage?.getItem(key) ?? inactiveStorage?.getItem(key) ?? null;
    },
    key(index: number) {
      return getActiveStorage()?.key(index) ?? null;
    },
    removeItem(key: string) {
      getActiveStorage()?.removeItem(key);
      getInactiveStorage()?.removeItem(key);
    },
    setItem(key: string, value: string) {
      getActiveStorage()?.setItem(key, value);
      getInactiveStorage()?.removeItem(key);
    },
  };
}

const adaptiveStorage = createAdaptiveStorage();

export function getAuthPersistencePreference(): boolean {
  return readStoredPersistenceMode() === 'local';
}

export function setAuthPersistencePreference(remember: boolean): void {
  const mode: AuthPersistenceMode = remember ? 'local' : 'session';
  writeStoredPersistenceMode(mode);
  migrateStorageKeys(mode);
}

export function clearLegacyPersistentAuthArtifacts(): void {
  // No-op: auth persistence is now user-selectable and intentionally migrates
  // between localStorage and sessionStorage.
}

export function getSupabaseAuthStorage(): Storage | undefined {
  return adaptiveStorage;
}

export function getLocalAuthUserStorage(): Storage | undefined {
  return adaptiveStorage;
}
