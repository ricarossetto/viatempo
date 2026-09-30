import type { GeoPoint, RouteResult } from '../core/types';

export interface TimedPoint {
  point: GeoPoint;
  atISO: string;
  distKm: number;
  elapsedMin: number;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const aa =
    s1 * s1 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

/** Distância acumulada em km ao longo da geometria. */
export function cumulativeKm(geometry: GeoPoint[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < geometry.length; i++) {
    out.push(out[i - 1] + haversineKm(geometry[i - 1], geometry[i]));
  }
  return out;
}

/**
 * Amostragem adaptativa: 1 ponto a cada ~30min ou ~40km, clamp [2, 12].
 * Equidistante em distância, ETA proporcional à distância (OSRM sem tráfego).
 */
export function buildTimedPoints(
  route: RouteResult,
  departureISO: string,
  samplesCount?: number,
): TimedPoint[] {
  const totalKm = route.distanceM / 1000;
  const totalMin = route.durationS / 60;
  const n =
    samplesCount ??
    Math.min(12, Math.max(2, Math.ceil(Math.max(totalMin / 30, totalKm / 40))));
  const depart = new Date(departureISO).getTime();
  const cum = cumulativeKm(route.geometry);
  const total = cum[cum.length - 1] || totalKm || 1;

  const pts: TimedPoint[] = [];
  for (let i = 0; i < n; i++) {
    const targetKm = n === 1 ? 0 : (total * i) / (n - 1);
    const idx = findIndexForDistance(cum, targetKm);
    const elapsedMin = (totalMin * targetKm) / total;
    pts.push({
      point: route.geometry[idx],
      atISO: new Date(depart + elapsedMin * 60_000).toISOString(),
      distKm: targetKm,
      elapsedMin,
    });
  }
  return pts;
}

function findIndexForDistance(cum: number[], target: number): number {
  let lo = 0;
  for (let i = 0; i < cum.length; i++) {
    if (cum[i] <= target) lo = i;
    else break;
  }
  return lo;
}
