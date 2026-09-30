# ViaTempo

Planejador meteorológico de viagens rodoviárias.

> Estado: MVP funcional com dados reais (ver `docs/RELATORIO.md`).

## Quickstart

```bash
npm install
npm run dev --workspace apps/api
# API em http://localhost:3001
```

```bash
# timeline Ijuí → Porto Alegre
curl -s -X POST http://localhost:3001/api/trips/forecast \
  -H 'content-type: application/json' \
  -d '{"origin":"Ijuí, RS","destination":"Porto Alegre, RS","departure":"2026-10-01T14:30:00-03:00"}' | head -c 2000
```

## Estrutura

```text
apps/api/                  API (weather batch, trips, health)
packages/weather-domain/   domínio normalizado, hazard, unidades, WMO
packages/providers/        Open-Meteo, INMET, CPTEC, alertas, engine+cache
packages/routing/          geocoding, OSRM, construção da timeline de ETAs
services/meteo-ingestor/   ingestão programada (Python xarray/cfgrib + Node)
data/                      amostras reais + fixtures determinísticas
docs/                      pesquisa, arquitetura, API, frontend, relatório
examples/                  JSONs reais + mocks para o frontend
scripts/                   smoke tests reais, benchmark
```

## Docs

- `docs/PESQUISA-FONTES.md` — situação operacional verificada em 2026-09-30
- `docs/COMPARACAO-MODELOS.md` — comparação com evidência + decisão
- `docs/ARQUITETURA.md`
- `docs/API.md` + `docs/FRONTEND.md`
- `docs/RELATORIO.md` — relatório final objetivo
