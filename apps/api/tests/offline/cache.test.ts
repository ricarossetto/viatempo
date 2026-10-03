import { describe, expect, it } from "vitest";
import { MemoryCache, weatherCacheKey } from "@viatempo/providers";

describe("cache", () => {
  it("hit dentro do TTL, stale-while-revalidate depois, miss após janela", () => {
    const c = new MemoryCache<string>(1000, 1000);
    c.set("k", "v", 0);
    expect(c.get("k", 500)).toEqual({ value: "v", fresh: true });
    expect(c.get("k", 1500)).toEqual({ value: "v", fresh: false });
    expect(c.get("k", 3000)).toBeNull();
    expect(c.getStale("k")).toBeNull();
  });
  it("last-known-good sobrevive para fallback", () => {
    const c = new MemoryCache<string>(1000);
    c.set("k", "v", 0);
    expect(c.getStale("k")).toBe("v");
  });
  it("chave estável por célula+hora", () => {
    expect(weatherCacheKey("open-meteo", -28.261, -53.911, "2026-10-01T17:00:00.000Z")).toBe(
      weatherCacheKey("open-meteo", -28.264, -53.915, "2026-10-01T17:45:00.000Z"),
    );
  });
});
