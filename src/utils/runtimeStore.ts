const runtimeStore = new Map<string, unknown>();
const runtimeStoreListeners = new Set<(key: string) => void>();

function notifyRuntimeStoreListeners(key: string): void {
  for (const listener of runtimeStoreListeners) {
    try {
      listener(key);
    } catch {
      // Runtime cache listeners must never break the write path.
    }
  }
}

export function readRuntimeState<T>(key: string, fallback: T): T {
  return runtimeStore.has(key) ? (runtimeStore.get(key) as T) : fallback;
}

export function writeRuntimeState<T>(key: string, value: T): T {
  runtimeStore.set(key, value);
  notifyRuntimeStoreListeners(key);
  return value;
}

export function updateRuntimeState<T>(
  key: string,
  fallback: T,
  updater: (current: T) => T,
): T {
  const next = updater(readRuntimeState(key, fallback));
  runtimeStore.set(key, next);
  notifyRuntimeStoreListeners(key);
  return next;
}

export function clearRuntimeState(key: string): void {
  if (runtimeStore.delete(key)) {
    notifyRuntimeStoreListeners(key);
  }
}

export function clearRuntimeStateByPrefix(prefix: string): void {
  for (const key of runtimeStore.keys()) {
    if (key.startsWith(prefix)) {
      runtimeStore.delete(key);
      notifyRuntimeStoreListeners(key);
    }
  }
}

export function clearAllRuntimeState(): void {
  const keys = Array.from(runtimeStore.keys());
  runtimeStore.clear();
  for (const key of keys) {
    notifyRuntimeStoreListeners(key);
  }
}

export function subscribeRuntimeState(listener: (key: string) => void): () => void {
  runtimeStoreListeners.add(listener);
  return () => {
    runtimeStoreListeners.delete(listener);
  };
}
