# ViaTempo — relatório objetivo (2026-09-30)

## Arquitetura

Engine em camadas: INMET prevmet3 (obs+previsão municipal) + status CPTEC +
Open-Meteo horária + alertas INMET → `weather()`/`weatherBatch()` com fallback
`open-meteo → inmet → degradado`, cache TTL+stale+last-known-good, proveniência
por ponto, hazard por regras → `POST /api/weather/batch` e
`POST /api/trips/forecast` (geocode OM→Nominatim→Photon, IBGE, OSRM→ETAs).
Detalhes em `docs/ARQUITETURA.md`.

## Fontes escolhidas (funcionando hoje, com evidência)

- **Open-Meteo `best_match`** — previsão horária principal + probabilidade do ensemble.
- **INMET `apiprevmet3`** — `nearbyObservation` tempo-real em toda resposta (ex.: B843 23,3 °C há 37 min) + fallback municipal por turno.
- **CPTEC**: `mod_*.json` (observabilidade) + **WRF 7 km `prec/`** e **MERGE** (GRIB2 decodificados de verdade: Ijuí WRF 0,0 mm 1ª hora; MERGE 9,6 mm/dia) via ingestor batch.
- **Alertas INMET** via mirror (ex.: Tempestade nível 1, Onda de Calor nível 3) + WIS2 mapeado.
- Rota **OSRM**, geocode **Open-Meteo→Nominatim→Photon**, municípios **IBGE**.

## Fontes descartadas (motivo)

- MONAN/BRAMS: sem grade numérica pública (só PNG) — monitorar.
- BAM: arquivos 100–500 MB, custo/benefício ruim p/ MVP.
- Eta 40 km: viável (GRIB1 vivo), mas não priorizado — próximo passo.
- `apitempo /estacao/{…}`: 204 vazio hoje; `alertas2`: morto; `olinda.inmet.gov.br`: não existe.
- CEMADEN/Defesa Civil/REDEMET: sem REST público sem cadastro — documentados, fora do núcleo.

## Decisões técnicas

GRIB fora do request path; `probability` nunca derivada de `amount`; `null` em vez
de invenção; forecast/observation/nowcast/alert separados; hazard com `dataGap`;
falha por ponto nunca derruba a viagem; `m/s→km/h` e UTC do INMET tratados e testados.

## O que está funcional

`weather()`, `weatherBatch()` (≤50 pts), rota com ETAs, timeline, hazard,
fallback sinalizado, cache, `/api/status`, 19 testes offline, smokes reais,
benchmark plausível (Δtemp 0,9–3,0 °C), **Ijuí→POA (408,7 km, 5,74 h, 8 pontos)** e
**SP→RJ (432 km)** operando, docs de API/frontend, exemplos reais, instruções de deploy.

## Experimental / limitações honestas

- Grade WRF/MERGE ainda não compõe o forecast por request (ingestor batch pronto, integração pendente).
- `nearbyObservation` só nos endpoints com `ibge` (origem/destino); intermediários sem obs municipal (requer reverse-geocode por ponto).
- Alertas via mirror comunitário (WIS2 MQTT nativo pendente); CEMADEN/radar/nowcast como PoC futuro (REDEMET exige cadastro).
- OSRM/Nominatim demos (self-host em produção); Eta 40 km não integrado.

## Testes

`npx vitest run tests/offline` (19, determinísticos) · `npx tsx scripts/smoke.ts`
(5 fontes reais) · `npx tsx scripts/benchmark.ts` · golden route validada via API.

## Próximos avanços úteis (ordem)

1. Reverse-geocode por ponto → obs INMET em toda a timeline.
2. Integrar precipitação WRF 7 km do ingestor ao engine (confronto com Open-Meteo).
3. WIS2 MQTT p/ alertas nativos + dedupe de alertas por região.
4. Self-host OSRM/Photon + Redis p/ cache multi-instância.
5. Cadastro REDEMET → nowcast de radar p/ viagens < 3 h.
