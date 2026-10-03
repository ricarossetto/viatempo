/**
 * Ingestão programada (leve, sem GRIB por request).
 * - Lê status das rodadas CPTEC (mod_*.json)
 * - Lê catálogo de estações INMET
 * - Escreve dataset otimizado em data/ingest/*.json
 * Uso: npm run ingest --workspace @viatempo/meteo-ingestor
 * (GRIB pesado: services/meteo-ingestor/python/extract_grib.py)
 */
import { mkdir, writeFile } from "node:fs/promises";

const OUT = new URL("../../../data/ingest/", import.meta.url);

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "ViaTempo-ingestor/1.0", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const MODELS = ["monan", "bam", "brams", "wrf", "eta", "smec"] as const;

async function main() {
  await mkdir(OUT, { recursive: true });
  const fetchedAt = new Date().toISOString();
  const runs: Record<string, unknown> = {};
  for (const m of MODELS) {
    try {
      runs[m] = await getJson(
        `https://s1.cptec.inpe.br/grafico/Modelos/portal_previsao_numerica/mod_${m}.json`,
        8000,
      );
    } catch (e) {
      runs[m] = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  let stations: unknown = null;
  try {
    stations = await getJson("https://apitempo.inmet.gov.br/estacoes/T", 15000);
  } catch (e) {
    stations = { error: e instanceof Error ? e.message : String(e) };
  }
  await writeFile(new URL("cptec-runs.json", OUT), JSON.stringify({ fetchedAt, runs }, null, 2));
  await writeFile(new URL("inmet-stations.json", OUT), JSON.stringify({ fetchedAt, stations }, null, 2).slice(0, 5_000_000));
  console.log(`ingest ok em ${fetchedAt}`);
  for (const m of MODELS) {
    const r = runs[m] as { datesRun?: string[]; error?: string };
    console.log(`- ${m}: ${r.error ?? JSON.stringify(r.datesRun?.slice(0, 2))}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
