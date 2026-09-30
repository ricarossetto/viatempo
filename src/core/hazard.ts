import type { HazardLevel, WeatherSample } from './types';
import { wmoToLabel, wmoWeight } from '../lib/wmo';

export interface HazardResult {
  level: HazardLevel;
  score: number;
  reason: string;
}

/**
 * Hazard index v1: 50% chuva + 30% vento + 20% WMO.
 * Thresholds fixos p/ legenda estável no mapa.
 */
export function evaluateHazard(w: WeatherSample): HazardResult {
  const windNorm = Math.min(w.windKmh / 60, 1) * 100;
  const score = Math.round(0.5 * w.precipitationProb + 0.3 * windNorm + 0.2 * wmoWeight(w.weatherCode));
  const level: HazardLevel = score >= 61 ? 'perigo' : score >= 31 ? 'atencao' : 'ok';
  const parts: string[] = [];
  if (w.precipitationProb >= 30) parts.push(`chuva ${Math.round(w.precipitationProb)}%`);
  const info = wmoToLabel(w.weatherCode);
  if (w.weatherCode >= 45) parts.push(info.label.toLowerCase());
  if (w.windKmh >= 40) parts.push(`vento ${Math.round(w.windKmh)} km/h`);
  if (w.visibilityM > 0 && w.visibilityM < 1000) parts.push('visibilidade baixa');
  return { level, score, reason: parts.join(' + ') || 'tempo bom' };
}
