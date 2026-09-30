import type { Place } from '../core/types';
import type { ICache } from './cache';

interface GeocodeRaw {
  results?: Array<{
    id?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    admin1?: string;
    country?: string;
  }>;
}

export function createGeocoder(cache: ICache) {
  async function search(query: string): Promise<Place[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const key = `geo:${q.toLowerCase()}`;
    const hit = cache.get<Place[]>(key);
    if (hit) return hit;
    const url =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
      `&count=5&language=pt&format=json&countryCode=BR`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding falhou (${res.status})`);
    const json = (await res.json()) as GeocodeRaw;
    const places: Place[] = (json.results ?? [])
      .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
      .map((r) => ({
        lat: r.latitude as number,
        lon: r.longitude as number,
        name: r.name ?? q,
        displayName: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
        admin1: r.admin1,
        country: r.country,
        id: `${(r.latitude as number).toFixed(4)},${(r.longitude as number).toFixed(4)}`,
      }));
    cache.set(key, places, 60 * 24 * 7);
    return places;
  }
  return { search };
}
