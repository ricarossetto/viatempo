import type { GeoPoint, RouteResult } from '../core/types';
import type { ICache } from './cache';

const PRIMARY = 'https://router.project-osrm.org/route/v1/driving';
const FALLBACK = 'https://routing.openstreetmap.de/routed-car/route/v1/driving';

interface OsrmRaw {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: Array<[number, number]> };
  }>;
}

function parse(json: OsrmRaw, provider: RouteResult['provider']): RouteResult {
  const r = json.routes?.[0];
  if (json.code !== 'Ok' || !r || !r.geometry?.coordinates?.length) {
    throw new Error('Rota não encontrada');
  }
  return {
    distanceM: r.distance ?? 0,
    durationS: r.duration ?? 0,
    geometry: (r.geometry.coordinates ?? []).map(([lon, lat]) => ({ lat, lon })),
    provider,
  };
}

async function fetchRoute(base: string, a: GeoPoint, b: GeoPoint, signal?: AbortSignal) {
  const url =
    `${base}/${a.lon},${a.lat};${b.lon},${b.lat}` + `?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (res.status === 429) throw new Error('429');
  if (!res.ok) throw new Error(`Rota falhou (${res.status})`);
  return (await res.json()) as OsrmRaw;
}

let lastCall = 0;

export function createRouter(cache: ICache) {
  async function getRoute(a: GeoPoint, b: GeoPoint): Promise<RouteResult> {
    const key = `route:${a.lat.toFixed(4)},${a.lon.toFixed(4)}>${b.lat.toFixed(4)},${b.lon.toFixed(4)}`;
    const hit = cache.get<RouteResult>(key);
    if (hit?.geometry?.length) return hit;
    // Respeita 1 req/s do servidor demo
    const wait = 1100 - (Date.now() - lastCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      lastCall = Date.now();
      const json = await fetchRoute(PRIMARY, a, b);
      const route = parse(json, 'osrm-demo');
      cache.set(key, route, 60 * 24);
      return route;
    } catch (primaryErr) {
      // Qualquer falha no primário (429, timeout, bloqueio de rede) tenta o FOSSGIS.
      try {
        lastCall = Date.now();
        const json = await fetchRoute(FALLBACK, a, b);
        const route = parse(json, 'fossgis');
        cache.set(key, route, 60 * 24);
        return route;
      } catch {
        throw new Error(
          `Rota indisponível nos dois servidores. Detalhe: ${(primaryErr as Error).message}. Tente de novo em alguns segundos.`,
        );
      }
    }
  }
  return { getRoute };
}
