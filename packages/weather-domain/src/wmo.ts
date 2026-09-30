import type { NormalizedCondition } from "./types.js";

/**
 * WMO Weather interpretation codes (Open-Meteo).
 * https://open-meteo.com/en/docs
 */
export function wmoToCondition(code: unknown): { condition: NormalizedCondition; native: string } {
  if (typeof code !== "number" || !Number.isFinite(code)) return { condition: "unknown", native: "null" };
  const c = Math.round(code);
  if (c === 0) return { condition: "clear", native: "0" };
  if (c === 1) return { condition: "clear", native: "1" };
  if (c === 2) return { condition: "partly_cloudy", native: "2" };
  if (c === 3) return { condition: "overcast", native: "3" };
  if (c === 45 || c === 48) return { condition: "fog", native: String(c) };
  if (c === 51 || c === 53 || c === 55) return { condition: "drizzle", native: String(c) };
  if (c === 56 || c === 57) return { condition: "drizzle", native: String(c) };
  if (c === 61 || c === 63 || c === 65) return { condition: c === 65 ? "heavy_rain" : "rain", native: String(c) };
  if (c === 66 || c === 67) return { condition: "rain", native: String(c) };
  if (c === 71 || c === 73 || c === 75 || c === 77) return { condition: "snow", native: String(c) };
  if (c === 80 || c === 81 || c === 82) return { condition: c === 82 ? "heavy_rain" : "rain", native: String(c) };
  if (c === 85 || c === 86) return { condition: "snow", native: String(c) };
  if (c === 95) return { condition: "storm", native: "95" };
  if (c === 96 || c === 99) return { condition: "storm", native: String(c) };
  return { condition: "unknown", native: String(c) };
}

/** Texto do INMET (ex. "Muitas nuvens com chuva isolada") => condição aproximada. */
export function inmetResumoToCondition(resumo: unknown): NormalizedCondition | null {
  if (typeof resumo !== "string" || !resumo.trim()) return null;
  const s = resumo.toLowerCase();
  if (/(trovoad|tempestade|raios)/.test(s)) return "storm";
  if (/(chuva intensa|chuva forte|temporal|pancadas fortes)/.test(s)) return "heavy_rain";
  if (/(chuva|chuvoso|pancada|garoa|chuvisco)/.test(s)) return /garoa|chuvisco/.test(s) ? "drizzle" : "rain";
  if (/(nevoeiro|névoa|neblina)/.test(s)) return "fog";
  if (/(encoberto|nublado|muitas nuvens)/.test(s)) return "overcast";
  if (/(poucas nuvens|parcialmente|claro|sol)/.test(s)) return /(parcial|poucas)/.test(s) ? "partly_cloudy" : "clear";
  return "unknown";
}
