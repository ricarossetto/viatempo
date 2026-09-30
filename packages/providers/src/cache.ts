/** Cache em memória com TTL + stale-while-revalidate + last-known-good. */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  storedAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  stale: number;
}

export class MemoryCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  readonly stats: CacheStats = { hits: 0, misses: 0, stale: 0 };
  constructor(private ttlMs: number, private staleMs = 0) {}

  get(key: string, now = Date.now()): { value: T; fresh: boolean } | null {
    const e = this.map.get(key);
    if (!e) {
      this.stats.misses++;
      return null;
    }
    if (now <= e.expiresAt) {
      this.stats.hits++;
      return { value: e.value, fresh: true };
    }
    if (this.staleMs > 0 && now <= e.expiresAt + this.staleMs) {
      this.stats.stale++;
      return { value: e.value, fresh: false };
    }
    this.map.delete(key);
    this.stats.misses++;
    return null;
  }

  set(key: string, value: T, now = Date.now(), ttlMs = this.ttlMs): void {
    this.map.set(key, { value, storedAt: now, expiresAt: now + ttlMs });
  }

  /** Last-known-good mesmo expirado (para fallback degradado). */
  getStale(key: string): T | null {
    return this.map.get(key)?.value ?? null;
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}

/** Chave estável: provider + célula ~1km + hora. */
export function weatherCacheKey(provider: string, lat: number, lon: number, hourIso: string): string {
  return `${provider}:${lat.toFixed(2)}:${lon.toFixed(2)}:${hourIso.slice(0, 13)}`;
}
