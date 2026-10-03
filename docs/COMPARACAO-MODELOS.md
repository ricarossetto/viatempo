# Comparação de modelos (com evidência, 2026-09-30)

Critérios: feed vivo hoje, tamanho/custo por request, facilidade operacional
(sem ecCodes no request path), variáveis úteis a viagem (temp, chuva, vento,
probabilidade, visibilidade).

| Candidato | Feed testado | Amostra aberta? | Custo | Variáveis p/ viagem | Veredito |
|---|---|---|---|---|---|
| MONAN | só PNG + `mod_monan.json` | n/a (sem grade pública) | — | nenhuma numérica | **descartado p/ ingestão** (monitorar `mod_monan.json`) |
| BRAMS 8 km | `brutos/` 404; JSON parado em 27/08 | — | — | nenhuma atual | **descartado** (só figura) |
| Eta 40 km | `eta_40km_…​.grb` 10,7 MB vivo | cabeçalho OK (GRIB1) | médio (10 MB/run-step, `wgrib`/GrADS) | grade sinótica completa | **secundário** (viável, não priorizado no MVP) |
| WRF 7 km | `recortes/prec/…​.grib2` 313 KB vivo | **sim**: 957×797, 0,07°, `accum`, Ijuí=0,0 | **baixo** (300–700 KB/hora) | só precipitação nos recortes `prec/` | **candidato BR p/ grade** (camada batch experimental) |
| BAM TQ666 | `*.grh` 492 MB / `GPOS` ~100 MB vivos | não baixado integral (tamanho) | **alto** | completo, 10 dias | **descartado no MVP** (custo/benefício) |
| MERGE | `MERGE_CPTEC_20260901.grib2` 447 KB vivo | **sim**: 924×1001, 0,1°, Ijuí `rdp`=9,625 mm | baixo | chuva observada (sem probabilidade) | **observado/ validação** (não é forecast) |
| INMET prevmet3 | JSON vivo | **sim**: B843 23,3 °C, vento 12,2 km/h há 37 min | **baixíssimo** | obs tempo-real + previsão municipal por turno | **primária BR no MVP** |
| Open-Meteo | JSON vivo | **sim**: Ijuí 20,3 °C, vento 12,1 km/h | baixíssimo | horária completa + probabilidade ensemble + visibilidade | **primária de previsão + fallback** |

## Decisão

1. Previsão horária por ponto: **Open-Meteo `best_match`** (probabilidade do ensemble, sem derivar `prob` de `amount`).
2. Observação brasileira: **INMET `estacao/proxima`** em `nearbyObservation` (com distância e idade; sem fingir representatividade pontual).
3. Fallback: Open-Meteo → **INMET municipal por turno** (grosseiro e sinalizado) → ponto degradado `unknown` (nunca falha a viagem inteira).
4. Grade BR numérica: **WRF 7 km `prec/` + MERGE** como camada batch experimental via `services/meteo-ingestor/python/extract_grib.py` (fora do request path); Eta 40 km documentado como próximo passo; BAM/MONAN/BRAMS fora do MVP com motivo registrado acima.

## Benchmark de sanidade (30/09, `scripts/benchmark.ts`)

| Ponto | Open-Meteo | INMET obs | \|Δtemp\| |
|---|---|---|---|
| Ijuí | 20,3 °C / 12,1 km/h | B843 23,3 °C / 12,2 km/h (23 km, 37 min) | 3,0 °C plausível |
| Porto Alegre | 17,1 °C / 11,5 km/h | A801 16,2 °C / 7,9 km/h (5 km, 37 min) | 0,9 °C |
| São Paulo | 29,6 °C / 12,3 km/h | A771 30,7 °C / 7,6 km/h (20 km, 37 min) | 1,1 °C |

Sem inversão lat/lon, sem erro m/s→km/h, timezone `America/Sao_Paulo` consistente.
Uma comparação não declara modelo "melhor" — serve só p/ detectar bug de implementação.
