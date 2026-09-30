import type { HazardAssessment, HazardLevel, NormalizedWeather } from "./types.js";

export interface HazardThresholds {
  rainAttentionMm: number;
  rainAlertMm: number;
  rainSevereMm: number;
  gustAttentionKmh: number;
  gustAlertKmh: number;
  gustSevereKmh: number;
  windAttentionKmh: number;
  windAlertKmh: number;
  visibilityAlertM: number;
  visibilitySevereM: number;
}

export const DEFAULT_THRESHOLDS: HazardThresholds = {
  rainAttentionMm: 2.5,
  rainAlertMm: 10,
  rainSevereMm: 25,
  gustAttentionKmh: 50,
  gustAlertKmh: 65,
  gustSevereKmh: 80,
  windAttentionKmh: 40,
  windAlertKmh: 55,
  visibilityAlertM: 1000,
  visibilitySevereM: 300,
};

function fmtKmh(v: number): string {
  return `${Math.round(v)} km/h`;
}

/**
 * Regras claras e transparentes para viagem de carro.
 * Ausência de dados => dataGap=true e level no máximo "unknown"/rebaixado,
 * nunca "none" silencioso quando campos críticos faltam.
 */
export function assessHazard(
  w: Pick<NormalizedWeather, "precipitation" | "wind" | "visibility" | "condition" | "alerts">,
  thresholds: HazardThresholds = DEFAULT_THRESHOLDS,
): HazardAssessment {
  const reasons: string[] = [];
  let score = 0; // 0 none, 1 attention, 2 alert, 3 severe

  const amt = w.precipitation.amount;
  const prob = w.precipitation.probability;
  const gust = w.wind.gust;
  const speed = w.wind.speed;
  const vis = w.visibility;

  const criticalMissing: string[] = [];
  if (amt === null) criticalMissing.push("precipitation.amount");
  if (gust === null && speed === null) criticalMissing.push("wind");
  if (vis === null) criticalMissing.push("visibility");

  if (amt !== null) {
    if (amt >= thresholds.rainSevereMm) {
      score = Math.max(score, 3);
      reasons.push(`chuva intensa prevista (${amt} mm/h)`);
    } else if (amt >= thresholds.rainAlertMm) {
      score = Math.max(score, 2);
      reasons.push(`chuva forte prevista (${amt} mm/h)`);
    } else if (amt >= thresholds.rainAttentionMm) {
      score = Math.max(score, 1);
      reasons.push(`chuva moderada prevista (${amt} mm/h)`);
    } else if (amt > 0) {
      reasons.push(`chuva fraca prevista (${amt} mm/h)`);
    }
  }

  if (typeof prob === "number" && amt !== null && amt > 0) {
    if (prob >= 70 && amt >= thresholds.rainAttentionMm) {
      reasons.push(`probabilidade alta (${prob}%)`);
      score = Math.max(score, Math.min(3, score + 1));
    }
  }

  const g = gust ?? speed;
  if (g !== null) {
    if (g >= thresholds.gustSevereKmh) {
      score = Math.max(score, 3);
      reasons.push(`rajadas de ${fmtKmh(g)}`);
    } else if (g >= thresholds.gustAlertKmh) {
      score = Math.max(score, 2);
      reasons.push(`rajadas de ${fmtKmh(g)}`);
    } else if (g >= thresholds.gustAttentionKmh) {
      score = Math.max(score, 1);
      reasons.push(`rajadas de ${fmtKmh(g)}`);
    }
  }

  if (vis !== null) {
    if (vis < thresholds.visibilitySevereM) {
      score = Math.max(score, 3);
      reasons.push(`visibilidade muito baixa (${vis} m)`);
    } else if (vis < thresholds.visibilityAlertM) {
      score = Math.max(score, 2);
      reasons.push(`visibilidade baixa (${vis} m)`);
    }
  }

  if (w.condition === "storm") {
    score = Math.max(score, 3);
    reasons.push("tempestade prevista");
  } else if (w.condition === "heavy_rain") {
    score = Math.max(score, 2);
    if (!reasons.some((r) => r.includes("chuva"))) reasons.push("chuva intensa prevista");
  } else if (w.condition === "fog") {
    score = Math.max(score, 2);
    reasons.push("nevoeiro previsto");
  }

  for (const a of w.alerts ?? []) {
    const sev = (a.severity ?? "").toLowerCase();
    const lvl = a.level ?? 0;
    if (/grande perigo|perigo iminente|extremo|severo|vermelho/.test(sev) || lvl >= 3) {
      score = Math.max(score, 3);
      reasons.push(`alerta oficial: ${a.event}`);
    } else if (/potencial|amarelo/.test(sev) || lvl <= 1) {
      // INMET nível 1 ("Perigo Potencial", amarelo): atenção, não alerta.
      score = Math.max(score, 1);
      reasons.push(`alerta oficial: ${a.event}`);
    } else if (/perigo|laranja/.test(sev) || lvl === 2) {
      score = Math.max(score, 2);
      reasons.push(`alerta oficial: ${a.event}`);
    } else if (a.event) {
      score = Math.max(score, 1);
      reasons.push(`alerta oficial: ${a.event}`);
    }
  }

  const completeness = criticalMissing.length === 0 ? 1 : criticalMissing.length === 1 ? 0.66 : 0.33;
  const dataGap = criticalMissing.length >= 2;

  let level: HazardLevel = score === 0 ? "none" : score === 1 ? "attention" : score === 2 ? "alert" : "severe";
  if (dataGap && level === "none") level = "unknown";
  if (dataGap && reasons.length === 0) reasons.push("dados incompletos — ausência de dados não significa condição segura");

  return { level, reasons, completeness, dataGap };
}
