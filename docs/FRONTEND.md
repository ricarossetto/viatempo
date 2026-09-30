# Handoff do frontend

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
