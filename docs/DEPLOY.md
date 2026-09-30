# Executar e publicar

## Local

```bash
npm install
npm run dev --workspace apps/api   # http://localhost:3001
npm run test:offline --workspace apps/api
npm run smoke --workspace apps/api       # fontes reais (rede)
npx tsx scripts/benchmark.ts             # sanity Open-Meteo vs INMET
npm run ingest --workspace @viatempo/meteo-ingestor
python services/meteo-ingestor/python/extract_grib.py <grib> <lat> <lon> --out ponto.json
```

Requer Node ≥ 20. Python só p/ GRIB (`pip install -r services/meteo-ingestor/python/requirements.txt`).

## Produção simples (1 VM ou container)

```bash
npm install --omit=dev
PORT=3001 node --import tsx node_modules/tsx/dist/cli.mjs apps/api/src/index.ts
# ou build próprio + pm2/systemd; cron a cada 30 min p/ ingest
```

Dockerfile enxuto (a criar quando for publicar): `node:20-slim` + `npm install --omit=dev`.
Cloudflare: API cabe num container/VM; Workers+R2 entram como cache de borda (evolução, não requisito).

## Limites operacionais de terceiros (respeitar)

- OSRM demo ≤ 1 req/s (self-host p/ produção).
- Nominatim 1 req/s + `User-Agent` + cache (fallback, raramente chamado).
- Open-Meteo 10k chamadas/dia no free (cache horário de 1 h já implementado).
- INMET sem auth; alertas via mirror com cache de 10 min.
