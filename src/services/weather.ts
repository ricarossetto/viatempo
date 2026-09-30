import type { GeoPoint, WeatherSample } from '../core/types';
import type { ICache } from './cache';

interface HourlyRaw {
  time?: string[];
  temperature_2m?: number[];
  precipitation_probability?: number[];
  weather_code?: number[];
  wind_speed_10m?: number[];
  wind_gusts_10m?: number[];
  visibility?: number[];
}

type Bundle = { hourly: HourlyRaw };

/** 1 request batch para N pontos (cap 12). Interpolação linear intra-hora. */
export function createWeather(cache: ICache) {
  function buildUrl(points: Array<GeoPoint | { point: GeoPoint }>): string {
    const norm = points.map((p) => ('point' in p ? (p as { point: GeoPoint }).point : (p as GeoPoint)));
    const lats = norm.map((p) => p.lat.toFixed(4)).join(',');
    const lons = norm.map((p) => p.lon.toFixed(4)).join(',');
    return (
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
      `&hourly=temperature_2m,precipitation_probability,weather_code,visibility,wind_speed_10m,wind_gusts_10m` +
      `&timezone=auto&forecast_days=7&wind_speed_unit=kmh`
    );
  }

  function interpolate(bundle: Bundle, atISO: string): WeatherSample {
    const h = bundle.hourly;
    const times = h.time ?? [];
    if (!times.length) throw new Error('Forecast vazio');
    const t = new Date(atISO).getTime();
    let i = 0;
    while (i < times.length - 1 && new Date(times[i + 1]).getTime() <= t) i++;
    const j = Math.min(i + 1, times.length - 1);
    const t0 = new Date(times[i]).getTime();
    const t1 = new Date(times[j]).getTime();
    const f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
    const lerp = (arr?: number[]) =>
      arr && arr.length > j ? arr[i] + (arr[j] - arr[i]) * f : 0;
    const closest = f < 0.5 ? i : j;
    return {
      timeISO: atISO,
      tempC: lerp(h.temperature_2m),
      precipitationProb: lerp(h.precipitation_probability),
      weatherCode: h.weather_code?.[closest] ?? 0,
      windKmh: lerp(h.wind_speed_10m),
      gustsKmh: lerp(h.wind_gusts_10m),
      visibilityM: lerp(h.visibility),
      isInterpolated: f > 0.01 && f < 0.99,
    };
  }

  async function getForPoints(points: Array<{ point: GeoPoint; atISO: string }>): Promise<WeatherSample[]> {
    if (!points.length) return [];
    const day = points[0].atISO.slice(0, 10);
    const key = `wx:${day}:${points.map((p) => `${p.point.lat.toFixed(2)},${p.point.lon.toFixed(2)}`).join('|')}`;
    const hit = cache.get<WeatherSample[]>(key);
    // Só reutiliza se o horário for próximo (slider reusa sem fetch via retime; aqui é batch do dia)
    if (hit && hit.length === points.length) return hit;
    const res = await fetch(buildUrl(points));
    if (!res.ok) throw new Error(`Clima falhou (${res.status})`);
    const json = await res.json();
    const bundles: Bundle[] = Array.isArray(json) ? json : [json];
    const out = points.map((p, idx) => {
      const b = bundles[Math.min(idx, bundles.length - 1)];
      try {
        return interpolate(b, p.atISO);
      } catch {
        // degradação graciosa: reusa vizinho
        const fallback = bundles[0];
        return interpolate(fallback, p.atISO);
      }
    });
    cache.set(key, out, 30);
    return out;
  }

  return { buildUrl, interpolate, getForPoints };
}
