export interface ICache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMin: number): void;
}

export function createCache(prefix = 'rotawx'): ICache {
  const mem = new Map<string, { exp: number; val: unknown }>();
  return {
    get<T>(key: string): T | null {
      const k = `${prefix}:${key}`;
      const hit = mem.get(k);
      if (hit && hit.exp > Date.now()) return hit.val as T;
      try {
        const raw = localStorage.getItem(k);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { exp: number; val: T };
        if (parsed.exp < Date.now()) {
          localStorage.removeItem(k);
          return null;
        }
        mem.set(k, parsed);
        return parsed.val;
      } catch {
        return null;
      }
    },
    set<T>(key: string, value: T, ttlMin: number): void {
      const k = `${prefix}:${key}`;
      const entry = { exp: Date.now() + ttlMin * 60_000, val: value };
      mem.set(k, entry);
      try {
        localStorage.setItem(k, JSON.stringify(entry));
      } catch {
        /* storage cheio: segue só em memória */
      }
    },
  };
}
