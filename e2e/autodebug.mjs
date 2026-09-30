// Autodebugger V3: previsão protagonista, primeira dobra, alternativas,
// horário, demo atencao/perigo, reduced-motion, mobile.
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

function watch(page) {
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
}

const fail = (msg) => { console.error(`FALHA: ${msg}`); process.exitCode = 1; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
watch(page);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
await page.screenshot({ path: shot('01-inicial.png'), fullPage: true });

// Busca (screenshot do loading no meio)
await page.click('button.primary');
await page.waitForTimeout(1200);
await page.screenshot({ path: shot('02-busca-loading.png') });
try {
  await page.waitForSelector('.chapter', { timeout: 60000 });
} catch {
  fail('forecast ribbon não apareceu em 60s');
}

// GATE: primeira dobra em 1280x900 (summary + ribbon + mapa parcial, sem scroll)
const fold = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), height: Math.round(r.height) };
  };
  return { summary: box('#summary'), ribbon: box('#ribbon'), map: box('#map') };
});
console.log('primeira dobra:', JSON.stringify(fold));
if (!fold.summary || fold.summary.top >= 900) fail('summary fora da primeira dobra');
if (!fold.ribbon || fold.ribbon.top >= 900) fail('ribbon fora da primeira dobra');
if (!fold.map || fold.map.top >= 900) fail('mapa fora da primeira dobra');

const chapters = await page.locator('.chapter').count();
const dom = await page.locator('.j-dom').innerText().catch(() => '');
console.log(`chapters: ${chapters} | dominante: ${dom}`);
if (chapters < 1) fail('nenhum capítulo na ribbon');

const routeOptions = await page.locator('input[name="route"]').count();
console.log(`route options: ${routeOptions}`);
if (routeOptions < 1) fail('nenhuma route option após busca');
await page.waitForSelector('.leaflet-tile-loaded', { timeout: 30000 }).catch(() => fail('tiles não carregaram'));
if (cartoSeen) fail('request para cartocdn detectado (exige API key!)');
await page.waitForTimeout(1800);
await page.screenshot({ path: shot('03-previsao-pronta.png'), fullPage: true });

// Alternativa
if (routeOptions >= 2) {
  await page.locator('.route-chip').nth(1).click();
  try {
    await page.waitForFunction(
      () => document.querySelector('.route-chip.selected input')?.value === document.querySelectorAll('input[name="route"]')[1]?.value,
      { timeout: 45000 },
    );
  } catch {
    fail('segunda rota não assumiu seleção');
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: shot('04-rota-alternativa.png'), fullPage: true });
  console.log('alternativa ok');
} else {
  console.log('OSRM devolveu 1 rota: seguindo sem falha');
}

// Horário
await page.locator('#quickRow button[data-shift="30"]').click();
await page.waitForTimeout(5000);
console.log(`horario +30min: ${(await page.locator('#etaOut').innerText().catch(() => '')).trim()}`);
await page.screenshot({ path: shot('05-horario-alterado.png'), fullPage: true });

// Detalhe trecho a trecho
await page.locator('#detailToggle').click();
try {
  await page.waitForSelector('.stop:not(.skel)', { timeout: 15000 });
} catch {
  fail('timeline detalhada não expandiu');
}
console.log(`stops detalhe: ${await page.locator('.stop').count()}`);

console.log(`tiles hosts: ${[...tileHosts].join(', ')}`);
console.log(`console errors: ${consoleErrors.length}`, consoleErrors.slice(0, 10));
console.log(`bad requests: ${badRequests.length}`, badRequests.slice(0, 10));
if (consoleErrors.length) fail(`${consoleErrors.length} erro(s) de console`);
if (badRequests.length) fail(`${badRequests.length} request(s) com falha`);

// Mobile 390: ordem clima-antes-mapa + sem overflow
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
watch(mob);
await mob.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
await mob.click('button.primary');
await mob.waitForSelector('.chapter', { timeout: 60000 }).catch(() => fail('mobile: ribbon não apareceu'));
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(`mobile 390px: overflow-x = ${overflow}px`);
if (overflow > 1) fail(`rolagem horizontal no mobile: ${overflow}px`);
await mob.waitForTimeout(1500);
await mob.screenshot({ path: shot('06-mobile-ready.png'), fullPage: true });

// Demo atenção/perigo (DEV-only, dados simulados com badge)
for (const [mode, file] of [['atencao', '07-demo-atencao.png'], ['perigo', '08-demo-perigo.png']]) {
  const d = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  watch(d);
  await d.goto(`http://localhost:5173/?demo=${mode}`, { waitUntil: 'networkidle', timeout: 30000 });
  await d.click('button.primary');
  await d.waitForSelector('.chapter', { timeout: 60000 }).catch(() => fail(`demo ${mode}: ribbon não apareceu`));
  const badge = await d.locator('#demoBadge').isVisible().catch(() => false);
  if (!badge) fail(`demo ${mode}: badge de demonstração ausente`);
  await d.waitForTimeout(1500);
  await d.screenshot({ path: shot(file), fullPage: true });
  console.log(`demo ${mode} ok (badge visível)`);
  await d.close();
}

// Reduced motion: estado final imediato, sem draw
const rm = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
watch(rm);
await rm.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
await rm.click('button.primary');
await rm.waitForSelector('.chapter', { timeout: 60000 }).catch(() => fail('reduced-motion: ribbon não apareceu'));
await rm.screenshot({ path: shot('09-reduced-motion.png'), fullPage: true });
console.log('reduced-motion ok');

await browser.close();
console.log(process.exitCode ? 'AUTODEBUG: PROBLEMAS ENCONTRADOS' : 'AUTODEBUG PASS');
