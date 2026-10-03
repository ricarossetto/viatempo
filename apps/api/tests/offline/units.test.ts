import { describe, expect, it } from "vitest";
import { cleanNumber, kgM2ToMm, msToKmh, paToHpa, pct } from "@viatempo/weather-domain";

describe("units", () => {
  it("converte m/s -> km/h (INMET VEN_VEL 3.4 m/s ≈ 12.2 km/h)", () => {
    expect(msToKmh(3.4)).toBeCloseTo(12.2, 1);
  });
  it("nunca retorna NaN: entrada inválida => null", () => {
    expect(msToKmh(NaN)).toBeNull();
    expect(msToKmh("x" as unknown as number)).toBeNull();
    expect(pct(150)).toBeNull();
    expect(pct(-1)).toBeNull();
  });
  it("Pa -> hPa e kg/m² -> mm", () => {
    expect(paToHpa(101325)).toBeCloseTo(1013.3, 1);
    expect(kgM2ToMm(9.625)).toBeCloseTo(9.63, 2);
  });
  it("sentinelas viram null", () => {
    expect(cleanNumber(-999)).toBeNull();
    expect(cleanNumber("")).toBeNull();
    expect(cleanNumber("21,8")).toBeCloseTo(21.8, 1);
  });
});
