# Arquitetura

```text
INMET prevmet3 (obs + previsão municipal) ─┐
CPTEC status + GRIB batch (WRF/MERGE) ─────┤
Open-Meteo forecast (horária + ensemble) ──┤
INMET alertas (mirror) ────────────────────┤
                                            ▼
                              Weather Engine (fallback chain)
                              - timeout 5–8s, 1 retry
                              - cache TTL + stale-while-revalidate + last-known-good
                              - proveniência completa por ponto
                              - hazard por regras (packages/weather-domain)
                                          │
                                          ▼
                            Normalized Weather API (sem GRIB/estação/grid)
                                          │
                 ┌────────────────────────┼────────────────────────┐
                 ▼                        ▼                        ▼
        POST /api/weather/batch  POST /api/trips/forecast   GET /api/status
                                          │
                    ┌───────── geocode (OM→Nominatim→Photon)
                    ├───────── IBGE (nome/UF → geocode)
                    └───────── OSRM (rota + geometria) → ETAs
```

## Por que assim

- **Nada de GRIB no request path.** Grade pesada (WRF/MERGE) é pré-processada
  pelo ingestor (`services/meteo-ingestor`: Node p/ JSON + Python
  `xarray/cfgrib/eccodes` p/ GRIB → JSON otimizado em `data/ingest/`).
- **Brasileiro de verdade no caminho crítico:** toda resposta carrega
  `nearbyObservation` INMET (estação, distância, idade) e `alerts` INMET;
  previsão municipal INMET é o fallback antes do degradado.
- **Falha isolada:** `weatherBatch` nunca derruba a viagem; ponto sem dados
  volta `hazard.unknown` + `dataGap`, nunca `none` silencioso.
- **Sem K8s.** API Node única + ingestor agendado (cron). Cloudflare (Workers/R2/KV)
  cabe como evolução de borda, não como requisito do MVP.

## Pacotes

- `packages/weather-domain`: tipos, unidades, WMO, hazard, tempo — puro, testado offline.
- `packages/providers`: openmeteo, inmet, ibge, cptec (status), alerts, cache, engine.
- `packages/routing`: geocode, OSRM, amostragem de ETAs.
- `apps/api`: Express + Zod.
- `services/meteo-ingestor`: `ingest.ts` (runs CPTEC + catálogo INMET) e
  `python/extract_grib.py` (GRIB → JSON).
