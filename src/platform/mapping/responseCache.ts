interface CachedValue<TValue> {
  expiresAt: number;
  value: TValue;
}

export class MapResponseCache<TValue> {
  private readonly store = new Map<string, CachedValue<TValue>>();

  constructor(private readonly ttlMs = 60_000) {}

  get(key: string): TValue | null {
    const value = this.store.get(key);
    if (!value) {
      return null;
    }
    if (value.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return value.value;
  }

  set(key: string, value: TValue): void {
    this.store.set(key, {
      expiresAt: Date.now() + this.ttlMs,
      value,
    });
  }

  clear(): void {
    this.store.clear();
  }
}
