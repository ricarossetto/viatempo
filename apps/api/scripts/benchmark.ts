/**
 * Benchmark honesto: Open-Meteo (forecast) vs INMET (observado próximo).
 * Detecta erros de implementação (unidade, timezone, lat/lon) — NÃO declara
 * qual modelo "é melhor" com uma única comparação.
 */
import { inmetNearbyObservation, openmeteoPoint } from "@viatempo/providers";

const POINTS = [
  { name: "Ijuí/RS", lat: -28.26, lon: -53.91, ibge: "4310207" },
  { name: "Porto Alegre/RS", lat: -30.03, lon: -51.22, ibge: "4314902" },
  { name: "São Paulo/SP", lat: -23.55, lon: -46.63, ibge: "3550308" },
];

const now = new Date().toISOString();
console.log(`benchmark ${now}\n`);
for (const p of POINTS) {
  const fc = await openmeteoPoint(p.lat, p.lon, now).catch((e) => ({ error: String(e) }));
  const ob = await inmetNearbyObservation(p.ibge, p.lat, p.lon, now).catch(() => null);
  console.log(`== ${p.name} ==`);
  if ("error" in fc) {
    console.log(`  open-meteo: ERRO ${fc.error}`);
  } else {
    console.log(`  open-meteo: temp=${fc.temperature}°C vento=${fc.windSpeed} rajada=${fc.windGust} umid=${fc.humidity}%`);
  }
  if (ob) {
    console.log(`  inmet ${ob.obs.stationCode} (${ob.obs.distanceKm}km, há ${ob.obs.ageMinutes}min): temp=${ob.obs.temperatureC}°C vento=${ob.obs.windSpeedKmh} rajada=${ob.obs.windGustKmh}`);
    if (!("error" in fc) && fc.temperature !== null && ob.obs.temperatureC !== null) {
      const diff = Math.abs(fc.temperature - ob.obs.temperatureC);
      console.log(`  |Δtemp| = ${diff.toFixed(1)}°C ${diff > 5 ? "⚠ divergência alta (investigar, não concluir)" : "(plausível)"}`);
      if (ob.obs.windSpeedKmh !== null && ob.obs.windSpeedKmh > 200) console.log("  ⚠ vento INMET suspeito — conferir m/s vs km/h");
    }
  } else {
    console.log("  inmet: sem observação");
  }
  console.log("");
}
console.log("Notas: precipitação Open-Meteo amount (mm) vs probability (%) são campos distintos; INMET VEN_VEL original em m/s convertido para km/h.");
