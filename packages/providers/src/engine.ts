import {
  assessHazard,
  floorHour,
  type BatchWeatherRequest,
  type DataQuality,
  type NormalizedWeather,
} from "@viatempo/weather-domain";
import { openmeteoPoint } from "./openmeteo.js";
import { inmetForecast, inmetNearbyObservation } from "./inmet.js";
import { alertsForUf } from "./alerts.js";

export interface WeatherQuery extends BatchWeatherRequest {
  ibge?: string;
  uf?: string;
}

function completenessOf(w: {
  temperature: number | null;
  humidity: number | null;
  precipitation: { amount: number | null };
  wind: { speed: number | null };
  visibility: number | null;
  condition: unknown;
}): { missing: string[]; completeness: number } {
  const checks: [string, unknown][] = [
    ["temperature", w.temperature],
    ["humidity", w.humidity],
    ["precipitation.amount", w.precipitation.amount],
    ["wind.speed", w.wind.speed],
    ["visibility", w.visibility],
    ["condition", w.condition],
  ];
  const missing = checks.filter(([, v]) => v === null || v === undefined).map(([k]) => k);
  return { missing, completeness: Math.round(((checks.length - missing.length) / checks.length) * 100) / 100 };
}

function validate(q: WeatherQuery): void {
  if (!Number.isFinite(q.latitude) || q.latitude < -90 || q.latitude > 90) throw new Error(`latitude inválida: ${q.latitude}`);
  if (!Number.isFinite(q.longitude) || q.longitude < -180 || q.longitude > 180) throw new Error(`longitude inválida: ${q.longitude}`);
  if (!Number.isFinite(Date.parse(q.timestamp))) throw new Error(`timestamp inválido: ${q.timestamp}`);
}

function degraded(q: WeatherQuery, chain: string[], reason: string): NormalizedWeather {
  return {
    point: { latitude: q.latitude, longitude: q.longitude, label: q.label ?? null },
    requestedTime: q.timestamp,
    forecastTime: null,
    kind: "forecast",
    temperature: null,
    feelsLike: null,
    humidity: null,
    pressureHpa: null,
    precipitation: { probability: null, amount: null, intensity: null },
    wind: { speed: null, gust: null, direction: null },
    visibility: null,
    cloudCover: null,
    condition: null,
    conditionCode: null,
    hazard: { level: "unknown", reasons: [reason, "dados incompletos — ausência de dados não significa condição segura"], completeness: 0, dataGap: true },
    source: {
      institution: null,
      provider: "none",
      model: null,
      run: null,
      generatedAt: null,
      ingestedAt: new Date().toISOString(),
      fallback: true,
      fallbackChain: chain,
      interpolation: null,
      resolutionKm: null,
    },
    quality: { missingFields: ["all"], ageMinutes: null, stationDistanceKm: null, completeness: 0 },
    nearbyObservation: null,
    alerts: [],
  };
}

/**
 * latitude/longitude/timestamp -> clima normalizado.
 * Nunca mistura forecast/observation: forecast em campos principais,
 * observação INMET em `nearbyObservation`.
 */
