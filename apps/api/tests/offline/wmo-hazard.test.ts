import { describe, expect, it } from "vitest";
import { assessHazard, inmetResumoToCondition, wmoToCondition } from "@viatempo/weather-domain";

describe("wmo", () => {
  it("mapeia códigos WMO", () => {
    expect(wmoToCondition(0).condition).toBe("clear");
    expect(wmoToCondition(3).condition).toBe("overcast");
    expect(wmoToCondition(65).condition).toBe("heavy_rain");
    expect(wmoToCondition(95).condition).toBe("storm");
    expect(wmoToCondition(null).condition).toBe("unknown");
  });
  it("resumo INMET -> condição", () => {
    expect(inmetResumoToCondition("Muitas nuvens com chuva isolada")).toBe("rain");
    expect(inmetResumoToCondition("Céu claro")).toBe("clear");
    expect(inmetResumoToCondition(null)).toBeNull();
  });
});

describe("hazard", () => {
  const base = {
    precipitation: { probability: null, amount: 0, intensity: null },
    wind: { speed: 10, gust: 15, direction: 180 },
    visibility: 20000,
    condition: "clear" as const,
    alerts: [],
  };
  it("tempo bom => none", () => {
    expect(assessHazard(base).level).toBe("none");
  });
  it("chuva intensa + rajadas => severe com razões em pt-BR", () => {
    const h = assessHazard({
      ...base,
      precipitation: { probability: 90, amount: 30, intensity: 30 },
      wind: { speed: 40, gust: 64, direction: 200 },
    });
    expect(["alert", "severe"]).toContain(h.level);
    expect(h.reasons.join(" ")).toMatch(/chuva|rajadas/);
  });
  it("nunca deriva probability de amount (amount>0 sem prob => sem 'probabilidade alta')", () => {
    const h = assessHazard({ ...base, precipitation: { probability: null, amount: 5, intensity: 5 } });
    expect(h.reasons.join(" ")).not.toMatch(/probabilidade/);
  });
  it("dados ausentes => unknown/dataGap, nunca 'none' silencioso", () => {
    const h = assessHazard({
      precipitation: { probability: null, amount: null, intensity: null },
      wind: { speed: null, gust: null, direction: null },
      visibility: null,
      condition: null,
      alerts: [],
    });
    expect(h.level).toBe("unknown");
    expect(h.dataGap).toBe(true);
  });
  it("alerta oficial vermelho => severe", () => {
    const h = assessHazard({
      ...base,
      alerts: [{ id: "1", source: "INMET", event: "Onda de Calor", severity: "Grande Perigo", level: 3, headline: null, startsAt: null, endsAt: null }],
    });
    expect(h.level).toBe("severe");
  });
  it("INMET nível 1 (Perigo Potencial) => attention, não alert", () => {
    const h = assessHazard({
      ...base,
      alerts: [{ id: "2", source: "INMET", event: "Tempestade", severity: "Perigo Potencial", level: 1, headline: null, startsAt: null, endsAt: null }],
    });
    expect(h.level).toBe("attention");
  });
});
