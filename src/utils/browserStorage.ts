export type BrowserStorageKind = 'localStorage' | 'sessionStorage';

export function getBrowserStorage(kind: BrowserStorageKind): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window[kind];
  } catch {
    return null;
  }
}

export function safeStorageGetItem(kind: BrowserStorageKind, key: string): string | null {
  try {
    return getBrowserStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeStorageSetItem(kind: BrowserStorageKind, key: string, value: string): boolean {
  try {
    const storage = getBrowserStorage(kind);
    if (!storage) {
      return false;
    }

    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeStorageRemoveItem(kind: BrowserStorageKind, key: string): boolean {
  try {
    const storage = getBrowserStorage(kind);
    if (!storage) {
      return false;
    }

    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
