import { haversineKm } from "@viatempo/weather-domain";
import { MemoryCache } from "@viatempo/providers";

export interface Route {
  distanceM: number;
  durationS: number;
  coordinates: [number, number][];
  bbox: [number, number, number, number] | null;
  source: string;
}

const cache = new MemoryCache<Route>(24 * 3600 * 1000);

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "ViaTempo/1.0 (contato: viatempo)", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Rota OSRM (demo público; self-host em produção). */
export async function route(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): Promise<Route> {
  const key = `route:${from.latitude.toFixed(3)},${from.longitude.toFixed(3)}:${to.latitude.toFixed(3)},${to.longitude.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit) return hit.value;
  const url =
    `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=geojson`;
  const data = (await getJson(url, 12000)) as {
    code: string;
    routes?: { distance: number; duration: number; geometry?: { coordinates: [number, number][] } }[];
  };
  if (data.code !== "Ok" || !data.routes?.[0]) throw new Error(`roteamento falhou (code=${data.code})`);
  const r = data.routes[0];
  const coords = r.geometry?.coordinates ?? [];
  let bbox: Route["bbox"] = null;
  if (coords.length > 0) {
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const [lo, la] of coords) {
      if (lo < minLon) minLon = lo;
      if (la < minLat) minLat = la;
      if (lo > maxLon) maxLon = lo;
      if (la > maxLat) maxLat = la;
    }
    bbox = [minLon, minLat, maxLon, maxLat];
  }
  const out: Route = { distanceM: r.distance, durationS: r.duration, coordinates: coords, bbox, source: "osrm-demo" };
  cache.set(key, out);
  return out;
}

export interface TimedPoint {
  latitude: number;
  longitude: number;
  eta: string;
  distanceFromStartKm: number;
  label: string | null;
}

/**
 * Amostra pontos ao longo da geometria proporcionais ao tempo de viagem.
 * Sempre inclui origem e destino.
 */
export function sampleTimedPoints(
  coordsLonLat: [number, number][],
  departureIso: string,
  durationS: number,
  maxPoints = 8,
): TimedPoint[] {
  if (coordsLonLat.length === 0) throw new Error("geometria vazia");
  const t0 = Date.parse(departureIso);
  if (!Number.isFinite(t0)) throw new Error(`departure inválido: ${departureIso}`);

  // distância acumulada
  const cum: number[] = [0];
  for (let i = 1; i < coordsLonLat.length; i++) {
    const [lo0, la0] = coordsLonLat[i - 1];
    const [lo1, la1] = coordsLonLat[i];
    cum.push(cum[i - 1] + haversineKm(la0, lo0, la1, lo1));
  }
  const total = cum[cum.length - 1] || 0.001;
  const n = Math.max(2, Math.min(maxPoints, 12));
  const out: TimedPoint[] = [];
  for (let k = 0; k < n; k++) {
    const frac = k / (n - 1);
    const targetKm = frac * total;
    let idx = cum.findIndex((c) => c >= targetKm);
    if (idx < 0) idx = cum.length - 1;
    const [lon, lat] = coordsLonLat[idx];
    const eta = new Date(t0 + frac * durationS * 1000).toISOString();
    out.push({
      latitude: Math.round(lat * 1e5) / 1e5,
      longitude: Math.round(lon * 1e5) / 1e5,
      eta,
      distanceFromStartKm: Math.round(targetKm * 10) / 10,
      label: k === 0 ? "origem" : k === n - 1 ? "destino" : `km ${Math.round(targetKm)}`,
    });
  }
  return out;
}
