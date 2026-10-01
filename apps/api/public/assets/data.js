/* ============================================================================
   ViaTempo — camada de dados do protótipo
   ----------------------------------------------------------------------------
   Reproduz o contrato real de POST /api/trips/forecast a partir das respostas
   capturadas em examples/*.json e de um motor determinístico de síntese para
   pares origem/destino fora da amostra real.

   Estrutura de resposta (idêntica à API):
   { ok, summary, route, timeline[], alerts[], sources[] }
   Campos ausentes são null. Nada é inventado como se fosse medição real.
   ========================================================================== */
(function () {
  "use strict";
  var VT = (window.VT = window.VT || {});

  /* ------------------------------------------------------------------ */
  /* Cidades (coordenadas aproximadas; Ijuí e Porto Alegre exatas)       */
  /* flags: island = sem rota rodoviária · sparse = rede meteorológica    */
  /* esparsa (gera pontos degradados honestos)                            */
  /* ------------------------------------------------------------------ */
  var CITIES = [
    // Rio Grande do Sul
    { name: "Ijuí", uf: "RS", lat: -28.38778, lon: -53.91472, ibge: "4310207" },
    { name: "Porto Alegre", uf: "RS", lat: -30.03283, lon: -51.23019, ibge: "4314902" },
    { name: "Cruz Alta", uf: "RS", lat: -28.6386, lon: -53.6063 },
    { name: "Soledade", uf: "RS", lat: -28.8186, lon: -52.51 },
    { name: "Santa Maria", uf: "RS", lat: -29.6842, lon: -53.8069, ibge: "4316907" },
    { name: "Passo Fundo", uf: "RS", lat: -28.262, lon: -52.4091, ibge: "4314100" },
    { name: "Caxias do Sul", uf: "RS", lat: -29.1682, lon: -51.1796, ibge: "4305108" },
    { name: "Pelotas", uf: "RS", lat: -31.7654, lon: -52.3376, ibge: "4314407" },
    { name: "Santa Cruz do Sul", uf: "RS", lat: -29.7184, lon: -52.4257, ibge: "4316808" },
    { name: "Bagé", uf: "RS", lat: -31.3311, lon: -54.1069, ibge: "4301602" },
    { name: "Uruguaiana", uf: "RS", lat: -29.7614, lon: -57.0853, ibge: "4321204" },
    { name: "Lajeado", uf: "RS", lat: -29.4669, lon: -51.9611, ibge: "4311403" },
    { name: "Novo Hamburgo", uf: "RS", lat: -29.6783, lon: -51.1306, ibge: "4313409" },
    { name: "Cachoeira do Sul", uf: "RS", lat: -30.0398, lon: -52.8939 },
    { name: "Santiago", uf: "RS", lat: -29.1917, lon: -54.8667 },
    { name: "Santo Ângelo", uf: "RS", lat: -28.2994, lon: -54.2631 },
    { name: "Erechim", uf: "RS", lat: -27.6339, lon: -52.2739 },
    { name: "Bento Gonçalves", uf: "RS", lat: -29.1662, lon: -51.5165 },
    { name: "Gramado", uf: "RS", lat: -29.3788, lon: -50.873 },
    { name: "Torres", uf: "RS", lat: -29.3352, lon: -49.7269 },
    { name: "Rio Grande", uf: "RS", lat: -32.035, lon: -52.0986 },
    // Sul
    { name: "Florianópolis", uf: "SC", lat: -27.5954, lon: -48.548, ibge: "4205407" },
    { name: "Joinville", uf: "SC", lat: -26.3045, lon: -48.8487 },
    { name: "Chapecó", uf: "SC", lat: -27.1004, lon: -52.6152 },
    { name: "Criciúma", uf: "SC", lat: -28.6775, lon: -49.3697 },
    { name: "Curitiba", uf: "PR", lat: -25.4284, lon: -49.2733, ibge: "4106902" },
    { name: "Londrina", uf: "PR", lat: -23.3045, lon: -51.1696 },
    { name: "Maringá", uf: "PR", lat: -23.4205, lon: -51.9331 },
    { name: "Foz do Iguaçu", uf: "PR", lat: -25.5163, lon: -54.5854 },
    { name: "Cascavel", uf: "PR", lat: -24.9555, lon: -53.4552 },
    // Sudeste
    { name: "São Paulo", uf: "SP", lat: -23.5505, lon: -46.6333, ibge: "3550308" },
    { name: "Campinas", uf: "SP", lat: -22.9099, lon: -47.0626 },
    { name: "Santos", uf: "SP", lat: -23.9608, lon: -46.3336 },
    { name: "Ribeirão Preto", uf: "SP", lat: -21.1704, lon: -47.8103 },
    { name: "São José dos Campos", uf: "SP", lat: -23.2237, lon: -45.9009 },
    { name: "Ilhabela", uf: "SP", lat: -23.7781, lon: -45.3581, island: true },
    { name: "Rio de Janeiro", uf: "RJ", lat: -22.9068, lon: -43.1729, ibge: "3304557" },
    { name: "Niterói", uf: "RJ", lat: -22.8832, lon: -43.1034 },
    { name: "Petrópolis", uf: "RJ", lat: -22.5111, lon: -43.1774 },
    { name: "Belo Horizonte", uf: "MG", lat: -19.9167, lon: -43.9345, ibge: "3106200" },
    { name: "Uberlândia", uf: "MG", lat: -18.9186, lon: -48.2772 },
    { name: "Juiz de Fora", uf: "MG", lat: -21.7642, lon: -43.3503 },
    { name: "Vitória", uf: "ES", lat: -20.3155, lon: -40.3128 },
    // Centro-Oeste
    { name: "Brasília", uf: "DF", lat: -15.7939, lon: -47.8828, ibge: "5300108" },
    { name: "Goiânia", uf: "GO", lat: -16.6869, lon: -49.2648 },
    { name: "Cuiabá", uf: "MT", lat: -15.6014, lon: -56.0979 },
    { name: "Campo Grande", uf: "MS", lat: -20.4697, lon: -54.6201 },
    { name: "Dourados", uf: "MS", lat: -22.2211, lon: -54.8056 },
    // Nordeste
    { name: "Salvador", uf: "BA", lat: -12.9777, lon: -38.5016, ibge: "2927408" },
    { name: "Feira de Santana", uf: "BA", lat: -12.2664, lon: -38.9663 },
    { name: "Recife", uf: "PE", lat: -8.0476, lon: -34.877 },
    { name: "Fernando de Noronha", uf: "PE", lat: -3.8447, lon: -32.4107, island: true },
    { name: "Fortaleza", uf: "CE", lat: -3.7319, lon: -38.5267 },
    { name: "Natal", uf: "RN", lat: -5.7945, lon: -35.211 },
    { name: "João Pessoa", uf: "PB", lat: -7.1195, lon: -34.845 },
    { name: "Maceió", uf: "AL", lat: -9.6658, lon: -35.735 },
    { name: "Aracaju", uf: "SE", lat: -10.9091, lon: -37.0677 },
    { name: "Teresina", uf: "PI", lat: -5.0892, lon: -42.8016 },
    { name: "São Luís", uf: "MA", lat: -2.5297, lon: -44.3028 },
    // Norte
    { name: "Belém", uf: "PA", lat: -1.4558, lon: -48.4902 },
    { name: "Palmas", uf: "TO", lat: -10.1689, lon: -48.3317 },
    { name: "Manaus", uf: "AM", lat: -3.119, lon: -60.0217, sparse: true },
    { name: "Porto Velho", uf: "RO", lat: -8.7608, lon: -63.8999, sparse: true },
    { name: "Rio Branco", uf: "AC", lat: -9.9754, lon: -67.8249, sparse: true },
    { name: "Boa Vista", uf: "RR", lat: 2.8235, lon: -60.6758, sparse: true },
    { name: "Macapá", uf: "AP", lat: 0.0349, lon: -51.0694, sparse: true }
  ];

  /* ------------------------------------------------------------------ */
  /* Amostra real capturada — examples/trip-ijui-poa.json (30/09/2026)   */
  /* ------------------------------------------------------------------ */
  var REAL_TRIP = {
    real: true,
    capturedAt: "2026-09-30T19:43:58Z",
    summary: {
      origin: { latitude: -28.38778, longitude: -53.91472, label: "Ijui, RS", city: "Ijuí", uf: "RS", timezone: "America/Sao_Paulo", source: "open-meteo-geocoding", ibge: "4310207" },
      destination: { latitude: -30.03283, longitude: -51.23019, label: "Porto Alegre, RS", city: "Porto Alegre", uf: "RS", timezone: "America/Sao_Paulo", source: "open-meteo-geocoding", ibge: "4314902" },
      departure: "2026-10-01T14:30:00-03:00",
      arrival: "2026-10-01T23:14:24.800Z",
      distanceKm: 408.7,
      durationH: 5.74,
      worstHazard: "attention",
      fallbackUsed: false
    },
    route: { distanceM: 408744.1, durationS: 20664.8, bbox: [-53.914591, -30.033746, -51.199252, -28.303025], source: "osrm-demo" },
    points: [
      { lat: -28.38778, lon: -53.91459, km: 0, label: "origem", temp: 21.7, hum: 55, precip: [0, 0], wind: [17.8, 39.6, 210], vis: 37800, cloud: 24, condition: "clear", obs: { stationCode: "B843", stationName: "AJURICABA", distanceKm: 30, ageMinutes: 44, temperatureC: 23.3, windSpeedKmh: 12.2, windGustKmh: 27.7, humidityPct: 69, precipitationMm: 0 } },
      { lat: -28.38294, lon: -53.3574, km: 58.4, label: "km 58", temp: 20.5, hum: 58, precip: [0, 0], wind: [18.6, 35.6, 211], vis: 37600, cloud: 67, condition: "partly_cloudy", obs: null },
      { lat: -28.32153, lon: -52.83596, km: 116.8, label: "km 117", temp: 19.5, hum: 59, precip: [0, 0], wind: [19.2, 35.6, 204], vis: 37360, cloud: 76, condition: "partly_cloudy", obs: null },
      { lat: -28.68108, lon: -52.59873, km: 175.2, label: "km 175", temp: 18.4, hum: 55, precip: [0, 0], wind: [14.1, 35.6, 231], vis: 38180, cloud: 89, condition: "overcast", obs: null },
      { lat: -29.07583, lon: -52.27798, km: 233.6, label: "km 234", temp: 15.2, hum: 61, precip: [0, 0], wind: [12.1, 27.4, 192], vis: 35860, cloud: 93, condition: "overcast", obs: null },
      { lat: -29.44045, lon: -51.99074, km: 292.1, label: "km 292", temp: 16.9, hum: 65, precip: [0, 0], wind: [6.9, 26.3, 221], vis: 35820, cloud: 16, condition: "clear", obs: null },
      { lat: -29.7703, lon: -51.57685, km: 350.5, label: "km 350", temp: 16.9, hum: 64, precip: [9, 0], wind: [8.8, 20.5, 266], vis: 35820, cloud: 62, condition: "partly_cloudy", obs: null },
      { lat: -30.0328, lon: -51.23064, km: 408.9, label: "destino", temp: 13.9, hum: 90, precip: [25, 0], wind: [10.6, 21.2, 130], vis: 20640, cloud: 62, condition: "partly_cloudy", obs: { stationCode: "A801", stationName: "PORTO ALEGRE - JARDIM BOTÂNICO", distanceKm: 5.9, ageMinutes: 44, temperatureC: 16.2, windSpeedKmh: 7.9, windGustKmh: 17.6, humidityPct: 87, precipitationMm: 0 } }
    ],
    alerts: [
      { id: "inmet-55879", source: "INMET (via mirror radarmeteorologico.com.br)", event: "Tempestade", severity: "Perigo Potencial", level: 1, headline: "Tempestade — Perigo Potencial", startsAt: "2026-09-30 00:01", endsAt: "2026-09-30 23:59" },
      { id: "inmet-55894", source: "INMET (via mirror radarmeteorologico.com.br)", event: "Tempestade", severity: "Perigo Potencial", level: 1, headline: "Tempestade — Perigo Potencial", startsAt: "2026-10-04 00:00", endsAt: "2026-10-04 23:59" }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  function deaccent(s) {
    return String(s == null ? "" : s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function round1(n) { return Math.round(n * 10) / 10; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function haversineKm(a, b, c, d) {
    var R = 6371, toRad = Math.PI / 180;
    var dLat = (c - a) * toRad, dLon = (d - b) * toRad;
    var la1 = a * toRad, la2 = c * toRad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function valueNoise1(x, seed) {
    var i = Math.floor(x), f = x - i;
    var a = mulberry32(hashStr(seed + ":" + i))();
    var b = mulberry32(hashStr(seed + ":" + (i + 1)))();
    return a + (b - a) * smooth(f);
  }

  /* Converte timestamp ISO em hora local America/Sao_Paulo (UTC-3). */
  function localParts(iso) {
    var ms = Date.parse(iso) - 3 * 3600 * 1000;
    var d = new Date(ms);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), day: Math.floor(ms / 86400000) };
  }

  /* ------------------------------------------------------------------ */
  /* Hazard — porta fiel de packages/weather-domain/src/hazard.ts        */
  /* ------------------------------------------------------------------ */
  var TH = { rainAttentionMm: 2.5, rainAlertMm: 10, rainSevereMm: 25, gustAttentionKmh: 50, gustAlertKmh: 65, gustSevereKmh: 80, windAttentionKmh: 40, windAlertKmh: 55, visibilityAlertM: 1000, visibilitySevereM: 300 };
  function fmtKmh(v) { return Math.round(v) + " km/h"; }
  function assessHazard(w) {
    var reasons = [], score = 0;
    var p = w.precipitation || {}, wind = w.wind || {};
    var amt = p.amount, prob = p.probability, gust = wind.gust, speed = wind.speed, vis = w.visibility;
    var criticalMissing = [];
    if (amt === null || amt === undefined) criticalMissing.push("precipitation.amount");
    if ((gust === null || gust === undefined) && (speed === null || speed === undefined)) criticalMissing.push("wind");
    if (vis === null || vis === undefined) criticalMissing.push("visibility");

    if (amt !== null && amt !== undefined) {
      if (amt >= TH.rainSevereMm) { score = Math.max(score, 3); reasons.push("chuva intensa prevista (" + amt + " mm/h)"); }
      else if (amt >= TH.rainAlertMm) { score = Math.max(score, 2); reasons.push("chuva forte prevista (" + amt + " mm/h)"); }
      else if (amt >= TH.rainAttentionMm) { score = Math.max(score, 1); reasons.push("chuva moderada prevista (" + amt + " mm/h)"); }
      else if (amt > 0) { reasons.push("chuva fraca prevista (" + amt + " mm/h)"); }
    }
    if (typeof prob === "number" && amt !== null && amt > 0) {
      if (prob >= 70 && amt >= TH.rainAttentionMm) { reasons.push("probabilidade alta (" + prob + "%)"); score = Math.max(score, Math.min(3, score + 1)); }
    }
    var g = (gust === null || gust === undefined) ? speed : gust;
    if (g !== null && g !== undefined) {
      if (g >= TH.gustSevereKmh) { score = Math.max(score, 3); reasons.push("rajadas de " + fmtKmh(g)); }
      else if (g >= TH.gustAlertKmh) { score = Math.max(score, 2); reasons.push("rajadas de " + fmtKmh(g)); }
      else if (g >= TH.gustAttentionKmh) { score = Math.max(score, 1); reasons.push("rajadas de " + fmtKmh(g)); }
    }
    if (vis !== null && vis !== undefined) {
      if (vis < TH.visibilitySevereM) { score = Math.max(score, 3); reasons.push("visibilidade muito baixa (" + vis + " m)"); }
      else if (vis < TH.visibilityAlertM) { score = Math.max(score, 2); reasons.push("visibilidade baixa (" + vis + " m)"); }
    }
    if (w.condition === "storm") { score = Math.max(score, 3); reasons.push("tempestade prevista"); }
    else if (w.condition === "heavy_rain") { score = Math.max(score, 2); if (!reasons.some(function (r) { return r.indexOf("chuva") >= 0; })) reasons.push("chuva intensa prevista"); }
    else if (w.condition === "fog") { score = Math.max(score, 2); reasons.push("nevoeiro previsto"); }

    var alerts = w.alerts || [];
    for (var i = 0; i < alerts.length; i++) {
      var a = alerts[i], sev = deaccent(a.severity), lvl = a.level || 0;
      if (/grande perigo|perigo iminente|extremo|severo|vermelho/.test(sev) || lvl >= 3) { score = Math.max(score, 3); reasons.push("alerta oficial: " + a.event); }
      else if (/potencial|amarelo/.test(sev) || lvl <= 1) { score = Math.max(score, 1); reasons.push("alerta oficial: " + a.event); }
      else if (/perigo|laranja/.test(sev) || lvl === 2) { score = Math.max(score, 2); reasons.push("alerta oficial: " + a.event); }
      else if (a.event) { score = Math.max(score, 1); reasons.push("alerta oficial: " + a.event); }
    }
    var completeness = criticalMissing.length === 0 ? 1 : criticalMissing.length === 1 ? 0.66 : 0.33;
    var dataGap = criticalMissing.length >= 2;
    var level = score === 0 ? "none" : score === 1 ? "attention" : score === 2 ? "alert" : "severe";
    if (dataGap && level === "none") level = "unknown";
    if (dataGap && reasons.length === 0) reasons.push("dados incompletos — ausência de dados não significa condição segura");
    return { level: level, reasons: reasons, completeness: completeness, dataGap: dataGap };
  }

  /* ------------------------------------------------------------------ */
  /* Fábrica de clima normalizado (síntese determinística)               */
  /* ------------------------------------------------------------------ */
  var WMO = { clear: "wmo-0", partly_cloudy: "wmo-2", overcast: "wmo-3", fog: "wmo-45", drizzle: "wmo-51", rain: "wmo-61", heavy_rain: "wmo-65", storm: "wmo-95", snow: "wmo-71", unknown: null };
  var VIS = { clear: 40000, partly_cloudy: 36000, overcast: 32000, fog: 600, drizzle: 22000, rain: 12000, heavy_rain: 7000, storm: 5000, snow: 4000, unknown: null };
  var CLOUD = { clear: 10, partly_cloudy: 55, overcast: 90, fog: 80, drizzle: 75, rain: 88, heavy_rain: 95, storm: 100, snow: 90, unknown: null };

  function conditionFrom(likelihood, cloudNoise) {
    if (likelihood > 0.88) return "storm";
    if (likelihood > 0.70) return "heavy_rain";
    if (likelihood > 0.48) return "rain";
    if (likelihood > 0.34) return "drizzle";
    if (cloudNoise > 0.72) return "overcast";
    if (cloudNoise > 0.42) return "partly_cloudy";
    if (cloudNoise > 0.12) return "clear";
    return "clear";
  }

  function makeWeather(ctx, opts) {
    var lat = ctx.lat, lon = ctx.lon, etaIso = ctx.etaIso, frac = ctx.frac, sysSeed = ctx.sysSeed, pointSeed = ctx.pointSeed;
    var sparse = !!(opts && opts.sparse);
    var alerts = (opts && opts.alerts) || [];

    var front = valueNoise1(frac * 3 + 2, sysSeed);
    var inst = valueNoise1(frac * 13 + 7, pointSeed);
    var cloudNoise = valueNoise1(frac * 5 + 11, sysSeed + "-c");
    var reportable = sparse && (frac > 0.15 && frac < 0.9) && (Math.floor(inst * 100) % 3 === 0);

    var likelihood = clamp(front * 0.95 + inst * 0.35 - 0.5, 0, 1);
    var condition = conditionFrom(likelihood, cloudNoise);
    var lp = localParts(etaIso);
    var night = (lp.h < 7 || lp.h >= 20);
    var temp = round1(25 - (Math.abs(lat) - 20) * 0.62 - likelihood * 3.4 - (night ? 3.5 : 0) + (inst - 0.5) * 2.2);
    var humidity = Math.round(clamp(50 + likelihood * 42 + (inst - 0.5) * 14, 20, 99));
    var windSpeed = round1(8 + front * 17 + inst * 6);
    var windGust = round1(windSpeed * 1.55 + inst * 9);
    var windDir = Math.round((((lon + 360) % 360) + 180) % 360);
    var amount = likelihood > 0.34 ? round1((likelihood - 0.34) * 22) : 0;
    var probability = Math.round(clamp(likelihood * 100, 0, 95));

    var weather = {
      point: { latitude: lat, longitude: lon, label: ctx.label || null },
      requestedTime: etaIso,
      forecastTime: new Date(Math.floor((Date.parse(etaIso) - 3 * 3600 * 1000) / 3600000) * 3600000 + 3 * 3600 * 1000).toISOString(),
      kind: "forecast",
      temperature: temp,
      feelsLike: null,
      humidity: humidity,
      pressureHpa: null,
      precipitation: { probability: amount > 0 ? probability : Math.min(probability, 20), amount: amount, intensity: amount > 0 ? amount : null },
      wind: { speed: windSpeed, gust: windGust, direction: windDir },
      visibility: VIS[condition] === null ? null : Math.round(VIS[condition] * (0.92 + inst * 0.14)),
      cloudCover: CLOUD[condition],
      condition: condition,
      conditionCode: WMO[condition],
      hazard: null,
      source: {
        institution: "Open-Meteo (blend ICON/GFS/ECMWF)",
        provider: "open-meteo",
        model: "best_match",
        run: null,
        generatedAt: null,
        ingestedAt: ctx.generatedAt,
        fallback: false,
        fallbackChain: ["open-meteo"],
        interpolation: "nearest-hour",
        resolutionKm: 9
      },
      quality: { missingFields: [], ageMinutes: null, stationDistanceKm: null, completeness: 1 },
      nearbyObservation: null,
      alerts: alerts
    };

    if (reportable) {
      weather.temperature = null;
      weather.humidity = null;
      weather.precipitation = { probability: null, amount: null, intensity: null };
      weather.wind = { speed: null, gust: null, direction: null };
      weather.visibility = null;
      weather.cloudCover = null;
      weather.condition = "unknown";
      weather.conditionCode = null;
      weather.source = { institution: null, provider: "none", model: null, run: null, generatedAt: null, ingestedAt: ctx.generatedAt, fallback: true, fallbackChain: ["open-meteo", "inmet"], interpolation: null, resolutionKm: null };
      weather.quality = { missingFields: ["temperature", "humidity", "precipitation.amount", "wind.speed", "visibility", "condition"], ageMinutes: null, stationDistanceKm: null, completeness: 0 };
    } else {
      if (inst > 0.9) { weather.precipitation.probability = null; weather.quality.missingFields.push("precipitation.probability"); }
      if (sparse && inst > 0.8) { weather.visibility = null; weather.quality.missingFields.push("visibility"); }
    }
    weather.quality.completeness = weather.quality.missingFields.length === 0 ? 1 : weather.quality.missingFields.length <= 1 ? 0.83 : 0.5;
    weather.hazard = assessHazard(weather);
    return weather;
  }

  function makeObservation(city, pointLat, pointLon) {
    if (!city || city.sparse) return null;
    var rnd = mulberry32(hashStr(city.name + "-obs"));
    var dist = round1(3 + rnd() * 26);
    var age = 8 + Math.floor(rnd() * 44);
    return {
      stationCode: "A" + (100 + Math.floor(rnd() * 800)),
      stationName: city.name.toUpperCase() + " - INMET",
      distanceKm: dist,
      measuredAt: new Date(Date.now() - age * 60000).toISOString(),
      ageMinutes: age,
      temperatureC: round1(14 + rnd() * 12),
      windSpeedKmh: round1(4 + rnd() * 18),
      windGustKmh: round1(10 + rnd() * 30),
      humidityPct: Math.round(50 + rnd() * 45),
      precipitationMm: round1(rnd() * 2)
    };
  }

  function buildSynthetic(origin, destination, departureIso, maxPoints) {
    var dKm = round1(haversineKm(origin.lat, origin.lon, destination.lat, destination.lon) * 1.18);
    var hours = round1((dKm / 71) * 100) / 100;
    var t0 = Date.parse(departureIso);
    var n = Math.max(2, Math.min(maxPoints || 8, 12));
    var day = localParts(departureIso).day;
    var sysSeed = "sys-" + deaccent(origin.name) + "-" + deaccent(destination.name) + "-" + day;
    var generatedAt = new Date().toISOString();
    var latSpan = destination.lat - origin.lat, lonSpan = destination.lon - origin.lon;

    var alertsForUf = [];
    if (valueNoise1(7.3, sysSeed) > 0.62) {
      alertsForUf = [{ id: "sim-" + hashStr(sysSeed), source: "INMET (via mirror radarmeteorologico.com.br)", event: "Tempestade", severity: "Perigo Potencial", level: 1, headline: "Tempestade — Perigo Potencial", startsAt: departureIso.slice(0, 10) + " 00:00", endsAt: departureIso.slice(0, 10) + " 23:59" }];
    }

    var points = [];
    for (var k = 0; k < n; k++) {
      var frac = n === 1 ? 0 : k / (n - 1);
      var curve = Math.sin(frac * Math.PI) * 0.06;
      var lat = round1((origin.lat + latSpan * frac + curve * 1.1) * 100000) / 100000;
      var lon = round1((origin.lon + lonSpan * frac - curve) * 100000) / 100000;
      var etaIso = new Date(t0 + frac * hours * 3600000).toISOString();
      var label = k === 0 ? "origem" : k === n - 1 ? "destino" : "km " + Math.round(frac * dKm);
      var w = makeWeather({ lat: lat, lon: lon, etaIso: etaIso, frac: frac, sysSeed: sysSeed, pointSeed: "pt-" + k + "-" + sysSeed, label: label, generatedAt: generatedAt }, { sparse: !!(origin.sparse || destination.sparse), alerts: alertsForUf });
      if (k === 0) w.nearbyObservation = makeObservation(origin, lat, lon);
      if (k === n - 1) w.nearbyObservation = makeObservation(destination, lat, lon);
      if (w.nearbyObservation) { w.quality.stationDistanceKm = w.nearbyObservation.distanceKm; }
      points.push({ latitude: lat, longitude: lon, eta: etaIso, distanceFromStartKm: round1(frac * dKm), label: label, weather: w });
    }

    var arrival = new Date(t0 + hours * 3600000).toISOString();
    var worst = "none";
    var rank = { none: 0, unknown: 1, attention: 2, alert: 3, severe: 4 };
    points.forEach(function (p) { if (rank[p.weather.hazard.level] > rank[worst]) worst = p.weather.hazard.level; });
    var fallbackUsed = points.some(function (p) { return p.weather.source.fallback; });

    var sources = [];
    var seen = {};
    points.forEach(function (p) {
      var s = p.weather.source;
      var key = s.provider + "|" + s.model + "|" + s.fallback;
      if (!seen[key]) { seen[key] = 1; sources.push(Object.assign({}, s)); }
    });

    return {
      ok: true, real: false,
      summary: {
        origin: { latitude: origin.lat, longitude: origin.lon, label: origin.name + ", " + origin.uf, city: origin.name, uf: origin.uf, timezone: "America/Sao_Paulo", source: "open-meteo-geocoding", ibge: origin.ibge || null },
        destination: { latitude: destination.lat, longitude: destination.lon, label: destination.name + ", " + destination.uf, city: destination.name, uf: destination.uf, timezone: "America/Sao_Paulo", source: "open-meteo-geocoding", ibge: destination.ibge || null },
        departure: departureIso, arrival: arrival, distanceKm: dKm, durationH: hours,
        worstHazard: worst, fallbackUsed: fallbackUsed
      },
      route: { distanceM: Math.round(dKm * 1000), durationS: Math.round(hours * 3600), bbox: [Math.min(origin.lon, destination.lon), Math.min(origin.lat, destination.lat), Math.max(origin.lon, destination.lon), Math.max(origin.lat, destination.lat)], source: "osrm-demo" },
      timeline: points,
      alerts: alertsForUf,
      sources: sources
    };
  }

  /* Reconstrói a amostra real com as ETAs ajustadas para a saída escolhida. */
  function buildRealTrip(newDepartureIso) {
    var baseDep = Date.parse(REAL_TRIP.summary.departure);
    var baseArr = Date.parse(REAL_TRIP.summary.arrival);
    var shift = Date.parse(newDepartureIso) - baseDep;
    var durationMs = baseArr - baseDep;
    var alerts = REAL_TRIP.alerts.slice();
    var generatedAt = new Date().toISOString();
    var alertsByPoint = alerts;

    var timeline = REAL_TRIP.points.map(function (p, idx) {
      var eta = new Date(baseDep + shift + (idx / (REAL_TRIP.points.length - 1)) * durationMs).toISOString();
      var w = {
        point: { latitude: p.lat, longitude: p.lon, label: idx === 0 ? "Ijui, RS" : idx === REAL_TRIP.points.length - 1 ? "Porto Alegre, RS" : p.label },
        requestedTime: eta,
        forecastTime: new Date(Date.parse(eta) - ((Date.parse(eta) - 3 * 3600 * 1000) % 3600000)).toISOString(),
        kind: "forecast",
        temperature: p.temp, feelsLike: null, humidity: p.hum, pressureHpa: null,
        precipitation: { probability: p.precip[0], amount: p.precip[1], intensity: null },
        wind: { speed: p.wind[0], gust: p.wind[1], direction: p.wind[2] },
        visibility: p.vis, cloudCover: p.cloud, condition: p.condition, conditionCode: WMO[p.condition] || null,
        hazard: null,
        source: { institution: "Open-Meteo (blend ICON/GFS/ECMWF)", provider: "open-meteo", model: "best_match", run: null, generatedAt: null, ingestedAt: REAL_TRIP.capturedAt, fallback: false, fallbackChain: ["open-meteo"], interpolation: "nearest-hour", resolutionKm: 9 },
        quality: { missingFields: [], ageMinutes: null, stationDistanceKm: p.obs ? p.obs.distanceKm : null, completeness: 1 },
        nearbyObservation: p.obs ? Object.assign({}, p.obs, { measuredAt: new Date(Date.parse(eta) - (p.obs.ageMinutes || 44) * 60000).toISOString() }) : null,
        alerts: alertsByPoint
      };
      w.hazard = assessHazard(w);
      return { latitude: p.lat, longitude: p.lon, eta: eta, distanceFromStartKm: p.km, label: p.label, weather: w };
    });

    var worst = "none", rank = { none: 0, unknown: 1, attention: 2, alert: 3, severe: 4 };
    timeline.forEach(function (p) { if (rank[p.weather.hazard.level] > rank[worst]) worst = p.weather.hazard.level; });

    var summary = Object.assign({}, REAL_TRIP.summary, { departure: newDepartureIso, arrival: new Date(baseArr + shift).toISOString(), worstHazard: worst });

    return {
      ok: true, real: true,
      summary: summary,
      route: Object.assign({}, REAL_TRIP.route),
      timeline: timeline,
      alerts: alerts,
      sources: [{ institution: "Open-Meteo (blend ICON/GFS/ECMWF)", provider: "open-meteo", model: "best_match", run: null, generatedAt: null, ingestedAt: REAL_TRIP.capturedAt, fallback: false, fallbackChain: ["open-meteo"], interpolation: "nearest-hour", resolutionKm: 9 }]
    };
  }

  /* ------------------------------------------------------------------ */
  /* Busca de cidade                                                     */
  /* ------------------------------------------------------------------ */
  function findCity(query) {
    if (!query) return null;
    var q = deaccent(query).replace(/\s*-\s*[a-z]{2}$/, "").replace(/,.*$/, "").trim();
    if (!q) return null;
    var exact = null, prefix = null;
    for (var i = 0; i < CITIES.length; i++) {
      var n = deaccent(CITIES[i].name);
      if (n === q) { exact = CITIES[i]; break; }
      if (!prefix && (n.indexOf(q) === 0 || q.indexOf(n) === 0)) prefix = CITIES[i];
    }
    return exact || prefix;
  }

  function VError(code, message) { var e = new Error(message); e.code = code; return e; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ------------------------------------------------------------------ */
  /* Backend real (mesma origem por padrão; ?api=... p/ standalone)     */
  /* ------------------------------------------------------------------ */
  function apiBase() {
    try {
      var m = /[?&]api=([^&]+)/.exec(window.location.search || "");
      if (m) return decodeURIComponent(m[1]).replace(/\/+$/, "");
    } catch (e) {}
    return "";
  }
  function liveTrip(req, timeoutMs) {
    var ctrl = null, timer = null;
    try {
      if (typeof AbortController !== "undefined") {
        ctrl = new AbortController();
        timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, timeoutMs || 25000);
      }
    } catch (e) {}
    return fetch(apiBase() + "/api/trips/forecast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ origin: req.origin, destination: req.destination, departure: req.departure, maxPoints: req.maxPoints || 8 }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) {
        return res.text().then(function (t) {
          var msg = "Falha ao calcular a viagem.";
          try { var j = JSON.parse(t); if (j && j.error) msg = typeof j.error === "string" ? j.error : msg; } catch (e2) {}
          throw VError(res.status, msg);
        });
      }
      return res.json();
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    }).then(function (trip) {
      if (!trip || trip.ok !== true || !trip.timeline) throw VError(502, "Resposta inesperada do servidor.");
      trip.live = true;
      return trip;
    });
  }

  /* ------------------------------------------------------------------ */
  /* API simulada (fallback local honesto quando o backend falha)        */
  /* ------------------------------------------------------------------ */
  async function forecast(req) {
    var originRaw = (req.origin || "").trim();
    var destRaw = (req.destination || "").trim();
    if (!originRaw || !destRaw) throw VError(400, "Informe a origem e o destino da viagem.");
    if (deaccent(originRaw) === deaccent(destRaw)) throw VError(400, "A origem e o destino são iguais. Escolha pontos diferentes.");
    var departure = req.departure || new Date(Date.now() + 3600000).toISOString();
    var maxPoints = req.maxPoints || 8;

    try {
      return await liveTrip(req);
    } catch (err) {
      if (err && err.code === 400) throw err; // erro de validação: não mascarar
      return simulate(req, departure, maxPoints);
    }
  }

  async function simulate(req, departure, maxPoints) {
    await sleep(1200 + Math.random() * 600);
    var originRaw = (req.origin || "").trim();
    var destRaw = (req.destination || "").trim();
    if (!originRaw || !destRaw) throw VError(400, "Informe a origem e o destino da viagem.");
    if (deaccent(originRaw) === deaccent(destRaw)) throw VError(400, "A origem e o destino são iguais. Escolha pontos diferentes.");

    var o = findCity(originRaw), d = findCity(destRaw);
    if (!o) throw VError(502, "Não foi possível localizar \u201C" + originRaw + "\u201D. Verifique o nome e a UF.");
    if (!d) throw VError(502, "Não foi possível localizar \u201C" + destRaw + "\u201D. Verifique o nome e a UF.");
    if (o.island) throw VError(502, "Não existe rota rodoviária até " + o.name + " (acesso apenas marítimo/aéreo).");
    if (d.island) throw VError(502, "Não existe rota rodoviária até " + d.name + " (acesso apenas marítimo/aéreo).");

    if (o.name === "Ijuí" && d.name === "Porto Alegre") return buildRealTrip(departure);
    return buildSynthetic(o, d, departure, maxPoints);
  }

  VT.CITIES = CITIES;
  VT.REAL_TRIP = REAL_TRIP;
  VT.sampleTrip = function () { return buildRealTrip(REAL_TRIP.summary.departure); };
  VT.findCity = findCity;
  VT.assessHazard = assessHazard;
  VT.forecast = forecast;
  VT.helpers = { deaccent: deaccent, pad: pad, haversineKm: haversineKm, round1: round1, localParts: localParts };
})();
