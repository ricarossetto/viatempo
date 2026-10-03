# Handoff do frontend

## Servindo a landing (mesma origem)

A landing vive em `apps/api/public/` (`index.html` autocontido + fontes em
`assets/`). A API serve estático na mesma origem: `GET /` → landing,
`/api/*` → backend. Sem CORS/CSP entre eles.

- Rebuild após editar as fontes: `node scripts/build-landing.mjs` (a partir de `apps/api/`; réplica do `assets/v2/build.ps1`).
- `VT.forecast(req)` (`assets/data.js`) chama `POST /api/trips/forecast` na mesma origem; `?api=http://localhost:3001` força outra base (modo standalone/`file://`).
- Sem backend ou com erro ≥500: fallback local honesto (amostra real p/ Ijuí→POA, síntese p/ demais pares) rotulado como **amostra/simulado — nunca "ao vivo"**. Erro 400 (validação) propaga sem mascarar.
- Faixa de procedência: `trip.live` → "ao vivo"; `trip.real` → "amostra real capturada em 30/09/2026"; senão "trajeto simulado".

## Fluxo sugerido

1. `POST /api/trips/forecast` → `summary` (origem/destino resolvidos, distância, duração, `worstHazard`, `fallbackUsed`).
2. Renderizar `timeline` (ordenada por `eta`): hora local, `label`, `weather.temperature`, `condition`, `precipitation.{probability,amount}`, `wind.{speed,gust}`, `hazard`.
3. Faixa de proveniência discreta: `source.provider/model` + badge "fallback" quando `source.fallback`.
4. `alerts` em destaque (evento + severidade + vigência). Lista pode conter itens repetidos por região — dedupe por `event+severity` se desejar.
5. `nearbyObservation` como nota de contexto ("estação X a Y km mediu … há Z min"), nunca como valor do ponto.

## `condition`

`clear|partly_cloudy|overcast|fog|drizzle|rain|heavy_rain|storm|snow|unknown|null`.

## `hazard`

| level | cor sugerida |
|---|---|
| `none` | neutro |
| `attention` | amarelo |
| `alert` | laranja |
| `severe` | vermelho |
| `unknown` | cinza ("sem dados suficientes") |

Sempre exibir `reasons` (ex.: "rajadas de 64 km/h", "alerta oficial: Tempestade").
`dataGap=true` → avisar que ausência de dados ≠ segurança.

## Loading / erros / limites

- Loading: skeleton por ponto da timeline (a API resolve geocode+rota+N providers; ~2–6 s frio).
- `fallbackUsed=true` → badge "dados alternativos".
- `400`: entrada inválida (mostrar `error`); `502`: rota/geocoding indisponível (oferecer retry).
- Batch aceita até 50 pontos; `maxPoints` 2–12 (padrão 8).
- Timeouts internos 5–8 s; sem SSE/polling no MVP (reconsultar a cada 30–60 min basta — modelos rodam a cada 6–12 h).

## Mocks e JSONs reais

- `examples/trip-ijui-poa.json` — resposta real Ijuí→POA (8 pontos).
- `examples/batch.json`, `examples/weather-single.json`, `examples/status.json`.
- Para Storybook, congele um desses arquivos como mock (já são dados reais).
