# Executar e publicar

## Nuvem (backend 24 h — sem PC ligado)

Caminho mais simples (grátis, 2 cliques):

1. Conta em https://render.com (login com GitHub).
2. New → Blueprint → aponte p/ o repo/branch → usa `render.yaml`.
3. URL pública sai como `https://viatempo-api.onrender.com`
   (plano free dorme sem uso; 1ª chamada demora ~50 s).

Alternativas equivalentes: Fly.io (`fly launch` com o `Dockerfile`),
Railway, ou qualquer VM com Docker (`docker build -t viatempo . &&
docker run -p 3001:3001 viatempo`).

A landing vai junto (mesma origem, `/` + `/api/*`).

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
