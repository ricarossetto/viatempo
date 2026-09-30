// Autodebugger: abre o app de verdade no Chromium headless, captura console,
// requests falhados, executa o fluxo completo e salva evidências.
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
  if (r.status() >= 400) badRequests.push(`${url} :: HTTP ${r.status()}`);
});

const fail = (msg) => { console.error(`FALHA: ${msg}`); process.exitCode = 1; };

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
await page.screenshot({ path: shot('01-inicial.png'), fullPage: true });

// Form com defaults?
const from = await page.inputValue('#from');
const to = await page.inputValue('#to');
console.log(`form defaults: "${from}" -> "${to}"`);
if (!from || !to) fail('inputs sem valor padrão');

// Fluxo completo (espera os stops REAIS, não o skeleton de loading)
await page.click('button.primary');
try {
  await page.waitForSelector('.stop:not(.skel)', { timeout: 45000 });
} catch {
  fail('timeline real (.stop sem skeleton) não apareceu em 45s');
}
const stops = await page.locator('.stop').count();
const summary = await page.locator('#summary').innerText().catch(() => '');
console.log(`stops: ${stops} | resumo: ${summary.split('\n')[0]}`);
if (stops < 2) fail(`stops insuficientes: ${stops}`);

// Tiles do mapa carregaram?
try {
  await page.waitForSelector('.leaflet-tile-loaded', { timeout: 30000 });
} catch {
  fail('nenhum tile do mapa carregou em 30s');
}
const tiles = await page.locator('.leaflet-tile-loaded').count();
console.log(`tiles carregados: ${tiles} | hosts: ${[...tileHosts].join(', ')}`);
if (cartoSeen) fail('request para cartocdn detectado (exige API key!)');

await page.waitForTimeout(2000);
await page.screenshot({ path: shot('02-resultado.png'), fullPage: true });

// Slider: desloca +60min e espera o refetch
const shift = page.locator('#shift');
if (await shift.isEnabled()) {
  await shift.fill('60');
  await page.dispatchEvent('#shift', 'input');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: shot('03-slider.png'), fullPage: true });
  console.log(`slider +60min: ${(await page.locator('#shiftLabel').innerText()).trim()}`);
} else {
  console.log('slider desabilitado (sem plano?)');
}

console.log(`console errors: ${consoleErrors.length}`, consoleErrors.slice(0, 10));
console.log(`bad requests: ${badRequests.length}`, badRequests.slice(0, 10));
if (consoleErrors.length) fail(`${consoleErrors.length} erro(s) de console`);
if (badRequests.length) fail(`${badRequests.length} request(s) com falha`);

await browser.close();
console.log(process.exitCode ? 'AUTODEBUG: PROBLEMAS ENCONTRADOS' : 'AUTODEBUG PASS');
