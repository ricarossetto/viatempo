var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// packages/providers/src/http.ts
async function fetchJson(url, opts = {}) {
  const { timeoutMs = 8e3, retries = 1, headers = {} } = opts;
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "ViaTempo/1.0 (contato: viatempo)", Accept: "application/json", ...headers }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}
__name(fetchJson, "fetchJson");

// packages/providers/src/cache.ts
var MemoryCache = class {
  constructor(ttlMs, staleMs = 0) {
    this.ttlMs = ttlMs;
    this.staleMs = staleMs;
  }
  ttlMs;
  staleMs;
  static {
    __name(this, "MemoryCache");
  }
  map = /* @__PURE__ */ new Map();
  stats = { hits: 0, misses: 0, stale: 0 };
  get(key, now = Date.now()) {
    const e = this.map.get(key);
    if (!e) {
      this.stats.misses++;
      return null;
    }
    if (now <= e.expiresAt) {
      this.stats.hits++;
      return { value: e.value, fresh: true };
    }
    if (this.staleMs > 0 && now <= e.expiresAt + this.staleMs) {
      this.stats.stale++;
      return { value: e.value, fresh: false };
    }
    this.map.delete(key);
    this.stats.misses++;
    return null;
  }
  set(key, value, now = Date.now(), ttlMs = this.ttlMs) {
    this.map.set(key, { value, storedAt: now, expiresAt: now + ttlMs });
  }
  /** Last-known-good mesmo expirado (para fallback degradado). */
  getStale(key) {
    return this.map.get(key)?.value ?? null;
  }
  clear() {
    this.map.clear();
  }
  size() {
    return this.map.size;
  }
};
function weatherCacheKey(provider, lat, lon, hourIso) {
  return `${provider}:${lat.toFixed(2)}:${lon.toFixed(2)}:${hourIso.slice(0, 13)}`;
}
__name(weatherCacheKey, "weatherCacheKey");

// packages/weather-domain/src/units.ts
function msToKmh(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return round1(v * 3.6);
}
__name(msToKmh, "msToKmh");
function kmh(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return round1(v);
}
__name(kmh, "kmh");
function pct(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < 0 || v > 100) return null;
  return Math.round(v);
}
__name(pct, "pct");
function round1(v) {
  return Math.round(v * 10) / 10;
}
__name(round1, "round1");
function cleanNumber(v, sentinels = [-999, -999, 9999]) {
  if (v === null || v === void 0 || v === "") return null;
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (sentinels.includes(n)) return null;
  return n;
}
__name(cleanNumber, "cleanNumber");

// packages/weather-domain/src/wmo.ts
function wmoToCondition(code) {
  if (typeof code !== "number" || !Number.isFinite(code)) return { condition: "unknown", native: "null" };
  const c = Math.round(code);
  if (c === 0) return { condition: "clear", native: "0" };
  if (c === 1) return { condition: "clear", native: "1" };
  if (c === 2) return { condition: "partly_cloudy", native: "2" };
  if (c === 3) return { condition: "overcast", native: "3" };
  if (c === 45 || c === 48) return { condition: "fog", native: String(c) };
  if (c === 51 || c === 53 || c === 55) return { condition: "drizzle", native: String(c) };
  if (c === 56 || c === 57) return { condition: "drizzle", native: String(c) };
  if (c === 61 || c === 63 || c === 65) return { condition: c === 65 ? "heavy_rain" : "rain", native: String(c) };
  if (c === 66 || c === 67) return { condition: "rain", native: String(c) };
  if (c === 71 || c === 73 || c === 75 || c === 77) return { condition: "snow", native: String(c) };
  if (c === 80 || c === 81 || c === 82) return { condition: c === 82 ? "heavy_rain" : "rain", native: String(c) };
  if (c === 85 || c === 86) return { condition: "snow", native: String(c) };
  if (c === 95) return { condition: "storm", native: "95" };
  if (c === 96 || c === 99) return { condition: "storm", native: String(c) };
  return { condition: "unknown", native: String(c) };
}
__name(wmoToCondition, "wmoToCondition");
function inmetResumoToCondition(resumo) {
  if (typeof resumo !== "string" || !resumo.trim()) return null;
  const s = resumo.toLowerCase();
  if (/(trovoad|tempestade|raios)/.test(s)) return "storm";
  if (/(chuva intensa|chuva forte|temporal|pancadas fortes)/.test(s)) return "heavy_rain";
  if (/(chuva|chuvoso|pancada|garoa|chuvisco)/.test(s)) return /garoa|chuvisco/.test(s) ? "drizzle" : "rain";
  if (/(nevoeiro|névoa|neblina)/.test(s)) return "fog";
  if (/(encoberto|nublado|muitas nuvens)/.test(s)) return "overcast";
  if (/(poucas nuvens|parcialmente|claro|sol)/.test(s)) return /(parcial|poucas)/.test(s) ? "partly_cloudy" : "clear";
  return "unknown";
}
__name(inmetResumoToCondition, "inmetResumoToCondition");

