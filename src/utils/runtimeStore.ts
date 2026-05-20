const runtimeStore = new Map<string, unknown>();

export function readRuntimeState<T>(key: string, fallback: T): T {
  return runtimeStore.has(key) ? (runtimeStore.get(key) as T) : fallback;
}

export function writeRuntimeState<T>(key: string, value: T): T {
  runtimeStore.set(key, value);
  return value;
}

export function updateRuntimeState<T>(
  key: string,
  fallback: T,
  updater: (current: T) => T,
): T {
  const next = updater(readRuntimeState(key, fallback));
  runtimeStore.set(key, next);
  return next;
}

export function clearRuntimeState(key: string): void {
  runtimeStore.delete(key);
}

export function clearRuntimeStateByPrefix(prefix: string): void {
  for (const key of runtimeStore.keys()) {
    if (key.startsWith(prefix)) {
      runtimeStore.delete(key);
    }
  }
}

export function clearAllRuntimeState(): void {
  runtimeStore.clear();
}
