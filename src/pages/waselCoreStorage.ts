import { safeStorageGetItem, safeStorageSetItem } from '../utils/browserStorage';

export function readStoredStringList(key: string): string[] {
  try {
    const raw = safeStorageGetItem('sessionStorage', key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeStoredStringList(key: string, values: string[]) {
  safeStorageSetItem('sessionStorage', key, JSON.stringify(values));
}

export function readStoredObject<T>(key: string, fallback: T): T {
  try {
    const raw = safeStorageGetItem('sessionStorage', key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
