// Teste do parser OSRM: 1 rota, múltiplas, vazio, geometria inválida.
// Roda sem rede, com fixtures inline. Uso: npm run test:routing
import { parseOsrm, extractRoadNames } from '../src/services/routing.ts';

let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'ok' : 'FALHA'}: ${name}`);
  if (!cond) failures++;
};

const oneRoute = {
  code: 'Ok',
  routes: [{
    distance: 408000, duration: 20500,
    geometry: { coordinates: [[-53.9, -28.3], [-51.2, -30.0]] },
    legs: [{ steps: [{ name: '', ref: 'BR-285' }, { name: 'Avenida Ipiranga', ref: '' }, { name: '', ref: 'BR-285' }] }],
  }],
};
const multi = {
  code: 'Ok',
  routes: [
    { distance: 408000, duration: 20500, geometry: { coordinates: [[0, 0], [1, 1]] }, legs: [] },
    { distance: 437000, duration: 22260, geometry: { coordinates: [[0, 0], [2, 2]] }, legs: [] },
    { distance: 0, duration: 0 },
  ],
};

const r1 = parseOsrm(oneRoute, 'osrm-demo');
check('1 rota parseada', r1.length === 1);
check('id/rank/provider', r1[0].id === 'r0' && r1[0].rank === 0 && r1[0].provider === 'osrm-demo');
check('lon,lat -> lat,lon', r1[0].geometry[0].lat === -28.3 && r1[0].geometry[0].lon === -53.9);
check('refs primeiro (sem misturar name urbano)', JSON.stringify(r1[0].roadNames) === JSON.stringify(['BR-285']));

const urban = { legs: [{ steps: [{ name: 'Avenida Ipiranga', ref: '' }, { name: 'Rua da Praia', ref: '' }] }] };
check('sem ref: usa names urbanos', JSON.stringify(extractRoadNames(urban)) === JSON.stringify(['Avenida Ipiranga', 'Rua da Praia']));
check('ref com ";" separa', JSON.stringify(extractRoadNames({ legs: [{ steps: [{ ref: 'BR-116; BR-290' }] }] })) === JSON.stringify(['BR-116', 'BR-290']));

const rm = parseOsrm(multi, 'fossgis');
check('múltiplas: ignora rota sem geometria', rm.length === 2 && rm[1].id === 'r1');
check('sem nomes -> roadNames vazio (UI mostra "Rota N")', rm[0].roadNames.length === 0);

check('routes vazio -> []', parseOsrm({ code: 'Ok', routes: [] }, 'osrm-demo').length === 0);
check('code != Ok -> []', parseOsrm({ code: 'NoRoute', routes: [] }, 'osrm-demo').length === 0);
check('extract sem legs -> []', extractRoadNames({}).length === 0);
check('extract ignora vazios', JSON.stringify(extractRoadNames({ legs: [{ steps: [{ name: '', ref: '' }] }] })) === '[]');

if (failures) { console.error(`ROUTING TEST: ${failures} falha(s)`); process.exit(1); }
console.log('ROUTING TEST PASS');
