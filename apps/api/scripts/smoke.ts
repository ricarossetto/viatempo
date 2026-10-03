/**
 * Smoke tests contra fontes externas reais.
 * Críticos (falham o script): Open-Meteo, OSRM, geocoding.
 * Best-effort (só avisam): INMET, CPTEC, alertas.
 * O CI não deve depender disso — rode manualmente ou em workflow separado.
 */
import { cptecStatus } from "@viatempo/providers";
import { inmetNearbyObservation } from "@viatempo/providers";
import { openmeteoPoint } from "@viatempo/providers";
import { geocode, route } from "@viatempo/routing";

let failures = 0;
function ok(name: string, detail: string) {
  console.log(`PASS ${name} — ${detail}`);
}
function fail(name: string, detail: string, critical: boolean) {
  console.log(`${critical ? "FAIL" : "WARN"} ${name} — ${detail}`);
  if (critical) failures++;
}

const IJUI = { lat: -28.26, lon: -53.91 };

// 1. Open-Meteo (crítico)
try {
  const p = await openmeteoPoint(IJUI.lat, IJUI.lon, new Date().toISOString());
  ok("open-meteo", `temp=${p.temperature}°C vento=${p.windSpeed}km/h cond=${p.condition}`);
} catch (e) {
  fail("open-meteo", String(e), true);
}

// 2. Geocoding (crítico)
try {
  const g = await geocode("Ijuí, RS");
  ok("geocode", `${g.label} -> ${g.latitude},${g.longitude} uf=${g.uf} src=${g.source}`);
} catch (e) {
  fail("geocode", String(e), true);
}

// 3. OSRM Ijuí→POA (crítico)
try {
  const r = await route({ latitude: -28.26, longitude: -53.91 }, { latitude: -30.03, longitude: -51.22 });
  ok("osrm", `dist=${(r.distanceM / 1000).toFixed(0)}km dur=${(r.durationS / 3600).toFixed(1)}h pts=${r.coordinates.length}`);
} catch (e) {
  fail("osrm", String(e), true);
}

// 4. INMET obs (best-effort)
try {
  const o = await inmetNearbyObservation("4310207", IJUI.lat, IJUI.lon, new Date().toISOString());
  if (o) ok("inmet-obs", `${o.obs.stationName} (${o.obs.stationCode}) ${o.obs.temperatureC}°C vento=${o.obs.windSpeedKmh}km/h há ${o.obs.ageMinutes}min`);
  else fail("inmet-obs", "null (sem dados)", false);
} catch (e) {
  fail("inmet-obs", String(e), false);
}

// 5. CPTEC runs (best-effort)
try {
  const s = await cptecStatus();
  const wrf = s.models.find((m) => m.model === "wrf");
  ok("cptec", `wrf=${wrf?.lastRun ?? "?"} monan=${s.models.find((m) => m.model === "monan")?.lastRun ?? "?"}`);
} catch (e) {
  fail("cptec", String(e), false);
}

if (failures > 0) {
  console.error(`\n${failures} smoke(s) crítico(s) falharam`);
  process.exit(1);
}
console.log("\nsmokes críticos OK");
