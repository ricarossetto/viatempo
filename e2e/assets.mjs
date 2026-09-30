// Gera assets de branding rasterizados com Chromium (sem dependências novas).
// Uso: node e2e/assets.mjs [icons|og|hero|demo|all]  (exige dev em :5173 para hero/demo)
// Saídas versionadas: public/icon-*.png, public/apple-touch-icon.png,
// public/og-image.png, docs/assets/*.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] ?? 'all';
const browser = await chromium.launch();

async function shotLogo(size, out) {
  const svg = readFileSync(path.join(ROOT, 'public', 'favicon.svg'), 'utf8');
  const p = await browser.newPage({ viewport: { width: size + 32, height: size + 32 } });
  await p.setContent(
    `<body style="margin:0;background:#0f2a26;display:flex;align-items:center;justify-content:center;height:100vh"><div style="width:${size}px;height:${size}px">${svg}</div></body>`,
  );
  await p.locator('div').screenshot({ path: out });
  await p.close();
  console.log('ok:', out);
}

async function shotOg(w, h, out, title, tag) {
  const svg = readFileSync(path.join(ROOT, 'public', 'favicon.svg'), 'utf8');
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<body style="margin:0;background:#0f2a26;color:#f2f5f3;font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:18px">
<div style="width:120px;height:120px">${svg}</div>
<div style="font-size:84px;font-weight:700;letter-spacing:-2px">ViaTempo</div>
<div style="font-size:30px;color:#b9cdc5">${tag}</div>
<div style="width:min(760px,80%);border-top:3px dashed #e9a13b;margin-top:10px"></div>
</body>`);
  await p.screenshot({ path: out });
  await p.close();
  console.log('ok:', out);
}

if (mode === 'all' || mode === 'icons') {
  mkdirSync(path.join(ROOT, 'public'), { recursive: true });
  await shotLogo(512, path.join(ROOT, 'public', 'icon-512.png'));
  await shotLogo(192, path.join(ROOT, 'public', 'icon-192.png'));
  await shotLogo(180, path.join(ROOT, 'public', 'apple-touch-icon.png'));
}

if (mode === 'all' || mode === 'og') {
  await shotOg(1200, 630, path.join(ROOT, 'public', 'og-image.png'), '', 'O clima da sua viagem, no tempo certo.');
  mkdirSync(path.join(ROOT, 'docs', 'assets'), { recursive: true });
  await shotOg(1280, 640, path.join(ROOT, 'docs', 'assets', 'social-preview.png'), '', 'O clima da sua viagem, no tempo certo.');
}

if (mode === 'all' || mode === 'hero' || mode === 'demo') {
  mkdirSync(path.join(ROOT, 'docs', 'assets'), { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ...(mode === 'demo' ? { recordVideo: { dir: path.join(ROOT, 'docs', 'assets'), size: { width: 960, height: 675 } } } : {}),
  });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  await p.click('button.primary');
  await p.waitForSelector('.chapter', { timeout: 60000 });
  await p.waitForTimeout(2500);
  // fecha autocomplete/sugestões e tira foco antes de capturar
  await p.keyboard.press('Escape');
  await p.mouse.click(640, 20);
  await p.waitForTimeout(800);
  if (mode === 'all' || mode === 'hero') {
    await p.screenshot({ path: path.join(ROOT, 'docs', 'assets', 'viatempo-hero.png') });
    console.log('ok: docs/assets/viatempo-hero.png');
  }
  if (mode === 'demo') {
    const routes = await p.locator('input[name="route"]').count();
    if (routes >= 2) {
      await p.locator('.route-chip').nth(1).click();
      await p.waitForTimeout(4000);
    }
    await p.locator('#quickRow button[data-shift="30"]').click();
    await p.waitForTimeout(4000);
  }
  await p.close();
  await ctx.close();
}

await browser.close();
console.log('ASSETS OK');
