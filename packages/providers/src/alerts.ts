import type { WeatherAlert } from "@viatempo/weather-domain";
import { fetchJson } from "./http.js";
import { MemoryCache } from "./cache.js";

const MIRROR = "https://radarmeteorologico.com.br/api/v1/alertas";

interface MirrorAlert {
  id: number | string;
  evento: string;
  severidade: string;
  nivel?: number;
  inicio?: string;
  fim?: string;
}
interface MirrorResp {
  fonte: string;
  total: number;
  alertas: MirrorAlert[];
}

const alertsCache = new MemoryCache<WeatherAlert[]>(10 * 60 * 1000, 60 * 60 * 1000);
export function alertsCacheStats() {
  return alertsCache.stats;
}

/**
 * Alertas INMET (best-effort).
 * Fonte oficial (avisos.inmet.gov.br) é SPA sem JSON público estável;
 * usamos mirror comunitário do INMET com fallback para lista vazia.
 * Lista vazia NÃO significa "sem perigo" — o campo `stale` indica cobertura.
 */
export async function alertsForUf(uf: string): Promise<{ alerts: WeatherAlert[]; stale: boolean }> {
  const key = `alerts:${uf.toUpperCase()}`;
  const hit = alertsCache.get(key);
  if (hit) return { alerts: hit.value, stale: !hit.fresh };
  try {
    const data = await fetchJson<MirrorResp>(`${MIRROR}?uf=${encodeURIComponent(uf.toUpperCase())}`, {
      timeoutMs: 6000,
      retries: 1,
    });
    const alerts: WeatherAlert[] = (data.alertas ?? []).map((a) => ({
      id: `inmet-${a.id}`,
      source: "INMET (via mirror radarmeteorologico.com.br)",
      event: a.evento,
      severity: a.severidade,
      level: typeof a.nivel === "number" ? a.nivel : null,
      headline: `${a.evento} — ${a.severidade}`,
      startsAt: a.inicio ?? null,
      endsAt: a.fim ?? null,
    }));
    alertsCache.set(key, alerts);
    return { alerts, stale: false };
  } catch {
    const staleVal = alertsCache.getStale(key);
    return { alerts: staleVal ?? [], stale: true };
  }
}
