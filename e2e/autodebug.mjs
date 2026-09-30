// Autodebugger V2: fluxo completo com rotas alternativas, horário e mobile.
// Uso: npm run test:e2e  (exige dev server em http://localhost:5173/)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = fileURLToPath(new URL('./evidencias/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const shot = (name) => path.join(OUT, name);

const consoleErrors = [];
const badRequests = [];
const tileHosts = new Set();
let cartoSeen = false;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => badRequests.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', (r) => {
  const url = r.url();
  if (/\/(tile|tiles|basemaps|arcgis|cartocdn)/i.test(url) || url.endsWith('.png')) {
    try { tileHosts.add(new URL(url).host); } catch { /* ignore */ }
  }
  if (url.includes('cartocdn')) cartoSeen = true;
  if (r.status() >= 400) badRequests.push(`${url} :: HTTP ${r.status}`);
});

const fail = (msg) => { console.error(`FALHA: ${msg}`); process.exitCode = 1; };

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
await page.screenshot({ path: shot('01-inicial.png'), fullPage: true });

const from = await page.inputValue('#from');
const to = await page.inputValue('#to');
console.log(`form defaults: "${from}" -> "${to}"`);
if (!from || !to) fail('inputs sem valor padrão');

// Busca: espera rotas E clima (stops reais, não skeleton)
await page.click('button.primary');
try {
  await page.waitForSelector('.stop:not(.skel)', { timeout: 60000 });
} catch {
  fail('timeline real não apareceu em 60s');
}
const stops = await page.locator('.stop').count();
const brief = await page.locator('#summary').innerText().catch(() => '');
console.log(`stops: ${stops} | brief: ${brief.split('\n')[0]}`);
if (stops < 2) fail(`stops insuficientes: ${stops}`);

// Rotas alternativas
const routeOptions = await page.locator('input[name="route"]').count();
console.log(`route options: ${routeOptions}`);
if (routeOptions < 1) fail('nenhuma route option após busca');
await page.waitForSelector('.leaflet-tile-loaded', { timeout: 30000 }).catch(() => fail('tiles não carregaram'));
console.log(`tiles hosts: ${[...tileHosts].join(', ')}`);
if (cartoSeen) fail('request para cartocdn detectado (exige API key!)');
await page.waitForTimeout(1500);
await page.screenshot({ path: shot('02-rotas.png'), fullPage: true });

// Alternativa: seleciona a 2ª rota se existir
if (routeOptions >= 2) {
  await page.locator('.route-card').nth(1).click();
  try {
    await page.waitForFunction(
      () => document.querySelector('.route-card.selected input')?.value === document.querySelectorAll('input[name="route"]')[1]?.value,
      { timeout: 45000 },
    );
  } catch {
    fail('segunda rota não assumiu seleção');
  }
  await page.waitForSelector('.stop:not(.skel)', { timeout: 45000 }).catch(() => fail('clima da alternativa não carregou'));
  const brief2 = await page.locator('#summary').innerText().catch(() => '');
  console.log(`alternativa ok | brief: ${brief2.split('\n')[0]}`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shot('03-alternativa-selecionada.png'), fullPage: true });
} else {
  console.log('OSRM devolveu 1 rota: seletor oculto, seguindo sem falha');
}

// Horário: quick action +30min
await page.locator('#quickRow button[data-shift="30"]').click();
await page.waitForTimeout(5000);
const eta = await page.locator('#etaOut').innerText().catch(() => '');
console.log(`horario +30min: ${eta}`);
await page.screenshot({ path: shot('04-horario-alterado.png'), fullPage: true });

console.log(`console errors: ${consoleErrors.length}`, consoleErrors.slice(0, 10));
console.log(`bad requests: ${badRequests.length}`, badRequests.slice(0, 10));
if (consoleErrors.length) fail(`${consoleErrors.length} erro(s) de console`);
if (badRequests.length) fail(`${badRequests.length} request(s) com falha`);

// Mobile 390px
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mob.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(`mobile 390px: overflow-x = ${overflow}px`);
if (overflow > 1) fail(`rolagem horizontal no mobile: ${overflow}px`);
await mob.screenshot({ path: shot('05-mobile.png'), fullPage: true });

await browser.close();
console.log(process.exitCode ? 'AUTODEBUG: PROBLEMAS ENCONTRADOS' : 'AUTODEBUG PASS');
