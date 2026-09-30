import type { GeoPoint, RouteCandidate } from '../core/types';
import type { ICache } from './cache';

const PRIMARY = 'https://router.project-osrm.org/route/v1/driving';
const FALLBACK = 'https://routing.openstreetmap.de/routed-car/route/v1/driving';

/** Wire-type OSRM. Não vaza do módulo: só sai RouteCandidate. */
interface OsrmRaw {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: Array<[number, number]> };
    legs?: Array<{
      steps?: Array<{ name?: string; ref?: string }>;
    }>;
  }>;
}

/**
 * Extrai até 3 identificadores de via dos steps, na ordem em que aparecem.
 * Prefere ref (ex. "BR-285", "ERS-342") e só usa name quando não há nenhum
 * ref (trajetos urbanos). Refs com ";" são separados. Nunca inventa: sem
 * nomes utilizáveis, retorna [] e a UI mostra "Rota N".
 */
export function extractRoadNames(route: NonNullable<OsrmRaw['routes']>[number]): string[] {
  const refs: string[] = [];
  const names: string[] = [];
  const push = (arr: string[], v: string) => {
    const t = v.trim();
    if (t && !arr.includes(t) && arr.length < 3) arr.push(t);
  };
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      for (const part of (step.ref ?? '').split(';')) push(refs, part);
      push(names, step.name ?? '');
    }
  }
  return refs.length ? refs : names;
}

/** Parser puro e testável: 1..n rotas, vazio e geometria inválida cobertos. */
export function parseOsrm(json: OsrmRaw, provider: RouteCandidate['provider']): RouteCandidate[] {
  if (json.code !== 'Ok' || !json.routes?.length) return [];
  const out: RouteCandidate[] = [];
  json.routes.forEach((r, i) => {
    const coords = r.geometry?.coordinates;
    if (!coords?.length) return;
    out.push({
      id: `r${i}`,
      rank: i,
      distanceM: r.distance ?? 0,
      durationS: r.duration ?? 0,
      geometry: coords.map(([lon, lat]) => ({ lat, lon })),
      provider,
      roadNames: extractRoadNames(r),
    });
  });
  return out;
}

async function fetchRoutes(base: string, a: GeoPoint, b: GeoPoint) {
  // alternatives=3 pede opções; steps=true permite extrair nomes de rodovias reais.
  const url =
    `${base}/${a.lon},${a.lat};${b.lon},${b.lat}` +
    `?overview=full&geometries=geojson&alternatives=3&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Rota falhou (${res.status})`);
  return (await res.json()) as OsrmRaw;
}

let lastCall = 0;

export function createRouter(cache: ICache) {
  async function getRoutes(a: GeoPoint, b: GeoPoint): Promise<RouteCandidate[]> {
    // Chave versionada: não reaproveita cache antigo de rota única.
    const key =
      `route:v2:alts3:${a.lat.toFixed(4)},${a.lon.toFixed(4)}>` +
      `${b.lat.toFixed(4)},${b.lon.toFixed(4)}`;
    const hit = cache.get<RouteCandidate[]>(key);
    if (hit?.length && hit[0]?.geometry?.length) return hit;
    // Respeita 1 req/s do servidor demo
    const wait = 1100 - (Date.now() - lastCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      lastCall = Date.now();
      const routes = parseOsrm(await fetchRoutes(PRIMARY, a, b), 'osrm-demo');
      if (!routes.length) throw new Error('Rota não encontrada');
      cache.set(key, routes, 60 * 24);
      return routes;
    } catch (primaryErr) {
      // Qualquer falha no primário tenta o FOSSGIS, também com alternativas.
      try {
        lastCall = Date.now();
        const routes = parseOsrm(await fetchRoutes(FALLBACK, a, b), 'fossgis');
        if (!routes.length) throw new Error('Rota não encontrada');
        cache.set(key, routes, 60 * 24);
        return routes;
      } catch {
        throw new Error(
          `Rota indisponível nos dois servidores. Detalhe: ${(primaryErr as Error).message}. Tente de novo em alguns segundos.`,
        );
      }
    }
  }

  /** Compat: primeira candidata (menor duração, como o OSRM ordena). */
  async function getRoute(a: GeoPoint, b: GeoPoint): Promise<RouteCandidate> {
    const routes = await getRoutes(a, b);
    const first = routes[0];
    if (!first) throw new Error('Rota não encontrada');
    return first;
  }

  return { getRoutes, getRoute };
}
