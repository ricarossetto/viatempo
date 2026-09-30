// Smoke test da PRODUÇÃO (workers.dev). Não versionar evidências.
// Uso: BASE_URL=https://... node e2e/smoke-prod.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/';
const OUT = path.join(os.tmpdir(), 'opencode', 'smoke-prod');
mkdirSync(OUT, { recursive: true });

const consoleErrors = [];
const badRequests = [];
const tileHosts = new Set();
let cartoSeen = false;
const fail = (msg) => { console.error(`FALHA: ${msg}`); process.exitCode = 1; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on('requestfailed', (r) => badRequests.push(`${r.url()} :: ${r.failure()?.errorText}`));
page.on('response', (r) => {
  const url = r.url();
  if (url.endsWith('.png') || url.includes('tile') || url.includes('cartocdn')) {
    try { tileHosts.add(new URL(url).host); } catch { /* ignore */ }
  }
  if (url.includes('cartocdn')) cartoSeen = true;
  if (r.status() >= 400 && !url.includes('favicon')) badRequests.push(`${url} :: HTTP ${r.status}`);
});

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
const css = await page.locator('link[rel="stylesheet"], style').count();
console.log(`css presente: ${css > 0}`);
if (css === 0) fail('CSS não carregou');

// Fluxo completo
await page.fill('#from', 'Ijuí, RS');
await page.fill('#to', 'Porto Alegre, RS');
await page.click('button.primary');
await page.waitForSelector('.chapter', { timeout: 90000 }).catch(() => fail('ribbon não apareceu'));
await page.waitForSelector('.stop:not(.skel), .chapter', { timeout: 10000 }).catch(() => {});
const chapters = await page.locator('.chapter').count();
const brief = await page.locator('#summary').innerText().catch(() => '');
console.log(`chapters: ${chapters} | ${brief.split('\n')[0]}`);
if (chapters < 1) fail('sem capítulos');

// Mapa + markers
await page.waitForSelector('.leaflet-tile-loaded', { timeout: 45000 }).catch(() => fail('tiles OSM não carregaram'));
const markers = await page.locator('.wxm').count();
console.log(`markers clima: ${markers} | tiles: ${[...tileHosts].join(', ')}`);
if (markers < 2) fail('markers meteorológicos ausentes');
if (cartoSeen) fail('request CARTO em produção!');

// Alternativa + horário
const routes = await page.locator('input[name="route"]').count();
console.log(`rotas: ${routes}`);
if (routes >= 2) {
  await page.locator('.route-chip').nth(1).click();
  await page.waitForTimeout(6000);
  console.log('alternativa ok');
}
await page.locator('#quickRow button[data-shift="30"]').click();
await page.waitForTimeout(6000);
console.log(`horario: ${(await page.locator('#etaOut').innerText().catch(() => '')).trim()}`);
await page.screenshot({ path: path.join(OUT, 'prod-desktop.png'), fullPage: true });

// Mobile
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
mob.on('pageerror', (e) => consoleErrors.push(`mobile pageerror: ${e.message}`));
await mob.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
await mob.click('button.primary');
await mob.waitForSelector('.chapter', { timeout: 90000 }).catch(() => fail('mobile: ribbon não apareceu'));
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(`mobile overflow-x: ${overflow}px`);
if (overflow > 1) fail('overflow horizontal no mobile');
await mob.waitForTimeout(2000);
await mob.screenshot({ path: path.join(OUT, 'prod-mobile.png'), fullPage: true });

console.log(`console errors: ${consoleErrors.length}`, consoleErrors.slice(0, 10));
console.log(`bad requests: ${badRequests.length}`, badRequests.slice(0, 10));
if (consoleErrors.length) fail('erros de console em produção');
if (badRequests.length) fail('requests falhando em produção');
await browser.close();
console.log(process.exitCode ? 'SMOKE PROD: PROBLEMAS' : 'SMOKE PROD PASS');
console.log(`evidências em: ${OUT}`);
