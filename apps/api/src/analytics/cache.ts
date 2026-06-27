interface Entry {
  value: unknown;
  expires: number;
}

/** Tiny in-memory TTL cache to absorb dashboard polling without re-querying every few seconds. */
export class TtlCache {
  private store = new Map<string, Entry>();
  constructor(private ttlMs = 3000) {}

  async get<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.store.get(key);
    if (hit && hit.expires > now) return hit.value as T;
    const value = await compute();
    this.store.set(key, { value, expires: now + this.ttlMs });
    return value;
  }

  invalidate(key?: string): void {
    if (key) this.store.delete(key);
    else this.store.clear();
  }
}