// packages/weather-domain/src/hazard.ts
var DEFAULT_THRESHOLDS = {
  rainAttentionMm: 2.5,
  rainAlertMm: 10,
  rainSevereMm: 25,
  gustAttentionKmh: 50,
  gustAlertKmh: 65,
  gustSevereKmh: 80,
  windAttentionKmh: 40,
  windAlertKmh: 55,
  visibilityAlertM: 1e3,
  visibilitySevereM: 300
};
function fmtKmh(v) {
  return `${Math.round(v)} km/h`;
}
__name(fmtKmh, "fmtKmh");
function assessHazard(w, thresholds = DEFAULT_THRESHOLDS) {
  const reasons = [];
  let score = 0;
  const amt = w.precipitation.amount;
  const prob = w.precipitation.probability;
  const gust = w.wind.gust;
  const speed = w.wind.speed;
  const vis = w.visibility;
  const criticalMissing = [];
  if (amt === null) criticalMissing.push("precipitation.amount");
  if (gust === null && speed === null) criticalMissing.push("wind");
  if (vis === null) criticalMissing.push("visibility");
  if (amt !== null) {
    if (amt >= thresholds.rainSevereMm) {
      score = Math.max(score, 3);
      reasons.push(`chuva intensa prevista (${amt} mm/h)`);
    } else if (amt >= thresholds.rainAlertMm) {
      score = Math.max(score, 2);
      reasons.push(`chuva forte prevista (${amt} mm/h)`);
    } else if (amt >= thresholds.rainAttentionMm) {
      score = Math.max(score, 1);
      reasons.push(`chuva moderada prevista (${amt} mm/h)`);
    } else if (amt > 0) {
      reasons.push(`chuva fraca prevista (${amt} mm/h)`);
    }
  }
  if (typeof prob === "number" && amt !== null && amt > 0) {
    if (prob >= 70 && amt >= thresholds.rainAttentionMm) {
      reasons.push(`probabilidade alta (${prob}%)`);
      score = Math.max(score, Math.min(3, score + 1));
    }
  }
  const g = gust ?? speed;
  if (g !== null) {
    if (g >= thresholds.gustSevereKmh) {
      score = Math.max(score, 3);
      reasons.push(`rajadas de ${fmtKmh(g)}`);
    } else if (g >= thresholds.gustAlertKmh) {
      score = Math.max(score, 2);
      reasons.push(`rajadas de ${fmtKmh(g)}`);
    } else if (g >= thresholds.gustAttentionKmh) {
      score = Math.max(score, 1);
      reasons.push(`rajadas de ${fmtKmh(g)}`);
    }
  }
  if (vis !== null) {
    if (vis < thresholds.visibilitySevereM) {
      score = Math.max(score, 3);
      reasons.push(`visibilidade muito baixa (${vis} m)`);
    } else if (vis < thresholds.visibilityAlertM) {
      score = Math.max(score, 2);
      reasons.push(`visibilidade baixa (${vis} m)`);
    }
  }
  if (w.condition === "storm") {
    score = Math.max(score, 3);
    reasons.push("tempestade prevista");
  } else if (w.condition === "heavy_rain") {
    score = Math.max(score, 2);
    if (!reasons.some((r) => r.includes("chuva"))) reasons.push("chuva intensa prevista");
  } else if (w.condition === "fog") {
    score = Math.max(score, 2);
    reasons.push("nevoeiro previsto");
  }
  for (const a of w.alerts ?? []) {
    const sev = (a.severity ?? "").toLowerCase();
    const lvl = a.level ?? 0;
    if (/grande perigo|perigo iminente|extremo|severo|vermelho/.test(sev) || lvl >= 3) {
      score = Math.max(score, 3);
      reasons.push(`alerta oficial: ${a.event}`);
    } else if (/potencial|amarelo/.test(sev) || lvl <= 1) {
      score = Math.max(score, 1);
      reasons.push(`alerta oficial: ${a.event}`);
    } else if (/perigo|laranja/.test(sev) || lvl === 2) {
      score = Math.max(score, 2);
      reasons.push(`alerta oficial: ${a.event}`);
    } else if (a.event) {
      score = Math.max(score, 1);
      reasons.push(`alerta oficial: ${a.event}`);
    }
  }
  const completeness = criticalMissing.length === 0 ? 1 : criticalMissing.length === 1 ? 0.66 : 0.33;
  const dataGap = criticalMissing.length >= 2;
  let level = score === 0 ? "none" : score === 1 ? "attention" : score === 2 ? "alert" : "severe";
  if (dataGap && level === "none") level = "unknown";
  if (dataGap && reasons.length === 0) reasons.push("dados incompletos \u2014 aus\xEAncia de dados n\xE3o significa condi\xE7\xE3o segura");
  return { level, reasons, completeness, dataGap };
}
__name(assessHazard, "assessHazard");