export async function weather(q: WeatherQuery): Promise<NormalizedWeather> {
  validate(q);
  const nowIso = new Date().toISOString();
  const chain = ["open-meteo"];

  const [meteo, obs, alerts] = await Promise.all([
    openmeteoPoint(q.latitude, q.longitude, q.timestamp).catch(() => null),
    q.ibge ? inmetNearbyObservation(q.ibge, q.latitude, q.longitude, nowIso).catch(() => null) : Promise.resolve(null),
    q.uf ? alertsForUf(q.uf).catch(() => ({ alerts: [], stale: true })) : Promise.resolve({ alerts: [], stale: true }),
  ]);

  if (meteo) {
    const w: NormalizedWeather = {
      point: { latitude: q.latitude, longitude: q.longitude, label: q.label ?? null },
      requestedTime: q.timestamp,
      forecastTime: meteo.forecastTime,
      kind: "forecast",
      temperature: meteo.temperature,
      feelsLike: null,
      humidity: meteo.humidity,
      pressureHpa: null,
      precipitation: { probability: meteo.precipProb, amount: meteo.precipAmount, intensity: null },
      wind: { speed: meteo.windSpeed, gust: meteo.windGust, direction: meteo.windDir },
      visibility: meteo.visibility,
      cloudCover: meteo.cloudCover,
      condition: meteo.condition === "unknown" ? "unknown" : meteo.condition,
      conditionCode: meteo.conditionCode,
      hazard: null,
      source: {
        institution: "Open-Meteo (blend ICON/GFS/ECMWF)",
        provider: "open-meteo",
        model: "best_match",
        run: null,
        generatedAt: null,
        ingestedAt: nowIso,
        fallback: false,
        fallbackChain: chain,
        interpolation: "nearest-hour",
        resolutionKm: 9,
      },
      quality: { missingFields: [], ageMinutes: null, stationDistanceKm: null, completeness: 1 },
      nearbyObservation: obs?.obs ?? null,
      alerts: alerts.alerts,
    };
    const { missing, completeness } = completenessOf(w);
    const quality: DataQuality = {
      missingFields: missing,
      ageMinutes: null,
      stationDistanceKm: obs?.obs.distanceKm ?? null,
      completeness,
    };
    w.quality = quality;
    w.hazard = assessHazard(w);
    return w;
  }

  // Fallback brasileiro: previsão municipal INMET por turno (grosseira, honesta).
  if (q.ibge) {
    chain.push("inmet");
    const fc = await inmetForecast(q.ibge).catch(() => null);
    if (fc && fc.length > 0) {
      const block = fc[0];
      const temp = block.tempMax ?? block.tempMin;
      const w: NormalizedWeather = {
        point: { latitude: q.latitude, longitude: q.longitude, label: q.label ?? null },
        requestedTime: q.timestamp,
        forecastTime: floorHour(q.timestamp),
        kind: "forecast",
        temperature: temp,
        feelsLike: null,
        humidity: null,
        pressureHpa: null,
        precipitation: { probability: null, amount: null, intensity: null },
        wind: { speed: null, gust: null, direction: null },
        visibility: null,
        cloudCover: null,
        condition: block.condition,
        conditionCode: block.resumo ? `inmet:${block.resumo}` : null,
        hazard: null,
        source: {
          institution: "INMET",
          provider: "inmet",
          model: "prevmet-municipal",
          run: null,
          generatedAt: null,
          ingestedAt: nowIso,
          fallback: true,
          fallbackChain: chain,
          interpolation: "nearest-shift",
          resolutionKm: null,
        },
        quality: { missingFields: [], ageMinutes: null, stationDistanceKm: null, completeness: 0 },
        nearbyObservation: obs?.obs ?? null,
        alerts: alerts.alerts,
      };
      const { missing, completeness } = completenessOf(w);
      w.quality = { missingFields: missing, ageMinutes: null, stationDistanceKm: obs?.obs.distanceKm ?? null, completeness };
      w.hazard = assessHazard(w);
      return w;
    }
  }

  return degraded(q, [...chain, "inmet"], "todos os providers falharam");
}

/** Batch: N pontos -> N climas (paralelismo limitado, falhas isoladas por ponto). */
export async function weatherBatch(queries: WeatherQuery[], concurrency = 6): Promise<NormalizedWeather[]> {
  const out: NormalizedWeather[] = new Array(queries.length);
  let i = 0;
  async function worker() {
    while (i < queries.length) {
      const idx = i++;
      const q = queries[idx];
      try {
        out[idx] = await weather(q);
      } catch (e) {
        out[idx] = degraded(q, ["open-meteo", "inmet"], e instanceof Error ? e.message : "erro desconhecido");
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queries.length) }, worker));
  return out;
}
