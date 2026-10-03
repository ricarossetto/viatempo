/** Utilidades de tempo. Tudo em UTC internamente; ISO com offset na borda. */

export function toMs(iso: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new Error(`timestamp inválido: ${iso}`);
  return ms;
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Arredonda para a hora cheia anterior (timestep horário dos providers). */
export function floorHour(iso: string): string {
  const ms = toMs(iso);
  const d = new Date(ms);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

/** Idade em minutos entre dois ISOs. */
export function ageMinutes(fromIso: string, toIsoStr: string): number | null {
  try {
    return Math.max(0, Math.round((Date.parse(toIsoStr) - Date.parse(fromIso)) / 60000));
  } catch {
    return null;
  }
}

/**
 * Interpolação linear entre dois valores horários.
 * target entre t0 e t1. null se qualquer ponta for null.
 */
export function lerpTime(v0: number | null, v1: number | null, t0ms: number, t1ms: number, targetMs: number): number | null {
  if (v0 === null || v1 === null) return null;
  if (t1ms === t0ms) return v0;
  const f = (targetMs - t0ms) / (t1ms - t0ms);
  if (f <= 0) return v0;
  if (f >= 1) return v1;
  return Math.round((v0 + (v1 - v0) * f) * 10) / 10;
}

/** Distância haversine em km. */
export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const a = s1 * s1 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
