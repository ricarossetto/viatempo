import { ageMinutes, cleanNumber, haversineKm, inmetResumoToCondition, msToKmh } from "@viatempo/weather-domain";
import type { NearbyObservation } from "@viatempo/weather-domain";
import { fetchJson } from "./http.js";
import { MemoryCache } from "./cache.js";

const BASE = "https://apiprevmet3.inmet.gov.br";

interface ProximaResp {
  estacao: { UF: string; CODIGO: string; NOME: string; LATITUDE: string; LONGITUDE: string; DISTANCIA_EM_KM: string; GEOCODE: string };
  dados: Record<string, string>;
}

const obsCache = new MemoryCache<{ obs: NearbyObservation; raw: Record<string, string> }>(15 * 60 * 1000, 60 * 60 * 1000);
export function inmetCacheStats() {
  return obsCache.stats;
}

function num(v: unknown): number | null {
  return cleanNumber(v, [-999, 9999]);
}

/**
 * Observação INMET mais próxima do município (tempo real, sem auth).
 * Retorna null quando indisponível — nunca inventa.
 */
export async function inmetNearbyObservation(
  ibge: string,
  pointLat: number,
  pointLon: number,
  nowIso: string,
): Promise<{ obs: NearbyObservation; raw: Record<string, string> } | null> {
  const hit = obsCache.get(`inmet-obs:${ibge}`);
  if (hit) return hit.value;
  try {
    const data = await fetchJson<ProximaResp>(`${BASE}/estacao/proxima/${encodeURIComponent(ibge)}`, {
      timeoutMs: 7000,
      retries: 1,
    });
    const e = data.estacao;
    const d = data.dados ?? {};
    const stLat = Number(String(e.LATITUDE).replace(",", "."));
    const stLon = Number(String(e.LONGITUDE).replace(",", "."));
    const distCatalog = Number(String(e.DISTANCIA_EM_KM).replace(",", "."));
    const dist = Number.isFinite(stLat) && Number.isFinite(stLon) ? haversineKm(pointLat, pointLon, stLat, stLon) : distCatalog;

    const measuredAt = d.DT_MEDICAO && d.HR_MEDICAO ? isoFromInmet(d.DT_MEDICAO, d.HR_MEDICAO) : null;
    const obs: NearbyObservation = {
      stationCode: e.CODIGO,
      stationName: e.NOME ?? d.DC_NOME ?? null,
      distanceKm: Math.round((Number.isFinite(dist) ? dist : 999) * 10) / 10,
      measuredAt: measuredAt ?? nowIso,
      ageMinutes: measuredAt ? (ageMinutes(measuredAt, nowIso) ?? null) : null,
      temperatureC: num(d.TEM_INS ?? d.TEM_MAX),
      windSpeedKmh: d.VEN_VEL !== undefined ? msToKmh(num(d.VEN_VEL)) : null,
      windGustKmh: d.VEN_RAJ !== undefined ? msToKmh(num(d.VEN_RAJ)) : null,
      humidityPct: num(d.UMD_INS),
      precipitationMm: num(d.CHUVA),
    };
    const out = { obs, raw: d };
    obsCache.set(`inmet-obs:${ibge}`, out);
    return out;
  } catch {
    return obsCache.getStale(`inmet-obs:${ibge}`);
  }
}

function isoFromInmet(date: string, hour: string): string | null {
  // DT "2026-09-30", HR "1900" (UTC) — INMET divulga hora em UTC.
  try {
    const hh = hour.padStart(4, "0").slice(0, 2);
    const mm = hour.padStart(4, "0").slice(2, 4);
    return new Date(`${date}T${hh}:${mm}:00Z`).toISOString();
  } catch {
    return null;
  }
}

export interface InmetForecastBlock {
  date: string;
  shift: string;
  resumo: string | null;
  tempMin: number | null;
  tempMax: number | null;
  condition: ReturnType<typeof inmetResumoToCondition>;
}

/** Previsão municipal INMET por turno (fallback grosseiro quando Open-Meteo falha). */
export async function inmetForecast(ibge: string): Promise<InmetForecastBlock[] | null> {
  try {
    const data = await fetchJson<Record<string, Record<string, Record<string, Record<string, unknown>>>>>(
      `${BASE}/previsao/${encodeURIComponent(ibge)}`,
      { timeoutMs: 7000, retries: 1 },
    );
    const muni = data[ibge];
    if (!muni) return null;
    const out: InmetForecastBlock[] = [];
    for (const [date, shifts] of Object.entries(muni)) {
      for (const [shift, info] of Object.entries(shifts)) {
        const resumo = typeof info.resumo === "string" ? info.resumo : null;
        out.push({
          date,
          shift,
          resumo,
          tempMin: num(info.temp_min),
          tempMax: num(info.temp_max),
          condition: inmetResumoToCondition(resumo),
        });
      }
    }
    return out;
  } catch {
    return null;
  }
}
