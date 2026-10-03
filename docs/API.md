# API

Base: `http://localhost:3001` (ver `PORT`).

## `POST /api/weather/batch`

```json
{ "points": [{ "latitude": -28.26, "longitude": -53.91, "timestamp": "2026-10-01T14:30:00-03:00", "label": "Ijuí", "ibge": "4310207", "uf": "RS" }] }
```

`ibge`/`uf` opcionais habilitam observação próxima e alertas. Resposta:
`{ ok, count, items: NormalizedWeather[] }`. Campos ausentes = `null`.

## `POST /api/trips/forecast`

```json
{ "origin": "Ijuí, RS", "destination": "Porto Alegre, RS", "departure": "2026-10-01T14:30:00-03:00", "maxPoints": 8 }
```

Resposta: `{ ok, summary, route, timeline[{eta, distanceFromStartKm, weather}], alerts, sources }`.
`summary` traz `distanceKm`, `durationH`, `arrival`, `worstHazard`, `fallbackUsed`.

## `GET /api/weather?lat=&lon=&at=&ibge=&uf=` — ponto único (debug).

## `GET /api/health` / `GET /api/status`

Status expõe rodadas CPTEC (`mod_*.json`), idade dos runs e estatísticas de
cache (hits/misses/stale por provider).

## Semântica garantida

- `precipitation.probability = null` quando o modelo não fornece (nunca 0/100 derivados).
- `visibility = null` quando indisponível.
- `kind: forecast` nos campos principais; observação só em `nearbyObservation`.
- `source`: `{ institution, provider, model, run, fallback, fallbackChain, interpolation }`.
- `hazard`: `none|attention|alert|severe|unknown` + `reasons` pt-BR + `dataGap`.
- Erros: `400` validação (Zod), `502` roteamento/geocoding falhou; batch nunca falha por ponto.

Exemplos reais em `examples/`.
