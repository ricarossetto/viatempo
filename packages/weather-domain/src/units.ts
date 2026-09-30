/** Conversões de unidade. Entrada desconhecida => null (nunca NaN). */

export function msToKmh(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return round1(v * 3.6);
}

export function kmh(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return round1(v);
}

export function paToHpa(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return round1(v / 100);
}

export function kgM2ToMm(v: unknown): number | null {
  // 1 kg/m² de água == 1 mm
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return round2(v);
}

export function pct(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < 0 || v > 100) return null;
  return Math.round(v);
}

export function directionDeg(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const d = ((v % 360) + 360) % 360;
  return Math.round(d);
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Sentinelas comuns em APIs BR (ex.: -999, 9999, strings vazias) => null. */
export function cleanNumber(v: unknown, sentinels: number[] = [-999, -999.0, 9999]): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : (v as number);
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (sentinels.includes(n)) return null;
  return n;
}
