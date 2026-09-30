import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  alertsCacheStats,
  cptecCacheStats,
  cptecStatus,
  inmetCacheStats,
  openmeteoCacheStats,
  resolveIbge,
  weather,
  weatherBatch,
} from "@viatempo/providers";
import { geocode, route, sampleTimedPoints } from "@viatempo/routing";

const app = express();
app.use(cors());
app.use(express.json({ limit: "256kb" }));

const startedAt = Date.now();

const batchSchema = z.object({
  points: z
    .array(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        timestamp: z.string().min(10),
        label: z.string().optional(),
        ibge: z.string().optional(),
        uf: z.string().optional(),
      }),
    )
    .min(1)
    .max(50),
});

const tripSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  departure: z.string().min(10),
  maxPoints: z.number().int().min(2).max(12).optional(),
});

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, uptime_s: Math.round((Date.now() - startedAt) / 1000), version: "0.1.0" });
});

app.get("/api/status", async (_req, res) => {
  try {
    const cptec = await cptecStatus();
    res.json({
      ok: true,
      uptime_s: Math.round((Date.now() - startedAt) / 1000),
      cptec,
      cache: {
        openmeteo: openmeteoCacheStats(),
        inmet: inmetCacheStats(),
        alerts: alertsCacheStats(),
        cptec: cptecCacheStats(),
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/weather/batch", async (req, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  try {
    const out = await weatherBatch(parsed.data.points);
    res.json({ ok: true, count: out.length, items: out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/trips/forecast", async (req, res) => {
  const parsed = tripSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  const { origin, destination, departure, maxPoints } = parsed.data;
  if (!Number.isFinite(Date.parse(departure))) return res.status(400).json({ ok: false, error: `departure inválido: ${departure}` });
  try {
    const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
    const [ibgeO, ibgeD] = await Promise.all([
      o.city && o.uf ? resolveIbge(o.city, o.uf) : Promise.resolve(null),
      d.city && d.uf ? resolveIbge(d.city, d.uf) : Promise.resolve(null),
    ]);
    const r = await route(
      { latitude: o.latitude, longitude: o.longitude },
      { latitude: d.latitude, longitude: d.longitude },
    );
    const timed = sampleTimedPoints(r.coordinates, departure, r.durationS, maxPoints ?? 8);
    const uf = o.uf ?? d.uf ?? undefined;
    const items = await weatherBatch(
      timed.map((t, i) => ({
        latitude: t.latitude,
        longitude: t.longitude,
        timestamp: t.eta,
        label: (i === 0 ? o.label : i === timed.length - 1 ? d.label : t.label) ?? undefined,
        ibge: i === 0 ? (ibgeO ?? undefined) : i === timed.length - 1 ? (ibgeD ?? undefined) : undefined,
        uf,
      })),
    );

    const timeline = timed.map((t, i) => ({ ...t, weather: items[i] }));
    const levels = ["none", "attention", "alert", "severe", "unknown"] as const;
    let worst = 0;
    for (const it of items) {
      const idx = levels.indexOf(it.hazard?.level ?? "unknown");
      if (it.hazard && it.hazard.level !== "unknown") worst = Math.max(worst, ["none", "attention", "alert", "severe"].indexOf(it.hazard.level));
      else worst = Math.max(worst, 0);
      void idx;
    }
    const summary = {
      origin: { ...o, ibge: ibgeO },
      destination: { ...d, ibge: ibgeD },
      departure,
      arrival: timed[timed.length - 1].eta,
      distanceKm: Math.round((r.distanceM / 1000) * 10) / 10,
      durationH: Math.round((r.durationS / 3600) * 100) / 100,
      worstHazard: ["none", "attention", "alert", "severe"][worst] as string,
      fallbackUsed: items.some((w) => w.source.fallback),
    };
    const alertMap = new Map<string, (typeof items)[number]["alerts"][number]>();
    for (const it of items) for (const a of it.alerts) alertMap.set(a.id, a);
    res.json({
      ok: true,
      summary,
      route: { distanceM: r.distanceM, durationS: r.durationS, bbox: r.bbox, source: r.source },
      timeline,
      alerts: [...alertMap.values()],
      sources: items.map((w) => w.source),
    });
  } catch (e) {
    res.status(502).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

// endpoint fino de conveniência p/ debug de um ponto
app.get("/api/weather", async (req, res) => {
  const q = z
    .object({ lat: z.coerce.number(), lon: z.coerce.number(), at: z.string(), ibge: z.string().optional(), uf: z.string().optional() })
    .safeParse(req.query);
  if (!q.success) return res.status(400).json({ ok: false, error: q.error.flatten() });
  try {
    const out = await weather({ latitude: q.data.lat, longitude: q.data.lon, timestamp: q.data.at, ibge: q.data.ibge, uf: q.data.uf });
    res.json({ ok: true, item: out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`ViaTempo API em http://localhost:${PORT}`);
});
