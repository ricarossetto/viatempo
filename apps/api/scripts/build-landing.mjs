/**
 * Regenera apps/api/public/index.html a partir das fontes editáveis
 * (réplica fiel de assets/v2/build.ps1 do projeto Open Design).
 *
 * Uso: node scripts/build-landing.mjs   (a partir de apps/api/)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const v2 = join(pub, "assets", "v2");
const read = (p) => readFileSync(p, "utf8");

const shell = read(join(v2, "shell.html"));
const fonts = read(join(v2, "fonts.css"));
const css = read(join(v2, "styles.css"));
const data = read(join(pub, "assets", "data.js"));
const scene = read(join(v2, "scene.js"));
const app = read(join(v2, "app.js"));

const built = shell
  .split("<!--STYLES-->").join(`${fonts}\r\n${css}`)
  .split("<!--SCENE-->").join(scene)
  .split("<!--DATA-->").join(data)
  .split("<!--APP-->").join(app);

const out = join(pub, "index.html");
writeFileSync(out, built, "utf8");
console.log(`built: ${out} (${Buffer.byteLength(built, "utf8")} bytes)`);
