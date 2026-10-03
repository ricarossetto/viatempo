# Pesquisa de fontes — situação operacional em 2026-09-30

Verificação direta (downloads reais, `curl -I/-L`, decodificação GRIB com
`xarray/cfgrib/eccodes`, `fetch` JSON). Amostras em `data/samples-real/`.

## CPTEC/INPE — FTP `https://ftp.cptec.inpe.br/modelos/tempo/`

| Modelo | Status 30/09/2026 | Formato | Grade / horizonte / rodada |
|---|---|---|---|
| MERGE GPM DAILY/HOURLY | vivo (`MERGE_CPTEC_20260901.grib2`, 447 KB) | GRIB2 0,1° | América do Sul 924×1001, lat −60..32, lon −120..−20; diário c/ ~1 dia de latência + horário |
| WRF `ams_07km/recortes/prec` | vivo (`WRF_cpt_07KM_2026093000_2026093001.grib2`, 313 KB) | GRIB2 0,07° (~7 km) | run 00Z 30/09, válido 01Z, `stepType=accum`, instituição `sbsj`/INPE; arquivos horários pequenos |
| Eta `ams_40km/brutos` | vivo (ex.: `eta_40km_2026092900+2026092900.grb`, ~10,7 MB) | GRIB1 `.grb` + `.ctl` | 40 km; `ams_08km/recortes` congelado em 27/08/2026 |
| BAM `TQ0666L064` | vivo (`*.grh` 492 MB, `GPOS*.grib2` 95–113 MB) | GrADS bin + GRIB2 | ~20 km, 1 rodada/dia, 000–240 h; pesado p/ MVP |
| BRAMS `ams_08km` | PNG vivo; GRIB/JSON grade congelados em 27/08/2026 | PNG + JSON meteograma | `brutos/` 404; sem grade numérica pública hoje |
| MONAN | só visualização (PNG em `s1.cptec.inpe.br`, `mod_monan.json` com `2026-09-30 00z`) | PNG | global ~10 km noticiado, mas **sem GRIB/NetCDF público no FTP** |
| SMEC | congelado em 27/08/2026 | GRIB2 | só histórico |

Extrações reais em Ijuí (−28,26, −53,91) — `data/samples-real/merge-ijui.json`,
`wrf-ijui.json`:
- MERGE 2026-09-01: `rdp = 9.625 kg/m²` (= 9,6 mm/dia), `prmsl = null` (ausente sobre o continente neste arquivo).
- WRF run 30/09 00Z válido 01Z: precipitação acumulada `0.0` (paramId 0/generico, `stepType=accum`).

Metadados de rodadas (vivo): `https://s1.cptec.inpe.br/grafico/Modelos/portal_previsao_numerica/mod_{monan,bam,brams,wrf,eta}.json`.
Termos CPTEC: uso não-comercial sem autorização; citar `CPTEC/INPE`.

## INMET

| Endpoint | Status | Uso no ViaTempo |
|---|---|---|
| `apiprevmet3.inmet.gov.br/estacao/proxima/{ibge}` | vivo, sem auth. Ex.: Ijuí→AJURICABA B843, 23,3 °C, vento 3,4 m/s, há ~37 min | **observação próxima (primária BR)** |
| `apiprevmet3.inmet.gov.br/previsao/{ibge}` | vivo, sem auth; 48 h por turno + diária 5 dias | fallback de previsão municipal |
| `apitempo.inmet.gov.br/estacoes/T` | vivo (672 estações, exige `User-Agent`) | catálogo (ingestor) |
| `apitempo.inmet.gov.br/estacao/{ini}/{fim}/{cod}` | **204 vazio em 30/09/2026** (série por estação quebrada) | não usar até correção |
| `avisos.inmet.gov.br` (SPA) / `alertas2.inmet.gov.br` (**morto**) / WIS2 `wis2bra.inmet.gov.br` | avisos SPA vivo; WIS2 MQTT vivo | alertas via mirror comunitário + WIS2 futuro |
| `radarmeteorologico.com.br/api/v1/alertas?uf=RS` | vivo (ex.: Tempestade nível 1, Onda de Calor nível 3) | **alertas (best-effort, com crédito)** |

`VEN_VEL`/`VEN_RAJ` do INMET são em **m/s** (convertidos para km/h no domínio).
Horário `HR_MEDICAO` em UTC.

## CEMADEN / Defesa Civil / radar-nowcast

- CEMADEN Mapa Interativo vivo, mas download por **formulário+captcha**, sem REST JSON → fora do núcleo; documentado como evolução.
- Defesa Civil (SMS 40199, Cell Broadcast nacional desde 01/10/2025, IDAP interno) sem API pública de leitura → orientação ao usuário, sem polling.
- Radar programático: **API-REDEMET exige cadastro+`api_key`** → PoC futuro; SISSAT como endpoint público não localizado (usar BDQueimadas `data.inpe.br`).

## Fallback externo + routing + geocoding (todos vivos em 30/09)

- Open-Meteo forecast: blend `best_match` (ICON/GFS/ECMWF; **sem BAM**), `precipitation_probability` do ensemble, limites free 10k/dia, CC-BY 4.0.
- OSRM demo: Ijuí→POA 420 km / ~6 h; limite 1 req/s, sem SLA (self-host em produção).
- Geocoding: Open-Meteo Geocoding (primário; retorna timezone) → Nominatim (1 req/s) → Photon.
- IBGE: `servicodados.ibge.gov.br` p/ código do município (com tabela local de contingência).
