import { cleanNumber, kmh, pct, wmoToCondition } from "@viatempo/weather-domain";
import { fetchJson } from "./http.js";
import { MemoryCache, weatherCacheKey } from "./cache.js";

const BASE = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoHourly {
  time: string[];
  temperature_2m?: (number | null)[];
  relative_humidity_2m?: (number | null)[];
  precipitation?: (number | null)[];
  precipitation_probability?: (number | null)[];
  weather_code?: (number | null)[];
  wind_speed_10m?: (number | null)[];
  wind_gusts_10m?: (number | null)[];
  wind_direction_10m?: (number | null)[];
  visibility?: (number | null)[];
  cloud_cover?: (number | null)[];
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: OpenMeteoHourly;
  generationtime_ms?: number;
}

export interface OpenMeteoPoint {
  forecastTime: string | null;
  temperature: number | null;
  humidity: number | null;
  precipAmount: number | null;
  precipProb: number | null;
  windSpeed: number | null;
  windGust: number | null;
  windDir: number | null;
  visibility: number | null;
  cloudCover: number | null;
  condition: ReturnType<typeof wmoToCondition>["condition"];
  conditionCode: string;
  timezone: string;
}

const cache = new MemoryCache<OpenMeteoPoint>(60 * 60 * 1000, 3 * 60 * 60 * 1000);

export function openmeteoCacheStats() {
  return cache.stats;
}

/**
 * Busca horária Open-Meteo (fallback externo consolidado).
 * probability vem do ensemble (30 simulações) — NÃO derivamos de amount.
 * visibility pode ser null quando o modelo não informa.
 */
export async function openmeteoPoint(lat: number, lon: number, requestedTime: string): Promise<OpenMeteoPoint> {
  const hour = requestedTime.slice(0, 13) + ":00:00";
  const key = weatherCacheKey("open-meteo", lat, lon, hour);
  const hit = cache.get(key);
  if (hit) return hit.value;

  const url =
    `${BASE}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility,cloud_cover` +
    `&timezone=America%2FSao_Paulo&forecast_days=7&wind_speed_unit=kmh`;
  const data = await fetchJson<OpenMeteoResponse>(url, { timeoutMs: 8000, retries: 1 });
  const h = data.hourly;

  // casa requestedTime com o timestep horário (fuso America/Sao_Paulo retornado como "YYYY-MM-DDTHH:MM" local)
  const target = new Date(requestedTime).getTime();
  let best = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < h.time.length; i++) {
    const t = Date.parse(h.time[i].length === 16 ? h.time[i] + ":00-03:00" : h.time[i]);
    const d = Math.abs(t - target);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  if (best < 0) throw new Error("Open-Meteo retornou série vazia");

  const at = (arr?: (number | null)[]) => (arr && best < arr.length ? arr[best] : null);
  const wmo = wmoToCondition(at(h.weather_code));
  const point: OpenMeteoPoint = {
    forecastTime: h.time[best].length === 16 ? h.time[best] + ":00-03:00" : h.time[best],
    temperature: cleanNumber(at(h.temperature_2m)),
    humidity: pct(at(h.relative_humidity_2m)),
    precipAmount: cleanNumber(at(h.precipitation)),
    precipProb: pct(at(h.precipitation_probability)),
    windSpeed: kmh(at(h.wind_speed_10m)),
    windGust: kmh(at(h.wind_gusts_10m)),
    windDir: typeof at(h.wind_direction_10m) === "number" ? Math.round(at(h.wind_direction_10m) as number) : null,
    visibility: cleanNumber(at(h.visibility)),
    cloudCover: pct(at(h.cloud_cover)),
    condition: wmo.condition,
    conditionCode: `wmo-${wmo.native}`,
    timezone: data.timezone ?? "America/Sao_Paulo",
  };
  cache.set(key, point);
  return point;
}
