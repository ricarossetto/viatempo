// Teste do resumo da viagem: capítulos, dominante, estável vs evento.
// Sem rede, fixtures inline. Uso: node e2e/journey.test.mjs
import { summarizeJourney, buildChapters, summarizePlan } from '../src/core/journey.ts';

let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'ok' : 'FALHA'}: ${name}`);
  if (!cond) failures++;
};

const s = (atISO, distKm, code, temp, chuva = 0, vento = 10, vis = 20000) => ({
  atISO, distKm, elapsedMin: 0, point: { lat: 0, lon: 0 },
  weather: { timeISO: atISO, tempC: temp, precipitationProb: chuva, weatherCode: code, windKmh: vento, gustsKmh: vento, visibilityM: vis, isInterpolated: false },
  hazard: 'ok', hazardScore: chuva > 30 ? 40 : 5, reason: 'tempo bom',
});

// nublado, nublado, garoa, nublado
const tl = [
  s('2026-09-30T11:00:00Z', 0, 3, 18),
  s('2026-09-30T11:30:00Z', 37, 3, 18),
  s('2026-09-30T12:00:00Z', 74, 51, 19, 25),
  s('2026-09-30T12:30:00Z', 111, 3, 20),
];

const ch = buildChapters(tl);
check('3 capítulos (nublado, garoa, nublado)', ch.length === 3);
check('capítulo central é garoa km 74', ch[1].kind === 'garoa' && ch[1].fromKm === 74);
check('capítulos guardam índices dos samples', JSON.stringify(ch[0].sampleIndexes) === '[0,1]');

const j = summarizeJourney(tl);
check('dominante é nublado', j.dominantKind === 'nublado');
check('min/max temp', j.minTempC === 18 && j.maxTempC === 20);
check('chuva máxima 25', j.maxRainProbability === 25);
check('estável quando nada relevante', j.stable === true && !j.mostRelevantSample);

const storm = tl.map((x, i) => (i === 2
  ? { ...x, hazardScore: 85, hazard: 'perigo', weather: { ...x.weather, weatherCode: 95, precipitationProb: 92, windKmh: 71, visibilityM: 600 } }
  : x));
const j2 = summarizeJourney(storm);
check('tempestade vira evento relevante', j2.stable === false && j2.mostRelevantSample?.distKm === 74);

const plan = { timeline: tl, worstHazard: 'ok', route: { distanceM: 408000, durationS: 20580 } };
const sum = summarizePlan(plan);
check('título usa condição dominante', sum.title.includes('Nublado'));
check('detalhe não esconde chuva leve', sum.detail.includes('10:00') || sum.detail.includes('garoa') || sum.detail.includes('Garoa'));

if (failures) { console.error(`JOURNEY TEST: ${failures} falha(s)`); process.exit(1); }
console.log('JOURNEY TEST PASS');
