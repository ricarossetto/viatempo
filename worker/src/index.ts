/**
 * ViaTempo na edge (Cloudflare Workers).
 * Mesmos contratos do Express em apps/api/src/index.ts, reutilizando
 * @viatempo/providers + @viatempo/routing (só fetch/Web APIs — sem Node).
 * Estático (landing) servido pela plataforma; worker responde /api/*.
 */
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

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

/** KV mínimo (sem @cloudflare/workers-types). */
interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}
interface Env {
  INGEST?: KV;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });
}

async function tripForecast(body: {
  origin?: string;
  destination?: string;
  departure?: string;
  maxPoints?: number;
}): Promise<Response> {
  const { origin, destination, departure } = body;
  const maxPoints = Math.max(2, Math.min(body.maxPoints ?? 8, 12));
  if (!origin || typeof origin !== "string" || origin.trim().length < 2)
    return json({ ok: false, error: "origin inválida" }, 400);
  if (!destination || typeof destination !== "string" || destination.trim().length < 2)
    return json({ ok: false, error: "destination inválida" }, 400);
  if (!departure || !Number.isFinite(Date.parse(departure)))
    return json({ ok: false, error: `departure inválido: ${departure}` }, 400);
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
    const timed = sampleTimedPoints(r.coordinates, departure, r.durationS, maxPoints);
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
    const order = ["none", "attention", "alert", "severe"];
    let worst = 0;
    for (const it of items) {
      const idx = order.indexOf(it.hazard?.level ?? "none");
      worst = Math.max(worst, idx < 0 ? 0 : idx);
    }
    const alertMap = new Map<string, (typeof items)[number]["alerts"][number]>();
    for (const it of items) for (const a of it.alerts) alertMap.set(a.id, a);
    return json({
      ok: true,
      summary: {
        origin: { ...o, ibge: ibgeO },
        destination: { ...d, ibge: ibgeD },
        departure,
        arrival: timed[timed.length - 1].eta,
        distanceKm: Math.round((r.distanceM / 1000) * 10) / 10,
        durationH: Math.round((r.durationS / 3600) * 100) / 100,
        worstHazard: order[worst],
        fallbackUsed: items.some((w) => w.source.fallback),
      },
      route: { distanceM: r.distanceM, durationS: r.durationS, bbox: r.bbox, source: r.source },
      timeline,
      alerts: [...alertMap.values()],
      sources: items.map((w) => w.source),
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 502);
  }
}

/** Ingestão agendada: runs CPTEC + catálogo INMET → KV (30 min). */
async function runIngest(env: Env): Promise<Record<string, unknown>> {
  const fetchedAt = new Date().toISOString();
  const cptec = await cptecStatus().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
  let stations: unknown = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch("https://apitempo.inmet.gov.br/estacoes/T", {
        signal: ctrl.signal,
        headers: { "User-Agent": "ViaTempo-ingestor/1.0", Accept: "application/json" },
      });
      const list = (await res.json()) as { CD_SITUACAO?: string }[];
      const oper = list.filter((s) => s.CD_SITUACAO === "Operante").length;
      stations = { total: list.length, operantes: oper };
    } finally {
      clearTimeout(t);
    }
  } catch (e) {
    stations = { error: e instanceof Error ? e.message : String(e) };
  }
  const doc = { fetchedAt, cptec, stations };
  try {
    await env.INGEST?.put("ingest:latest", JSON.stringify(doc), { expirationTtl: 6 * 3600 });
  } catch {
    /* sem KV (dev sem persistência): só retorna o doc */
  }
  return doc;
}

export default {
  async scheduled(_controller: unknown, env: Env): Promise<void> {
    await runIngest(env);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/api/health") return json({ ok: true, version: "0.1.0", edge: true });

    if (url.pathname === "/api/ingest" && request.method === "GET") {
      const raw = await env.INGEST?.get("ingest:latest").catch(() => null);
      if (!raw) return json({ ok: false, error: "sem snapshot (cron ainda não rodou)" }, 404);
      return new Response(raw, { headers: { "content-type": "application/json; charset=utf-8", ...CORS } });
    }

    if (url.pathname === "/api/ingest/run" && request.method === "POST") {
      return json({ ok: true, ...(await runIngest(env)) });
    }

    if (url.pathname === "/api/status") {
      try {
        return json({
          ok: true,
          edge: true,
          cptec: await cptecStatus(),
          cache: {
            openmeteo: openmeteoCacheStats(),
            inmet: inmetCacheStats(),
            alerts: alertsCacheStats(),
            cptec: cptecCacheStats(),
          },
        });
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }

    if (url.pathname === "/api/weather" && request.method === "GET") {
      const lat = Number(url.searchParams.get("lat"));
      const lon = Number(url.searchParams.get("lon"));
      const at = url.searchParams.get("at") ?? "";
      try {
        return json({
          ok: true,
          item: await weather({
            latitude: lat,
            longitude: lon,
            timestamp: at,
            ibge: url.searchParams.get("ibge") ?? undefined,
            uf: url.searchParams.get("uf") ?? undefined,
          }),
        });
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
      }
    }

    if (url.pathname === "/api/weather/batch" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          points?: { latitude: number; longitude: number; timestamp: string; label?: string; ibge?: string; uf?: string }[];
        };
        if (!body.points || !Array.isArray(body.points) || body.points.length < 1 || body.points.length > 50)
          return json({ ok: false, error: "points deve ter 1–50 itens" }, 400);
        const out = await weatherBatch(body.points);
        return json({ ok: true, count: out.length, items: out });
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
      }
    }

    if (url.pathname === "/api/trips/forecast" && request.method === "POST") {
      try {
        return await tripForecast((await request.json()) as Record<string, string>);
      } catch {
        return json({ ok: false, error: "JSON inválido" }, 400);
      }
    }

    return json({ ok: false, error: "not_found" }, 404);
  },
};
