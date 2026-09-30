import { describe, expect, it } from "vitest";
import { floorHour, haversineKm, lerpTime } from "@viatempo/weather-domain";
import { sampleTimedPoints } from "@viatempo/routing";

describe("time", () => {
  it("floorHour arredonda para a hora cheia UTC", () => {
    expect(floorHour("2026-10-01T14:30:00-03:00")).toBe("2026-10-01T17:00:00.000Z");
  });
  it("lerpTime interpola e propaga null", () => {
    const t0 = Date.parse("2026-10-01T17:00:00Z");
    expect(lerpTime(20, 22, t0, t0 + 3600000, t0 + 1800000)).toBe(21);
    expect(lerpTime(null, 22, t0, t0 + 3600000, t0 + 1800000)).toBeNull();
  });
  it("haversine Ijuí→Porto Alegre ≈ 327 km em linha reta (rodovia ≈ 420 km)", () => {
    const d = haversineKm(-28.26, -53.91, -30.03, -51.22);
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(360);
  });
});

describe("trip sampling", () => {
  it("amostra origem→destino com ETAs crescentes", () => {
    const coords: [number, number][] = [
      [-53.91, -28.26],
      [-53.0, -29.0],
      [-51.22, -30.03],
    ];
    const pts = sampleTimedPoints(coords, "2026-10-01T14:30:00-03:00", 6 * 3600, 4);
    expect(pts).toHaveLength(4);
    expect(pts[0].label).toBe("origem");
    expect(pts[3].label).toBe("destino");
    const etas = pts.map((p) => Date.parse(p.eta));
    expect([...etas].sort((a, b) => a - b)).toEqual(etas);
    expect(pts[3].distanceFromStartKm).toBeGreaterThan(300);
  });
});
