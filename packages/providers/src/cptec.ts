import { fetchJson } from "./http.js";
import { MemoryCache } from "./cache.js";

const S1 = "https://s1.cptec.inpe.br/grafico/Modelos/portal_previsao_numerica";

export interface CptecModelRun {
  model: string;
  lastRun: string | null;
  runs: string[];
  ageHours: number | null;
  stale: boolean;
}

export interface CptecStatus {
  fetchedAt: string;
  models: CptecModelRun[];
  /** WRF/MERGE têm arquivos numéricos acessíveis; MONAN/BRAMS hoje só figura. */
  numericIngestible: string[];
  notes: string;
}

const statusCache = new MemoryCache<CptecStatus>(30 * 60 * 1000, 6 * 3600 * 1000);
export function cptecCacheStats() {
  return statusCache.stats;
}

const MODELS = ["monan", "bam", "brams", "wrf", "eta", "smec"] as const;

async function modelRuns(model: string): Promise<CptecModelRun> {
  try {
    const data = await fetchJson<{ datesRun: string[] }>(`${S1}/mod_${model}.json`, { timeoutMs: 6000, retries: 1 });
    const runs = data.datesRun ?? [];
    const lastRun = runs[0] ?? null;
    let ageHours: number | null = null;
    let stale = true;
    if (lastRun) {
      const m = lastRun.match(/(\d{4}-\d{2}-\d{2}) (\d{2})z/);
      if (m) {
        const runMs = Date.parse(`${m[1]}T${m[2]}:00:00Z`);
        ageHours = Math.round((Date.now() - runMs) / 3600000);
        stale = ageHours > 36;
      } else {
        stale = false;
      }
    }
    return { model, lastRun, runs: runs.slice(0, 4), ageHours, stale };
  } catch {
    return { model, lastRun: null, runs: [], ageHours: null, stale: true };
  }
}

/**
 * Status das rodadas CPTEC (observabilidade + proveniência).
 * Não faz parse de GRIB por request — isso é papel do ingestor batch.
 */
export async function cptecStatus(): Promise<CptecStatus> {
  const hit = statusCache.get("cptec-status");
  if (hit) return hit.value;
  const models = await Promise.all(MODELS.map(modelRuns));
  const status: CptecStatus = {
    fetchedAt: new Date().toISOString(),
    models,
    numericIngestible: ["wrf", "eta", "merge", "bam"],
    notes: "MONAN/BRAMS: só PNG/meteograma públicos em 2026-09-30; sem GRIB no FTP. WRF prec horário e MERGE diário/horário com GRIB2 acessível. Eta 40km GRIB1 acessível. BAM 100–500MB.",
  };
  statusCache.set("cptec-status", status);
  return status;
}

/** URLs canônicas de amostra (verificadas em 2026-09-30) para o ingestor. */
export const CPTEC_SAMPLE_URLS = {
  mergeDaily: "https://ftp.cptec.inpe.br/modelos/tempo/MERGE/GPM/DAILY/2026/09/MERGE_CPTEC_20260901.grib2",
  wrfPrecHourly:
    "https://ftp.cptec.inpe.br/modelos/tempo/WRF/ams_07km/recortes/prec/2026/09/30/00/WRF_cpt_07KM_2026093000_2026093001.grib2",
};