// packages/weather-domain/src/time.ts
function toMs(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) throw new Error(`timestamp inv\xE1lido: ${iso}`);
  return ms;
}
__name(toMs, "toMs");
function floorHour(iso) {
  const ms = toMs(iso);
  const d = new Date(ms);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}
__name(floorHour, "floorHour");
function ageMinutes(fromIso, toIsoStr) {
  try {
    return Math.max(0, Math.round((Date.parse(toIsoStr) - Date.parse(fromIso)) / 6e4));
  } catch {
    return null;
  }
}
__name(ageMinutes, "ageMinutes");
function haversineKm(aLat, aLon, bLat, bLon) {
  const R = 6371;
  const dLat = (bLat - aLat) * Math.PI / 180;
  const dLon = (bLon - aLon) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const a = s1 * s1 + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
__name(haversineKm, "haversineKm");

// packages/providers/src/openmeteo.ts
var BASE = "https://api.open-meteo.com/v1/forecast";
var cache = new MemoryCache(60 * 60 * 1e3, 3 * 60 * 60 * 1e3);
function openmeteoCacheStats() {
  return cache.stats;
}
__name(openmeteoCacheStats, "openmeteoCacheStats");
async function openmeteoPoint(lat, lon, requestedTime) {
  const hour = requestedTime.slice(0, 13) + ":00:00";
  const key = weatherCacheKey("open-meteo", lat, lon, hour);
  const hit = cache.get(key);
  if (hit) return hit.value;
  const url = `${BASE}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility,cloud_cover&timezone=America%2FSao_Paulo&forecast_days=7&wind_speed_unit=kmh`;
  const data = await fetchJson(url, { timeoutMs: 8e3, retries: 1 });
  const h = data.hourly;
  const target = new Date(requestedTime).getTime();
  let best = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < h.time.length; i++) {
    const t = Date.parse(h.time[i].length === 16 ? h.time[i] + ":00-03:00" : h.time[i]);
    const d = Math.abs(t - target);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  if (best < 0) throw new Error("Open-Meteo retornou s\xE9rie vazia");
  const at = /* @__PURE__ */ __name((arr) => arr && best < arr.length ? arr[best] : null, "at");
  const wmo = wmoToCondition(at(h.weather_code));
  const point = {
    forecastTime: h.time[best].length === 16 ? h.time[best] + ":00-03:00" : h.time[best],
    temperature: cleanNumber(at(h.temperature_2m)),
    humidity: pct(at(h.relative_humidity_2m)),
    precipAmount: cleanNumber(at(h.precipitation)),
    precipProb: pct(at(h.precipitation_probability)),
    windSpeed: kmh(at(h.wind_speed_10m)),
    windGust: kmh(at(h.wind_gusts_10m)),
    windDir: typeof at(h.wind_direction_10m) === "number" ? Math.round(at(h.wind_direction_10m)) : null,
    visibility: cleanNumber(at(h.visibility)),
    cloudCover: pct(at(h.cloud_cover)),
    condition: wmo.condition,
    conditionCode: `wmo-${wmo.native}`,
    timezone: data.timezone ?? "America/Sao_Paulo"
  };
  cache.set(key, point);
  return point;
}
__name(openmeteoPoint, "openmeteoPoint");

// packages/providers/src/inmet.ts
var BASE2 = "https://apiprevmet3.inmet.gov.br";
var obsCache = new MemoryCache(15 * 60 * 1e3, 60 * 60 * 1e3);
function inmetCacheStats() {
  return obsCache.stats;
}
__name(inmetCacheStats, "inmetCacheStats");
function num(v) {
  return cleanNumber(v, [-999, 9999]);
}
__name(num, "num");
async function inmetNearbyObservation(ibge, pointLat, pointLon, nowIso) {
  const hit = obsCache.get(`inmet-obs:${ibge}`);
  if (hit) return hit.value;
  try {
    const data = await fetchJson(`${BASE2}/estacao/proxima/${encodeURIComponent(ibge)}`, {
      timeoutMs: 7e3,
      retries: 1
    });
    const e = data.estacao;
    const d = data.dados ?? {};
    const stLat = Number(String(e.LATITUDE).replace(",", "."));
    const stLon = Number(String(e.LONGITUDE).replace(",", "."));
    const distCatalog = Number(String(e.DISTANCIA_EM_KM).replace(",", "."));
    const dist = Number.isFinite(stLat) && Number.isFinite(stLon) ? haversineKm(pointLat, pointLon, stLat, stLon) : distCatalog;
    const measuredAt = d.DT_MEDICAO && d.HR_MEDICAO ? isoFromInmet(d.DT_MEDICAO, d.HR_MEDICAO) : null;
    const obs = {
      stationCode: e.CODIGO,
      stationName: e.NOME ?? d.DC_NOME ?? null,
      distanceKm: Math.round((Number.isFinite(dist) ? dist : 999) * 10) / 10,
      measuredAt: measuredAt ?? nowIso,
      ageMinutes: measuredAt ? ageMinutes(measuredAt, nowIso) ?? null : null,
      temperatureC: num(d.TEM_INS ?? d.TEM_MAX),
      windSpeedKmh: d.VEN_VEL !== void 0 ? msToKmh(num(d.VEN_VEL)) : null,
      windGustKmh: d.VEN_RAJ !== void 0 ? msToKmh(num(d.VEN_RAJ)) : null,
      humidityPct: num(d.UMD_INS),
      precipitationMm: num(d.CHUVA)
    };
    const out = { obs, raw: d };
    obsCache.set(`inmet-obs:${ibge}`, out);
    return out;
  } catch {
    return obsCache.getStale(`inmet-obs:${ibge}`);
  }
}
__name(inmetNearbyObservation, "inmetNearbyObservation");
function isoFromInmet(date, hour) {
  try {
    const hh = hour.padStart(4, "0").slice(0, 2);
    const mm = hour.padStart(4, "0").slice(2, 4);
    return (/* @__PURE__ */ new Date(`${date}T${hh}:${mm}:00Z`)).toISOString();
  } catch {
    return null;
  }
}
__name(isoFromInmet, "isoFromInmet");
async function inmetForecast(ibge) {
  try {
    const data = await fetchJson(
      `${BASE2}/previsao/${encodeURIComponent(ibge)}`,
      { timeoutMs: 7e3, retries: 1 }
    );
    const muni = data[ibge];
    if (!muni) return null;
    const out = [];
    for (const [date, shifts] of Object.entries(muni)) {
      for (const [shift, info] of Object.entries(shifts)) {
        const resumo = typeof info.resumo === "string" ? info.resumo : null;
        out.push({
          date,
          shift,
          resumo,
          tempMin: num(info.temp_min),
          tempMax: num(info.temp_max),
          condition: inmetResumoToCondition(resumo)
        });
      }
    }
    return out;
  } catch {
    return null;
  }
}
__name(inmetForecast, "inmetForecast");

// packages/providers/src/ibge.ts
var KNOWN_IBGE = {
  "ijui-rs": "4310207",
  "porto alegre-rs": "4314902",
  "cruz alta-rs": "4306106",
  "soledade-rs": "4320800",
  "sao paulo-sp": "3550308",
  "rio de janeiro-rj": "3304557",
  "belo horizonte-mg": "3106200",
  "brasilia-df": "5300108",
  "curitiba-pr": "4106902",
  "campinas-sp": "3509502"
};
var norm = /* @__PURE__ */ __name((s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(), "norm");
var ibgeCache = new MemoryCache(30 * 24 * 3600 * 1e3);
async function resolveIbge(city, uf) {
  const key = `${norm(city)}-${norm(uf)}`;
  const hit = ibgeCache.get(`ibge:${key}`);
  if (hit) return hit.value;
  const known = KNOWN_IBGE[key];
  if (known) {
    ibgeCache.set(`ibge:${key}`, known);
    return known;
  }
  try {
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf.toUpperCase())}/municipios`;
    const list = await fetchJson(url, { timeoutMs: 8e3, retries: 1 });
    const found = list.find((m) => norm(m.nome) === norm(city));
    if (found) {
      ibgeCache.set(`ibge:${key}`, String(found.id));
      return String(found.id);
    }
    return null;
  } catch {
    return null;
  }
}
__name(resolveIbge, "resolveIbge");

// packages/providers/src/cptec.ts
var S1 = "https://s1.cptec.inpe.br/grafico/Modelos/portal_previsao_numerica";
var statusCache = new MemoryCache(30 * 60 * 1e3, 6 * 3600 * 1e3);
function cptecCacheStats() {
  return statusCache.stats;
}
__name(cptecCacheStats, "cptecCacheStats");
var MODELS = ["monan", "bam", "brams", "wrf", "eta", "smec"];
async function modelRuns(model) {
  try {
    const data = await fetchJson(`${S1}/mod_${model}.json`, { timeoutMs: 6e3, retries: 1 });
    const runs = data.datesRun ?? [];
    const lastRun = runs[0] ?? null;
    let ageHours = null;
    let stale = true;
    if (lastRun) {
      const m = lastRun.match(/(\d{4}-\d{2}-\d{2}) (\d{2})z/);
      if (m) {
        const runMs = Date.parse(`${m[1]}T${m[2]}:00:00Z`);
        ageHours = Math.round((Date.now() - runMs) / 36e5);
        stale = ageHours > 36;
      } else {
        stale = false;
      }
    }
    return { model, lastRun, runs: runs.slice(0, 4), ageHours, stale };
  } catch {
    return { model, lastRun: null, runs: [], ageHours: null, stale: true };
  }
}
__name(modelRuns, "modelRuns");
async function cptecStatus() {
  const hit = statusCache.get("cptec-status");
  if (hit) return hit.value;
  const models = await Promise.all(MODELS.map(modelRuns));
  const status = {
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
    models,
    numericIngestible: ["wrf", "eta", "merge", "bam"],
    notes: "MONAN/BRAMS: s\xF3 PNG/meteograma p\xFAblicos em 2026-09-30; sem GRIB no FTP. WRF prec hor\xE1rio e MERGE di\xE1rio/hor\xE1rio com GRIB2 acess\xEDvel. Eta 40km GRIB1 acess\xEDvel. BAM 100\u2013500MB."
  };
  statusCache.set("cptec-status", status);
  return status;
}
__name(cptecStatus, "cptecStatus");

// packages/providers/src/alerts.ts
var MIRROR = "https://radarmeteorologico.com.br/api/v1/alertas";
var alertsCache = new MemoryCache(10 * 60 * 1e3, 60 * 60 * 1e3);
function alertsCacheStats() {
  return alertsCache.stats;
}
__name(alertsCacheStats, "alertsCacheStats");
async function alertsForUf(uf) {
  const key = `alerts:${uf.toUpperCase()}`;
  const hit = alertsCache.get(key);
  if (hit) return { alerts: hit.value, stale: !hit.fresh };
  try {
    const data = await fetchJson(`${MIRROR}?uf=${encodeURIComponent(uf.toUpperCase())}`, {
      timeoutMs: 6e3,
      retries: 1
    });
    const alerts = (data.alertas ?? []).map((a) => ({
      id: `inmet-${a.id}`,
      source: "INMET (via mirror radarmeteorologico.com.br)",
      event: a.evento,
      severity: a.severidade,
      level: typeof a.nivel === "number" ? a.nivel : null,
      headline: `${a.evento} \u2014 ${a.severidade}`,
      startsAt: a.inicio ?? null,
      endsAt: a.fim ?? null
    }));
    alertsCache.set(key, alerts);
    return { alerts, stale: false };
  } catch {
    const staleVal = alertsCache.getStale(key);
    return { alerts: staleVal ?? [], stale: true };
  }
}
__name(alertsForUf, "alertsForUf");

// packages/providers/src/engine.ts
function completenessOf(w) {
  const checks = [
    ["temperature", w.temperature],
    ["humidity", w.humidity],
    ["precipitation.amount", w.precipitation.amount],
    ["wind.speed", w.wind.speed],
    ["visibility", w.visibility],
    ["condition", w.condition]
  ];
  const missing = checks.filter(([, v]) => v === null || v === void 0).map(([k]) => k);
  return { missing, completeness: Math.round((checks.length - missing.length) / checks.length * 100) / 100 };
}
__name(completenessOf, "completenessOf");
function validate(q) {
  if (!Number.isFinite(q.latitude) || q.latitude < -90 || q.latitude > 90) throw new Error(`latitude inv\xE1lida: ${q.latitude}`);
  if (!Number.isFinite(q.longitude) || q.longitude < -180 || q.longitude > 180) throw new Error(`longitude inv\xE1lida: ${q.longitude}`);
  if (!Number.isFinite(Date.parse(q.timestamp))) throw new Error(`timestamp inv\xE1lido: ${q.timestamp}`);
}
__name(validate, "validate");
function degraded(q, chain, reason) {
  return {
    point: { latitude: q.latitude, longitude: q.longitude, label: q.label ?? null },
    requestedTime: q.timestamp,
    forecastTime: null,
    kind: "forecast",
    temperature: null,
    feelsLike: null,
    humidity: null,
    pressureHpa: null,
    precipitation: { probability: null, amount: null, intensity: null },
    wind: { speed: null, gust: null, direction: null },
    visibility: null,
    cloudCover: null,
    condition: null,
    conditionCode: null,
    hazard: { level: "unknown", reasons: [reason, "dados incompletos \u2014 aus\xEAncia de dados n\xE3o significa condi\xE7\xE3o segura"], completeness: 0, dataGap: true },
    source: {
      institution: null,
      provider: "none",
      model: null,
      run: null,
      generatedAt: null,
      ingestedAt: (/* @__PURE__ */ new Date()).toISOString(),
      fallback: true,
      fallbackChain: chain,
      interpolation: null,
      resolutionKm: null
    },
    quality: { missingFields: ["all"], ageMinutes: null, stationDistanceKm: null, completeness: 0 },
    nearbyObservation: null,
    alerts: []
  };
}
__name(degraded, "degraded");
async function weather(q) {
  validate(q);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const chain = ["open-meteo"];
  const [meteo, obs, alerts] = await Promise.all([
    openmeteoPoint(q.latitude, q.longitude, q.timestamp).catch(() => null),
    q.ibge ? inmetNearbyObservation(q.ibge, q.latitude, q.longitude, nowIso).catch(() => null) : Promise.resolve(null),
    q.uf ? alertsForUf(q.uf).catch(() => ({ alerts: [], stale: true })) : Promise.resolve({ alerts: [], stale: true })
  ]);
  if (meteo) {
    const w = {
      point: { latitude: q.latitude, longitude: q.longitude, label: q.label ?? null },
      requestedTime: q.timestamp,
      forecastTime: meteo.forecastTime,
      kind: "forecast",
      temperature: meteo.temperature,
      feelsLike: null,
      humidity: meteo.humidity,
      pressureHpa: null,
      precipitation: { probability: meteo.precipProb, amount: meteo.precipAmount, intensity: null },
      wind: { speed: meteo.windSpeed, gust: meteo.windGust, direction: meteo.windDir },
      visibility: meteo.visibility,
      cloudCover: meteo.cloudCover,
      condition: meteo.condition === "unknown" ? "unknown" : meteo.condition,
      conditionCode: meteo.conditionCode,
      hazard: null,
      source: {
        institution: "Open-Meteo (blend ICON/GFS/ECMWF)",
        provider: "open-meteo",
        model: "best_match",
        run: null,
        generatedAt: null,
        ingestedAt: nowIso,
        fallback: false,
        fallbackChain: chain,
        interpolation: "nearest-hour",
        resolutionKm: 9
      },
      quality: { missingFields: [], ageMinutes: null, stationDistanceKm: null, completeness: 1 },
      nearbyObservation: obs?.obs ?? null,
      alerts: alerts.alerts
    };
    const { missing, completeness } = completenessOf(w);
    const quality = {
      missingFields: missing,
      ageMinutes: null,
      stationDistanceKm: obs?.obs.distanceKm ?? null,
      completeness
    };
    w.quality = quality;
    w.hazard = assessHazard(w);
    return w;
  }
  if (q.ibge) {
    chain.push("inmet");
    const fc = await inmetForecast(q.ibge).catch(() => null);
    if (fc && fc.length > 0) {
      const block = fc[0];
      const temp = block.tempMax ?? block.tempMin;
      const w = {
        point: { latitude: q.latitude, longitude: q.longitude, label: q.label ?? null },
        requestedTime: q.timestamp,
        forecastTime: floorHour(q.timestamp),
        kind: "forecast",
        temperature: temp,
        feelsLike: null,
        humidity: null,
        pressureHpa: null,
        precipitation: { probability: null, amount: null, intensity: null },
        wind: { speed: null, gust: null, direction: null },
        visibility: null,
        cloudCover: null,
        condition: block.condition,
        conditionCode: block.resumo ? `inmet:${block.resumo}` : null,
        hazard: null,
        source: {
          institution: "INMET",
          provider: "inmet",
          model: "prevmet-municipal",
          run: null,
          generatedAt: null,
          ingestedAt: nowIso,
          fallback: true,
          fallbackChain: chain,
          interpolation: "nearest-shift",
          resolutionKm: null
        },
        quality: { missingFields: [], ageMinutes: null, stationDistanceKm: null, completeness: 0 },
        nearbyObservation: obs?.obs ?? null,
        alerts: alerts.alerts
      };
      const { missing, completeness } = completenessOf(w);
      w.quality = { missingFields: missing, ageMinutes: null, stationDistanceKm: obs?.obs.distanceKm ?? null, completeness };
      w.hazard = assessHazard(w);
      return w;
    }
  }
  return degraded(q, [...chain, "inmet"], "todos os providers falharam");
}
__name(weather, "weather");
async function weatherBatch(queries, concurrency = 6) {
  const out = new Array(queries.length);
  let i = 0;
  async function worker() {
    while (i < queries.length) {
      const idx = i++;
      const q = queries[idx];
      try {
        out[idx] = await weather(q);
      } catch (e) {
        out[idx] = degraded(q, ["open-meteo", "inmet"], e instanceof Error ? e.message : "erro desconhecido");
      }
    }
  }
  __name(worker, "worker");
  await Promise.all(Array.from({ length: Math.min(concurrency, queries.length) }, worker));
  return out;
}
__name(weatherBatch, "weatherBatch");

// packages/routing/src/geocode.ts
var UF_BY_ADMIN1 = {
  "acre": "AC",
  "alagoas": "AL",
  "amap\xE1": "AP",
  "amapa": "AP",
  "amazonas": "AM",
  "bahia": "BA",
  "cear\xE1": "CE",
  "ceara": "CE",
  "distrito federal": "DF",
  "esp\xEDrito santo": "ES",
  "espirito santo": "ES",
  "goi\xE1s": "GO",
  "goias": "GO",
  "maranh\xE3o": "MA",
  "maranhao": "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  "par\xE1": "PA",
  "para": "PA",
  "para\xEDba": "PB",
  "paraiba": "PB",
  "paran\xE1": "PR",
  "parana": "PR",
  "pernambuco": "PE",
  "piau\xED": "PI",
  "piaui": "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  "rond\xF4nia": "RO",
  "rondonia": "RO",
  "roraima": "RR",
  "santa catarina": "SC",
  "s\xE3o paulo": "SP",
  "sao paulo": "SP",
  "sergipe": "SE",
  "tocantins": "TO"
};
var norm2 = /* @__PURE__ */ __name((s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(), "norm");
var cache2 = new MemoryCache(30 * 24 * 3600 * 1e3);
async function getJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "ViaTempo/1.0 (contato: viatempo)", Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}
__name(getJson, "getJson");
async function geocode(text) {
  const key = `geo:${norm2(text)}`;
  const hit = cache2.get(key);
  if (hit) return hit.value;
  try {
    const data2 = await getJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=1&language=pt&format=json`,
      7e3
    );
    const r = data2.results?.[0];
    if (r) {
      const uf = r.admin1 ? UF_BY_ADMIN1[norm2(r.admin1)] ?? null : null;
      const out2 = {
        latitude: r.latitude,
        longitude: r.longitude,
        label: r.country && !/brasil/i.test(r.country) ? `${r.name} (${r.country})` : text,
        city: r.name ?? null,
        uf,
        timezone: r.timezone ?? null,
        source: "open-meteo-geocoding"
      };
      cache2.set(key, out2);
      return out2;
    }
  } catch {
  }
  try {
    const data2 = await getJson(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
      8e3
    );
    const r = data2?.[0];
    if (r) {
      const out2 = {
        latitude: Number(r.lat),
        longitude: Number(r.lon),
        label: text,
        city: text.split(",")[0].trim(),
        uf: null,
        timezone: null,
        source: "nominatim"
      };
      cache2.set(key, out2);
      return out2;
    }
  } catch {
  }
  const data = await getJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=1`, 8e3);
  const f = data.features?.[0];
  if (!f?.geometry?.coordinates) throw new Error(`geocoding falhou para: ${text}`);
  const out = {
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    label: text,
    city: f.properties?.name ?? text.split(",")[0].trim(),
    uf: null,
    timezone: null,
    source: "photon"
  };
  cache2.set(key, out);
  return out;
}
__name(geocode, "geocode");

// packages/routing/src/trip.ts
var cache3 = new MemoryCache(24 * 3600 * 1e3);
async function getJson2(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "ViaTempo/1.0 (contato: viatempo)", Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}
__name(getJson2, "getJson");
async function route(from, to) {
  const key = `route:${from.latitude.toFixed(3)},${from.longitude.toFixed(3)}:${to.latitude.toFixed(3)},${to.longitude.toFixed(3)}`;
  const hit = cache3.get(key);
  if (hit) return hit.value;
  const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
  const data = await getJson2(url, 12e3);
  if (data.code !== "Ok" || !data.routes?.[0]) throw new Error(`roteamento falhou (code=${data.code})`);
  const r = data.routes[0];
  const coords = r.geometry?.coordinates ?? [];
  let bbox = null;
  if (coords.length > 0) {
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const [lo, la] of coords) {
      if (lo < minLon) minLon = lo;
      if (la < minLat) minLat = la;
      if (lo > maxLon) maxLon = lo;
      if (la > maxLat) maxLat = la;
    }
    bbox = [minLon, minLat, maxLon, maxLat];
  }
  const out = { distanceM: r.distance, durationS: r.duration, coordinates: coords, bbox, source: "osrm-demo" };
  cache3.set(key, out);
  return out;
}
__name(route, "route");
function sampleTimedPoints(coordsLonLat, departureIso, durationS, maxPoints = 8) {
  if (coordsLonLat.length === 0) throw new Error("geometria vazia");
  const t0 = Date.parse(departureIso);
  if (!Number.isFinite(t0)) throw new Error(`departure inv\xE1lido: ${departureIso}`);
  const cum = [0];
  for (let i = 1; i < coordsLonLat.length; i++) {
    const [lo0, la0] = coordsLonLat[i - 1];
    const [lo1, la1] = coordsLonLat[i];
    cum.push(cum[i - 1] + haversineKm(la0, lo0, la1, lo1));
  }
  const total = cum[cum.length - 1] || 1e-3;
  const n = Math.max(2, Math.min(maxPoints, 12));
  const out = [];
  for (let k = 0; k < n; k++) {
    const frac = k / (n - 1);
    const targetKm = frac * total;
    let idx = cum.findIndex((c) => c >= targetKm);
    if (idx < 0) idx = cum.length - 1;
    const [lon, lat] = coordsLonLat[idx];
    const eta = new Date(t0 + frac * durationS * 1e3).toISOString();
    out.push({
      latitude: Math.round(lat * 1e5) / 1e5,
      longitude: Math.round(lon * 1e5) / 1e5,
      eta,
      distanceFromStartKm: Math.round(targetKm * 10) / 10,
      label: k === 0 ? "origem" : k === n - 1 ? "destino" : `km ${Math.round(targetKm)}`
    });
  }
  return out;
}
__name(sampleTimedPoints, "sampleTimedPoints");

// worker/src/index.ts
var CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS }
  });
}
__name(json, "json");
async function tripForecast(body) {
  const { origin, destination, departure } = body;
  const maxPoints = Math.max(2, Math.min(body.maxPoints ?? 8, 12));
  if (!origin || typeof origin !== "string" || origin.trim().length < 2)
    return json({ ok: false, error: "origin inv\xE1lida" }, 400);
  if (!destination || typeof destination !== "string" || destination.trim().length < 2)
    return json({ ok: false, error: "destination inv\xE1lida" }, 400);
  if (!departure || !Number.isFinite(Date.parse(departure)))
    return json({ ok: false, error: `departure inv\xE1lido: ${departure}` }, 400);
  try {
    const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
    const [ibgeO, ibgeD] = await Promise.all([
      o.city && o.uf ? resolveIbge(o.city, o.uf) : Promise.resolve(null),
      d.city && d.uf ? resolveIbge(d.city, d.uf) : Promise.resolve(null)
    ]);
    const r = await route(
      { latitude: o.latitude, longitude: o.longitude },
      { latitude: d.latitude, longitude: d.longitude }
    );
    const timed = sampleTimedPoints(r.coordinates, departure, r.durationS, maxPoints);
    const uf = o.uf ?? d.uf ?? void 0;
    const items = await weatherBatch(
      timed.map((t, i) => ({
        latitude: t.latitude,
        longitude: t.longitude,
        timestamp: t.eta,
        label: (i === 0 ? o.label : i === timed.length - 1 ? d.label : t.label) ?? void 0,
        ibge: i === 0 ? ibgeO ?? void 0 : i === timed.length - 1 ? ibgeD ?? void 0 : void 0,
        uf
      }))
    );
    const timeline = timed.map((t, i) => ({ ...t, weather: items[i] }));
    const order = ["none", "attention", "alert", "severe"];
    let worst = 0;
    for (const it of items) {
      const idx = order.indexOf(it.hazard?.level ?? "none");
      worst = Math.max(worst, idx < 0 ? 0 : idx);
    }
    const alertMap = /* @__PURE__ */ new Map();
    for (const it of items) for (const a of it.alerts) alertMap.set(a.id, a);
    return json({
      ok: true,
      summary: {
        origin: { ...o, ibge: ibgeO },
        destination: { ...d, ibge: ibgeD },
        departure,
        arrival: timed[timed.length - 1].eta,
        distanceKm: Math.round(r.distanceM / 1e3 * 10) / 10,
        durationH: Math.round(r.durationS / 3600 * 100) / 100,
        worstHazard: order[worst],
        fallbackUsed: items.some((w) => w.source.fallback)
      },
      route: { distanceM: r.distanceM, durationS: r.durationS, bbox: r.bbox, source: r.source },
      timeline,
      alerts: [...alertMap.values()],
      sources: items.map((w) => w.source)
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 502);
  }
}
__name(tripForecast, "tripForecast");
var src_default = {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/api/health") return json({ ok: true, version: "0.1.0", edge: true });
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
            cptec: cptecCacheStats()
          }
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
            ibge: url.searchParams.get("ibge") ?? void 0,
            uf: url.searchParams.get("uf") ?? void 0
          })
        });
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
      }
    }
    if (url.pathname === "/api/weather/batch" && request.method === "POST") {
      try {
        const body = await request.json();
        if (!body.points || !Array.isArray(body.points) || body.points.length < 1 || body.points.length > 50)
          return json({ ok: false, error: "points deve ter 1\u201350 itens" }, 400);
        const out = await weatherBatch(body.points);
        return json({ ok: true, count: out.length, items: out });
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 400);
      }
    }
    if (url.pathname === "/api/trips/forecast" && request.method === "POST") {
      try {
        return await tripForecast(await request.json());
      } catch {
        return json({ ok: false, error: "JSON inv\xE1lido" }, 400);
      }
    }
    return json({ ok: false, error: "not_found" }, 404);
  }
};

// ../../Users/Ricardo PC/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../Users/Ricardo PC/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-N30oQS/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../Users/Ricardo PC/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-N30oQS/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
