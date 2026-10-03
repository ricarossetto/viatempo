/* ============================================================================
   ViaTempo — aplicação (roteamento por hash, render, interações)
   Linguagem: "Carta Sinótica". Sem webfonts. Sem scrollIntoView.
   ========================================================================== */
(function () {
  "use strict";
  var VT = window.VT;
  var H = VT.helpers;

  /* ------------------------------------------------------------------ ícones */
  var ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/>',
    "cloud-sun": '<circle cx="8" cy="8" r="2.6"/><path d="M8 3.2v1.3M3.2 8h1.3M4.7 4.7l.9.9M11.3 4.7l-.9.9"/><path d="M9.5 20h6.8a3.6 3.6 0 0 0 .3-7.2A4.6 4.6 0 0 0 8 12.3"/>',
    cloud: '<path d="M7 18h9.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.3 11.4 3.3 3.3 0 0 0 7 18Z"/>',
    fog: '<path d="M7 14.5h9.5a3.6 3.6 0 0 0 .3-7.2A5.2 5.2 0 0 0 6.5 8.4 3.1 3.1 0 0 0 7 14.5Z"/><path d="M4 17.5h13M6 20.5h12"/>',
    drizzle: '<path d="M7 15h9.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.3 8.4 3.3 3.3 0 0 0 7 15Z"/><path d="M8.5 18l-.7 2M12.5 18l-.7 2M16.5 18l-.7 2"/>',
    rain: '<path d="M7 15h9.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.3 8.4 3.3 3.3 0 0 0 7 15Z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
    "heavy-rain": '<path d="M7 14h9.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.3 7.4 3.3 3.3 0 0 0 7 14Z"/><path d="M7.5 17l-1.2 3.5M11 17l-1.2 3.5M14.5 17l-1.2 3.5M18 17l-1.2 3.5"/>',
    storm: '<path d="M7 14h9.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.3 7.4 3.3 3.3 0 0 0 7 14Z"/><path d="M12.5 15l-2 4h2.6l-1.4 4"/>',
    snow: '<path d="M7 14h9.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.3 7.4 3.3 3.3 0 0 0 7 14Z"/><path d="M9 18h.01M12 20h.01M15 18h.01M10.5 21h.01M13.5 21h.01"/>',
    unknown: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.7a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1.9-1.1 1.7v.2"/><path d="M12 17h.01"/>',
    "arrow-right": '<path d="M4 12h15M13 6l6 6-6 6"/>',
    "chevron-right": '<path d="M9 6l6 6-6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    swap: '<path d="M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l-3 3M17 7l3 3"/>',
    pin: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    wind: '<path d="M4 8h9a3 3 0 1 0-3-3"/><path d="M4 12h13a3 3 0 1 1-3 3"/><path d="M4 16h6"/>',
    droplet: '<path d="M12 3s6 6.3 6 10.5A6 6 0 0 1 6 13.5C6 9.3 12 3 12 3Z"/>',
    eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/>',
    thermometer: '<path d="M10 4a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0Z"/><path d="M12 15.5v-2"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5Z"/>',
    "alert-triangle": '<path d="M12 4l9 16H3Z"/><path d="M12 10v4M12 17h.01"/>',
    "alert-octagon": '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8Z"/><path d="M12 8v5M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2 5.6M20 5v6h-6"/>',
    route: '<circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="6" r="2.4"/><path d="M6 15.6V8a2 2 0 0 1 2-2h6"/><path d="M18 8.4V16a2 2 0 0 1-2 2H10"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3.5V6M16 3.5V6"/>',
    contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/>',
    shield: '<path d="M12 3l7 3v6c0 4.4-3 8-7 9-4-1-7-4.6-7-9V6Z"/><path d="M9 12l2 2 4-4"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5Z"/><path d="M3 13l9 5 9-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    spark: '<path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8Z"/>',
    source: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    car: '<path d="M3.6 16.4h16.8"/><path d="M5.2 16.4l1-4.2a2 2 0 0 1 1.9-1.5h7.8a2 2 0 0 1 1.9 1.5l1 4.2"/><path d="M8.2 10.7V9.4a1.7 1.7 0 0 1 1.7-1.7h4.2a1.7 1.7 0 0 1 1.7 1.7v1.3"/><circle cx="7.7" cy="17.3" r="1.5"/><circle cx="16.3" cy="17.3" r="1.5"/>',
    moto: '<circle cx="6.2" cy="16.4" r="2.6"/><circle cx="17.8" cy="16.4" r="2.6"/><path d="M6.4 16.2l3.6-5.2h3.8"/><path d="M13.6 11l3.4 5.2"/><path d="M9.4 9.2h3.2"/>',
    truck: '<path d="M2.8 16.4h18.4"/><path d="M4 16.4V7.6A1.6 1.6 0 0 1 5.6 6h7.2v10.4"/><path d="M12.8 10.2h3.2l3 3.4v2.8h-6.2"/><circle cx="7.6" cy="17.1" r="1.6"/><circle cx="16.7" cy="17.1" r="1.6"/>',
    moon: '<path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z"/>',
    road: '<path d="M7 20L9.5 4h5L17 20"/><path d="M12 5.2v2.3M12 11v2.3M12 16.8V19"/>'
  };

  function buildSprite() {
    var parts = ['<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">'];
    Object.keys(ICONS).forEach(function (k) {
      parts.push('<symbol id="i-' + k + '" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + "</g></symbol>");
    });
    parts.push("</svg>");
    var d = document.createElement("div");
    d.innerHTML = parts.join("");
    document.body.insertBefore(d.firstChild, document.body.firstChild);
  }
  function icon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  }
  function brandMark() {
    return '<svg class="brand__mark" viewBox="0 0 24 24" aria-hidden="true" role="img"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.4"/><path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21"/><path d="M12 8.6c3 0 5-1.4 5-4.2"/></g></svg>';
  }

  /* -------------------------------------------------------------- metadados */
  var COND = {
    clear: { label: "Céu limpo", icon: "sun" },
    partly_cloudy: { label: "Parcialmente nublado", icon: "cloud-sun" },
    overcast: { label: "Encoberto", icon: "cloud" },
    fog: { label: "Nevoeiro", icon: "fog" },
    drizzle: { label: "Garoa", icon: "drizzle" },
    rain: { label: "Chuva", icon: "rain" },
    heavy_rain: { label: "Chuva forte", icon: "heavy-rain" },
    storm: { label: "Tempestade", icon: "storm" },
    snow: { label: "Neve", icon: "snow" },
    unknown: { label: "Sem dados", icon: "unknown" }
  };
  var HZ = {
    none: { label: "Sem risco", icon: "check", rank: 0 },
    unknown: { label: "Sem dados", icon: "unknown", rank: 1 },
    attention: { label: "Atenção", icon: "alert-triangle", rank: 2 },
    alert: { label: "Alerta", icon: "alert-triangle", rank: 3 },
    severe: { label: "Severo", icon: "alert-octagon", rank: 4 }
  };

  /* Vocabulário de clima e de veículos — o mesmo que o motor de cena desenha. */
  var WX = [
    { k: "calor", name: "Calor", icon: "sun", sky: "linear-gradient(180deg,#2a63ae,#bcdfef,#fff3cf)", col: "#ffd27a", chip: "sol a pino · pista seca", tag: "sol" },
    { k: "chuva", name: "Chuva", icon: "rain", sky: "linear-gradient(180deg,#41526b,#5f7288,#8698a8)", col: "#bcd6ee", chip: "pista molhada · spray", tag: "chuva" },
    { k: "tempestade", name: "Tempestade", icon: "storm", sky: "linear-gradient(180deg,#0e1626,#2b3a58,#435878)", col: "#9fb4d8", chip: "raios · chuva forte", tag: "tempestade" },
    { k: "vendaval", name: "Vendaval", icon: "wind", sky: "linear-gradient(180deg,#26333f,#586a76,#7e8c94)", col: "#c3d2d8", chip: "rajadas laterais", tag: "vento" },
    { k: "gelo", name: "Gelo e frio", icon: "snow", sky: "linear-gradient(180deg,#4a5f70,#b6c8d3,#e6f1f6)", col: "#dff0f8", chip: "pista escorregadia", tag: "frio" },
    { k: "noite", name: "Noite", icon: "moon", sky: "linear-gradient(180deg,#050912,#16233a,#26374f)", col: "#cdd9f2", chip: "faróis e reflexos", tag: "noite" },
    { k: "nublado", name: "Encoberto", icon: "cloud", sky: "linear-gradient(180deg,#5c7186,#aebdca,#d3dde4)", col: "#e6ecf2", chip: "luz plana", tag: "nublado" },
    { k: "amanhecer", name: "Amanhecer", icon: "sun", sky: "linear-gradient(180deg,#1f3a6e,#e79a6b,#ffd9a0)", col: "#ffd9a0", chip: "primeira luz", tag: "crepúsculo" }
  ];
  var VEHICLES = [
    { name: "Carro de passeio", icon: "car", d: "O caso mais comum: viagens curtas e longas, sensíveis a chuva forte e neblina." },
    { name: "Motocicleta", icon: "moto", d: "Mais exposta: rajadas, pista molhada e frio pesam muito mais sobre duas rodas." },
    { name: "Caminhão", icon: "truck", d: "Mais massa e mais distância de frenagem — vento lateral e gelo mudam o jogo." }
  ];

  /* ------------------------------------------------------------------- utils */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  var TZ = "America/Sao_Paulo";
  function fmtHM(iso) {
    if (!iso) return "—";
    try { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso)); }
    catch (e) { return "—"; }
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    try { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: TZ }).format(new Date(iso)); }
    catch (e) { return "—"; }
  }
  function fmtDur(h) {
    if (h == null) return "—";
    var total = Math.round(h * 60), hh = Math.floor(total / 60), mm = total % 60;
    return hh + "h" + p2(mm);
  }
  function fmtNum(n, d) { return n == null ? null : Number(n).toFixed(d == null ? 0 : d).replace(".", ","); }
  function temp(n) { return n == null ? null : fmtNum(n, 1); }
  function localInputToIso(val) { return val ? val + ":00-03:00" : null; }
  function defaultDeparture() {
    var d = new Date(Date.now() + 86400000); d.setHours(14, 30, 0, 0);
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()) + "T" + p2(d.getHours()) + ":" + p2(d.getMinutes());
  }
  function isoToLocalInput(iso) {
    var p = H.localParts(iso);
    return p.y + "-" + p2(p.m) + "-" + p2(p.d) + "T" + p2(p.h) + ":" + p2(p.min);
  }
  function hzClass(l) { return "h-" + (HZ[l] ? l : "unknown"); }
  function uniq(arr) { var seen = {}, out = []; (arr || []).forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v); } }); return out; }
  function hazardBadge(level, opts) {
    opts = opts || {};
    var m = HZ[level] || HZ.unknown;
    return '<span class="hz ' + hzClass(level) + (opts.solid ? " hz--solid" : "") + '">' + icon(m.icon) + m.label + "</span>";
  }

  /* ========================================================= MODELO DE ESTAÇÃO */
  /* Círculo = cobertura de nuvem (fração preenchida); barba = vento real.
     Vocabulário autêntico de carta sinótica, usado como elemento gráfico. */
  var glyphSeq = 0;
  function stationGlyph(w, size) {
    size = size || 54;
    var c = size / 2, r = size * 0.28, L = size * 0.3;
    var id = "gly" + (++glyphSeq);
    var cover = (w.cloudCover == null) ? null : Math.max(0, Math.min(1, w.cloudCover / 100));
    var speed = (w.wind && w.wind.speed != null) ? w.wind.speed : null;
    var dir = (w.wind && w.wind.direction != null) ? w.wind.direction : null;
    var o = ['<svg viewBox="0 0 ' + size + " " + size + '" class="station__glyph" style="color:var(--ink-2)" aria-hidden="true">'];
    o.push('<defs><clipPath id="' + id + '"><circle cx="' + c + '" cy="' + c + '" r="' + r + '"/></clipPath></defs>');
    o.push('<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2"/>');
    if (cover == null) {
      o.push('<line x1="' + (c - r * 0.68).toFixed(1) + '" y1="' + (c + r * 0.68).toFixed(1) + '" x2="' + (c + r * 0.68).toFixed(1) + '" y2="' + (c - r * 0.68).toFixed(1) + '" stroke="currentColor" stroke-opacity="0.5" stroke-width="1.2" stroke-dasharray="2 2"/>');
    } else if (cover > 0.02) {
      var h = 2 * r * cover;
      o.push('<g clip-path="url(#' + id + ')"><rect x="' + (c - r) + '" y="' + (c + r - h).toFixed(2) + '" width="' + (2 * r) + '" height="' + h.toFixed(2) + '" fill="currentColor" fill-opacity="0.85"/></g>');
    }
    if (speed != null && dir != null && speed > 1) {
      var t = dir * Math.PI / 180;
      var ux = Math.sin(t), uy = -Math.cos(t);
      var x1 = c + ux * (r + L), y1 = c + uy * (r + L);
      o.push('<line x1="' + (c + ux * r).toFixed(1) + '" y1="' + (c + uy * r).toFixed(1) + '" x2="' + x1.toFixed(1) + '" y2="' + y1.toFixed(1) + '" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>');
      var px = -uy, py = ux, step = size * 0.07, tick = size * 0.15, pos = 0, i;
      function at(d) { return [x1 - ux * d, y1 - uy * d]; }
      var kt = speed / 1.852;
      var pn = Math.floor(kt / 50); kt -= pn * 50;
      var fl = Math.floor(kt / 10); kt -= fl * 10;
      var hf = kt >= 5 ? 1 : 0;
      for (i = 0; i < pn; i++) {
        var a = at(pos), b = at(pos + step);
        o.push('<path d="M' + a[0].toFixed(1) + " " + a[1].toFixed(1) + " L" + (a[0] + px * tick).toFixed(1) + " " + (a[1] + py * tick).toFixed(1) + " L" + b[0].toFixed(1) + " " + b[1].toFixed(1) + ' Z" fill="currentColor"/>');
        pos += step + 1;
      }
      for (i = 0; i < fl; i++) {
        var q = at(pos);
        o.push('<line x1="' + q[0].toFixed(1) + '" y1="' + q[1].toFixed(1) + '" x2="' + (q[0] + px * tick).toFixed(1) + '" y2="' + (q[1] + py * tick).toFixed(1) + '" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>');
        pos += step;
      }
      if (hf) {
        var d2 = at(pos);
        o.push('<line x1="' + d2[0].toFixed(1) + '" y1="' + d2[1].toFixed(1) + '" x2="' + (d2[0] + px * tick * 0.55).toFixed(1) + '" y2="' + (d2[1] + py * tick * 0.55).toFixed(1) + '" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>');
      }
    }
    o.push("</svg>");
    return o.join("");
  }
  function chartLines() {
    return '<svg viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true" style="width:100%;height:100%">' +
      '<g fill="none" stroke="currentColor" stroke-opacity="0.14" stroke-width="1">' +
      '<path d="M-20 96C60 70 120 118 200 92S340 60 420 88"/>' +
      '<path d="M-20 118C70 96 130 136 210 112S350 84 420 108"/>' +
      '<path d="M-20 72C50 52 130 92 210 70S340 40 420 64"/>' +
      '<path d="M-20 48C60 30 140 66 220 46S350 20 420 42"/>' +
      "</g></svg>";
  }

  /* ------------------------------------------------------------------ estado */
  var state = {
    route: "landing",
    status: "idle",
    form: { origin: "Ijuí, RS", destination: "Porto Alegre, RS", departure: defaultDeparture(), maxPoints: 8 },
    trip: null,
    error: null,
    activePoint: -1,
    progStep: 0
  };

  /* --------------------------------------------------- cena viva & revelações */
  var scene = null;
  var revealIO = null;
  var moodTick = false;
  function initScene() {
    var canvas = document.getElementById("scene");
    if (!canvas || !window.VTScene) return null;
    if (!scene) scene = window.VTScene.create(canvas);
    return scene;
  }
  function currentMood() {
    var secs = document.querySelectorAll("[data-mood]");
    if (!secs.length) return document.documentElement.getAttribute("data-theme") === "dark" ? "noite" : "manha";
    var y = window.pageYOffset + window.innerHeight * 0.34, cur = secs[0];
    for (var i = 0; i < secs.length; i++) { if (secs[i].offsetTop <= y) cur = secs[i]; }
    return cur.getAttribute("data-mood");
  }
  function applyMood() {
    moodTick = false;
    if (scene) scene.go(currentMood());
  }
  function requestMood() { if (!moodTick) { moodTick = true; requestAnimationFrame(applyMood); } }
  function setupReveal() {
    var nodes = document.querySelectorAll("#main-content .section, #main-content .hero__in > *");
    if (!("IntersectionObserver" in window)) { Array.prototype.forEach.call(nodes, function (n) { n.classList.add("is-in"); }); return; }
    if (revealIO) revealIO.disconnect();
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); revealIO.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    Array.prototype.forEach.call(nodes, function (n) { n.classList.add("reveal"); revealIO.observe(n); });
  }

  /* --------------------------------------------------------------- roteamento */
  function parseHash() {
    var h = (location.hash || "").replace(/^#\/?/, "").split("?")[0];
    if (h === "planejar") return "planner";
    if (h === "viagem") return "trip";
    return "landing";
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function render() {
    state.route = parseHash();
    if (state.route !== "trip") state.activePoint = -1;
    if (state.route === "trip" && state.status === "idle" && !state.trip) { location.replace("#/planejar"); return; }
    var app = document.getElementById("app");
    app.innerHTML = state.route === "planner" ? renderPlanner()
      : state.route === "trip" ? renderTrip()
      : renderLanding();
    app.dataset.route = state.route;
    document.body.setAttribute("data-route", state.route);
    if (state.route === "landing") { initScene(); setupReveal(); requestMood(); }
    else if (scene) { scene.go(document.documentElement.getAttribute("data-theme") === "dark" ? "noite" : "manha"); }
    if (state.route === "planner") bindPlanner();
    if (state.route === "trip" && state.trip && typeof window !== "undefined" && window.L) initRealMap(state.trip);
    buildDrawer();
    var m = app.querySelector("#main-content");
    if (m) m.setAttribute("tabindex", "-1");
  }
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.pageYOffset - 74;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
  }

  /* ================================================================== LANDING */
  function masthead() {
    return '<header class="masthead" data-od-id="masthead"><div class="container masthead__in">' +
      '<a class="brand" href="#/" aria-label="ViaTempo — início" data-od-id="brand-home">' + brandMark() + "<b>Via</b><span>Tempo</span></a>" +
      '<nav aria-label="Navegação principal">' +
        '<a href="#/" data-scroll="problema">O problema</a>' +
        '<a href="#/" data-scroll="como">Como funciona</a>' +
        '<a href="#/" data-scroll="clima">O céu</a>' +
        '<a href="#/" data-scroll="estrada">Na estrada</a>' +
        '<a href="#/" data-scroll="exemplo">Exemplo real</a>' +
        '<a href="#/" data-scroll="confianca">Confiança</a>' +
      "</nav>" +
      '<div class="masthead__act">' +
        '<button class="iconbtn" type="button" data-action="theme" aria-label="Alternar tema claro/escuro">' + icon("contrast") + "</button>" +
        '<a class="btn btn--primary btn--sm" href="#/planejar" data-od-id="cta-top">Planejar viagem ' + icon("arrow-right") + "</a>" +
      "</div></div></header>";
  }

  function previewStrip(trip) {
    var cells = trip.timeline.map(function (p, i) {
      var c = COND[p.weather.condition] || COND.unknown;
      return '<div class="strip__cell ' + hzClass(p.weather.hazard.level) + '">' +
        '<span class="t">' + fmtHM(p.eta) + "</span>" +
        '<span class="g">' + icon(c.icon) + "</span>" +
        '<span class="tp">' + (p.weather.temperature == null ? "n/d" : temp(p.weather.temperature) + "°") + "</span></div>";
    }).join("");
    return '<div class="chart-preview" data-od-id="hero-chart">' +
      '<div class="chart-preview__bar"><span class="dot"></span> Carta do dia <span class="sp">' + fmtNum(trip.summary.distanceKm, 1) + " km</span></div>" +
      '<div class="chart-preview__body">' +
        '<div class="preview__places">' +
          '<div class="preview__place"><b>' + esc(trip.summary.origin.city) + "</b><span>" + fmtHM(trip.summary.departure) + " · saída</span></div>" +
          '<div class="preview__place preview__place--d"><b>' + esc(trip.summary.destination.city) + "</b><span>" + fmtHM(trip.summary.arrival) + " · chegada</span></div>" +
        "</div>" +
        '<div class="strip">' + cells + "</div>" +
        '<p class="preview__foot">Risco máximo <b>' + HZ[trip.summary.worstHazard].label.toLowerCase() + "</b> · " + fmtDur(trip.summary.durationH) + " de viagem</p>" +
      "</div></div>";
  }

  function renderLanding() {
    var real = VT.sampleTrip();
    return masthead() +
      '<main id="main-content">' +
      '<section class="hero" data-od-id="hero" data-mood="amanhecer"><div class="hero__wash"></div><div class="hero__grid field-grid"></div>' +
        '<div class="container hero__in">' +
          "<div>" +
            '<span class="eyebrow">Previsão meteorológica por rota</span>' +
            "<h1>O tempo de <em>toda a viagem</em>, não só o do destino.</h1>" +
            '<p class="lede">O ViaTempo cruza a sua rota, o horário de saída e a previsão hora a hora para mostrar o clima que você vai encontrar em cada trecho — no momento exato em que passar por ele.</p>' +
            '<div class="hero__cta">' +
              '<a class="btn btn--sun btn--lg" href="#/planejar" data-od-id="cta-hero">Planejar minha viagem ' + icon("arrow-right") + "</a>" +
              '<a class="btn btn--ghost btn--lg" href="#/" data-scroll="exemplo">Ver exemplo real</a>' +
            "</div>" +
            '<div class="hero__facts">' +
              '<div class="fact"><b>408,7</b><span>km · Ijuí → Porto Alegre</span></div>' +
              '<div class="fact"><b>8</b><span>estações ao longo da rota</span></div>' +
              '<div class="fact"><b>INMET</b><span>observação real próxima</span></div>' +
            "</div>" +
            roadline() +
          "</div>" +
          "<div>" + previewStrip(real) + "</div>" +
        "</div></section>" +

      '<section class="section" id="problema" data-od-id="section-problema" data-mood="calor"><div class="container">' +
        '<div class="head"><span class="eyebrow">O problema</span>' +
          "<h2>Consultar o clima do destino não conta a história da estrada.</h2>" +
          "<p>Às 14h30 você sai de Ijuí. Às 17h05 estará em Soledade, às 19h10 perto de Porto Alegre. A previsão de Porto Alegre às 19h não descreve o que você encontra no meio do caminho.</p></div>" +
        '<div class="compare">' +
          '<div class="panel"><span class="panel__tag label">Como se faz hoje</span><h3>Uma previsão só do destino</h3>' +
            "<p>Você escolhe a cidade de chegada e olha um número. A estrada inteira — cerca de 5 horas e 400 km de condições que mudam — fica invisível.</p>" +
            '<div class="mini">' +
              '<div class="mini__row"><span class="k">Destino</span><span class="v">Porto Alegre · 14 °C, parcialmente nublado</span></div>' +
              '<div class="mini__row"><span class="k">Trecho</span><span class="v dim">sem informação</span></div>' +
              '<div class="mini__row"><span class="k">Vento</span><span class="v dim">sem informação no caminho</span></div>' +
            "</div></div>" +
          '<div class="panel panel--brand"><span class="panel__tag label">Como o ViaTempo faz</span><h3>Uma leitura para cada trecho, no seu horário</h3>' +
            "<p>Traçamos a rota, estimamos quando você passa por cada ponto e buscamos o clima daquele local naquele horário — com risco classificado e alertas oficiais.</p>" +
            '<div class="mini">' +
              '<div class="mini__row"><span class="k">14:30</span><span class="v">Ijuí · 21,7 °C · céu limpo</span></div>' +
              '<div class="mini__row"><span class="k">17:05</span><span class="v">Soledade · 18,4 °C · encoberto</span></div>' +
              '<div class="mini__row"><span class="k">19:10</span><span class="v">Porto Alegre · 13,9 °C · 25% de chuva</span></div>' +
            "</div></div>" +
        "</div></div></section>" +

      '<section class="section section--tight" id="como" data-od-id="section-como" data-mood="nublado"><div class="container">' +
        '<div class="head"><span class="eyebrow">Como funciona</span><h2>Três informações e a viagem vira previsão.</h2></div>' +
        '<div class="steps">' +
          step("Você informa a viagem", "Origem, destino e o horário em que pretende sair. Nada além disso é obrigatório.") +
          step("Estimamos onde você estará", "Traçamos a rota e calculamos o horário previsto de passagem por cada ponto (ETAs).") +
          step("Buscamos o clima de cada ponto", "A previsão daquele local naquele horário, o risco do trecho e os alertas oficiais da região.") +
        "</div></div></section>" +

      '<section class="section" id="clima" data-od-id="section-clima" data-mood="tempestade"><div class="container">' +
        '<div class="head"><span class="eyebrow">O céu da estrada</span>' +
          "<h2>Sol, chuva, tempestade, vendaval, gelo. A estrada tem todos os climas.</h2>" +
          "<p>O mesmo trajeto pode começar sob sol e terminar em tempestade. O ViaTempo descreve o clima de cada trecho com o vocabulário de quem está na pista — e o risco que ele representa. O céu aqui atrás muda enquanto você rola a página: é o mesmo motor que desenha cada estado.</p></div>" +
        '<div class="wx-grid">' + WX.map(wxCard).join("") + "</div></div></section>" +

      '<section class="section section--tight" data-od-id="section-recursos" data-mood="chuva"><div class="container">' +
        '<div class="head"><span class="eyebrow">O que você recebe</span><h2>Uma leitura completa da viagem, não um número solto.</h2></div>' +
        '<div class="features">' +
          feature("route", "Mapa da rota", "Origem, destino e cada ponto meteorológico posicionados geograficamente, coloridos pelo nível de risco.") +
          feature("activity", "Carta da rota", "Cada estação ao longo do trajeto com hora, distância, temperatura, chuva, vento e risco.") +
          feature("alert-octagon", "Risco com motivos", "Cada trecho recebe um nível e as razões: rajadas, chuva intensa, baixa visibilidade ou alerta oficial.") +
          feature("eye", "Observação real próxima", "Quando há uma estação INMET perto, mostramos o que ela mediu — separado da previsão.") +
          feature("source", "Transparência da fonte", "Instituição, modelo, rodada e interpolação de cada previsão, sob demanda.") +
          feature("shield", "Fallback honesto", "Se uma fonte falha, usamos outra e avisamos. Ausência de dados nunca é mostrada como segurança.") +
        "</div></div></section>" +

      '<section class="section" id="estrada" data-od-id="section-estrada" data-mood="crepusculo"><div class="container">' +
        '<div class="head"><span class="eyebrow">Quem está na estrada</span>' +
          "<h2>Carro, moto ou caminhão: o mesmo clima pesa diferente.</h2>" +
          "<p>Uma rajada que balança um carro pode derrubar uma moto; o gelo que pede atenção num carro alonga a frenagem de um caminhão. O risco é lido para quem realmente está na pista.</p></div>" +
        '<div class="vehicles">' + VEHICLES.map(vehicleCard).join("") + "</div></div></section>" +

      '<section class="section" id="exemplo" data-od-id="section-exemplo" data-mood="vendaval"><div class="container">' +
        '<div class="head"><span class="eyebrow">Exemplo real</span><h2>Ijuí → Porto Alegre, saída às 14h30.</h2>' +
          "<p>Dados capturados de uma consulta real à API. Veja como o clima evolui ao longo das 5h44 de viagem.</p></div>" +
        '<div class="compare">' +
          '<div class="card card--flush">' + logMarkup(real, { compact: true }) + "</div>" +
          '<div class="panel"><span class="panel__tag label">Leitura rápida</span>' +
            '<div style="font-family:var(--font-mono);font-size:2.6rem;font-weight:600;letter-spacing:-.02em">' + fmtNum(real.summary.distanceKm, 1) + ' <small style="font-size:1rem;color:var(--ink-3)">km</small></div>' +
            '<div class="mini">' +
              '<div class="mini__row"><span class="k">Duração</span><span class="v">' + fmtDur(real.summary.durationH) + " · chegada " + fmtHM(real.summary.arrival) + "</span></div>" +
              '<div class="mini__row"><span class="k">Risco</span><span class="v">atenção (alerta de tempestade na região)</span></div>' +
              '<div class="mini__row"><span class="k">Temperatura</span><span class="v">21,7 °C na saída → 13,9 °C na chegada</span></div>' +
              '<div class="mini__row"><span class="k">Chuva</span><span class="v">0% no início → 25% no destino</span></div>' +
            "</div>" +
            '<a class="btn btn--primary" href="#/planejar" style="margin-top:var(--sp-4)">Fazer essa viagem ' + icon("arrow-right") + "</a>" +
          "</div>" +
        "</div></div></section>" +

      '<section class="section section--tight" id="confianca" data-od-id="section-confianca" data-mood="noite"><div class="container">' +
        '<div class="head"><span class="eyebrow">Confiança</span><h2>Clareza sobre de onde vem cada dado.</h2></div>' +
        '<div class="trust">' +
          trust("layers", "Múltiplas fontes", "Previsão horária do Open-Meteo (blend ICON/GFS/ECMWF), observação e alertas do INMET e modelos do CPTEC/INPE.") +
          trust("alert-octagon", "Alertas oficiais", "Avisos do INMET aparecem quando relevantes para a sua viagem, com evento, severidade e vigência.") +
          trust("eye", "Previsão ≠ observação", "O que é previsão fica nos campos principais. O que é medição real vem rotulado como observação próxima.") +
          trust("info", "Ausência de dados é sinalizada", "Quando faltam dados para avaliar um trecho, dizemos isso — nunca tratamos como tempo seguro.") +
        "</div></div></section>" +

      '<section class="section section--tight" data-od-id="section-cta" data-mood="noite"><div class="container"><div class="cta-band">' +
        '<span class="eyebrow">Comece agora</span>' +
        "<h2>Planeje a viagem que você vai fazer. Leva menos de um minuto.</h2>" +
        "<p class=\"lede\">Todo o planejador funciona: informe origem, destino e horário e veja o clima ao longo de toda a estrada.</p>" +
        '<a class="btn btn--primary btn--lg" href="#/planejar">Planejar viagem ' + icon("arrow-right") + "</a>" +
      "</div></div></section>" +
      siteFooter() +
      "</main>";
  }
  function step(t, d) { return '<div class="step"><h3>' + t + "</h3><p>" + d + "</p></div>"; }
  function feature(ic, t, d) { return '<div class="feature">' + icon(ic) + "<h3>" + t + "</h3><p>" + d + "</p></div>"; }
  function trust(ic, t, d) { return '<div class="trust__item">' + icon(ic) + "<div><h3>" + t + "</h3><p>" + d + "</p></div></div>"; }
  function wxCard(w) {
    return '<article class="wx" data-wx="' + w.k + '">' +
      '<div class="wx__sky" style="background:' + w.sky + '"><span style="color:' + w.col + '">' + icon(w.icon) + "</span></div>" +
      '<b class="wx__name">' + w.name + '</b><p>' + w.chip + '</p><span class="wx__tag">' + w.tag + "</span></article>";
  }
  function vehicleCard(v) {
    return '<article class="vehicle"><div class="vehicle__ic" aria-hidden="true">' + icon(v.icon) + "</div>" +
      "<div><h3>" + v.name + "</h3><p>" + v.d + "</p></div></article>";
  }
  function roadline() {
    var units = [["car", "carro"], ["moto", "moto"], ["truck", "caminhão"], ["car", "carro"], ["truck", "caminhão"]].map(function (u) {
      return '<div class="roadline__unit">' + icon(u[0]) + "<small>" + u[1] + "</small></div>";
    }).join("");
    return '<div class="roadline" aria-hidden="true"><div class="roadline__units">' + units + "</div></div>";
  }
  function siteFooter() {
    return '<footer class="footer" data-od-id="footer"><div class="container"><div class="footer__grid">' +
      '<div><a class="brand" href="#/">' + brandMark() + "<b>Via</b><span>Tempo</span></a>" +
      '<p style="margin-top:12px;max-width:42ch">Planejador meteorológico de viagens rodoviárias. Rota + horário + previsão ao longo do trajeto.</p></div>' +
      '<div><h4>Produto</h4><ul><li><a href="#/planejar">Planejar viagem</a></li><li><a href="#/" data-scroll="como">Como funciona</a></li><li><a href="#/" data-scroll="clima">O céu da estrada</a></li><li><a href="#/" data-scroll="estrada">Quem está na estrada</a></li><li><a href="#/" data-scroll="exemplo">Exemplo real</a></li></ul></div>' +
      '<div><h4>Dados</h4><ul><li><a href="#/" data-scroll="confianca">Fontes e transparência</a></li><li><a href="#/" data-scroll="confianca">Alertas oficiais</a></li><li><a href="#/" data-scroll="confianca">Fallback</a></li></ul></div>' +
      '</div><p class="note" style="margin-top:28px">Protótipo de design. Dados meteorológicos reais capturados em 30/09/2026; demais trajetos são simulados para demonstração.</p></div></footer>';
  }

  /* =================================================================== PLANNER */
  function appBar(left, actions) {
    return '<header class="app__bar" data-od-id="appbar"><div class="container app__bar-in">' +
      '<a class="brand" href="#/" aria-label="ViaTempo — início">' + brandMark() + "<b>Via</b><span>Tempo</span></a>" +
      '<div class="crumb">' + left + "</div>" +
      '<div class="app__bar-act">' +
        '<button class="iconbtn" type="button" data-action="theme" aria-label="Alternar tema claro/escuro">' + icon("contrast") + "</button>" +
        (actions || "") +
      "</div></div></header>";
  }
  function renderPlanner() {
    return '<div class="app">' + appBar("<b>Planejar viagem</b><span>origem · destino · horário</span>",
        '<a class="btn btn--ghost btn--sm" href="#/">Início</a>') +
      '<main id="main-content"><div class="container" style="padding-block:var(--sp-7)"><div class="planner">' +
        '<div class="card" data-od-id="planner-form">' + plannerForm() + "</div>" +
        '<div class="card card--flat" data-od-id="planner-aside">' + plannerAside() + "</div>" +
      "</div></div></main>" + appFooterStub() + "</div>";
  }
  function plannerForm() {
    var f = state.form;
    return '<form class="form" id="trip-form" novalidate>' +
      '<fieldset class="fieldset"><legend class="label">Trajeto</legend>' +
        '<div class="row2">' +
          '<div class="field" data-field="origin"><label for="origin">Origem</label>' +
            '<div class="combo"><input class="input" id="origin" name="origin" type="text" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="origin-list" aria-autocomplete="list" value="' + esc(f.origin) + '" placeholder="Ex.: Ijuí, RS">' +
            '<ul class="combo__list" id="origin-list" role="listbox" hidden></ul></div>' +
            '<span class="hint">Cidade de partida</span><p class="field__err" hidden></p></div>' +
          '<div class="swap"><button class="iconbtn" type="button" data-action="swap" aria-label="Inverter origem e destino" title="Inverter origem e destino">' + icon("swap") + "</button></div>" +
          '<div class="field" data-field="destination"><label for="destination">Destino</label>' +
            '<div class="combo"><input class="input" id="destination" name="destination" type="text" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="destination-list" aria-autocomplete="list" value="' + esc(f.destination) + '" placeholder="Ex.: Porto Alegre, RS">' +
            '<ul class="combo__list" id="destination-list" role="listbox" hidden></ul></div>' +
            '<span class="hint">Cidade de chegada</span><p class="field__err" hidden></p></div>' +
        "</div>" +
      "</fieldset>" +
      '<fieldset class="fieldset"><legend class="label">Partida</legend>' +
        '<div class="field" data-field="departure"><label for="departure">Data e horário de saída</label>' +
          '<input class="input" id="departure" name="departure" type="datetime-local" value="' + esc(f.departure) + '">' +
          '<span class="hint">Horário local (America/Sao_Paulo). A previsão acompanha o momento em que você passa por cada trecho.</span>' +
          '<p class="field__err" hidden></p></div>' +
        '<div class="field"><label for="maxPoints">Estações ao longo da rota</label>' +
          '<div class="range"><input id="maxPoints" name="maxPoints" type="range" min="2" max="12" step="1" value="' + esc(f.maxPoints) + '" aria-describedby="mp-hint"><span class="range__val" id="mp-val">' + esc(f.maxPoints) + "</span></div>" +
          '<span class="hint" id="mp-hint">Mais estações = carta mais detalhada (2 a 12).</span></div>' +
      "</fieldset>" +
      '<button class="btn btn--primary btn--lg btn--block" type="submit">' + icon("spark") + "Calcular previsão da viagem</button>" +
      '<p class="note">A consulta localiza os lugares, traça a rota, cria as estações, consulta as fontes e calcula o risco — pode levar alguns segundos.</p>' +
      '<div style="margin-top:var(--sp-5);padding-top:var(--sp-5);border-top:1px solid var(--line)">' +
        '<span class="label">Exemplos rápidos</span><div class="quick">' +
          quick("Ijuí, RS", "Porto Alegre, RS") + quick("Passo Fundo, RS", "Caxias do Sul, RS") +
          quick("São Paulo, SP", "Rio de Janeiro, RJ") + quick("Curitiba, PR", "Florianópolis, SC") +
        "</div></div>" +
      "</form>";
  }
  function quick(o, d) {
    return '<button class="chip" type="button" data-action="example" data-o="' + esc(o) + '" data-d="' + esc(d) + '">' + esc(o.split(",")[0]) + " → " + esc(d.split(",")[0]) + "</button>";
  }
  function plannerAside() {
    return '<span class="label">O que acontece ao calcular</span>' +
      '<ol style="margin-top:var(--sp-4);display:grid;gap:14px;color:var(--ink-2)">' +
        '<li style="display:flex;gap:12px"><span class="mono dim">01</span>Geocodificação da origem e do destino.</li>' +
        '<li style="display:flex;gap:12px"><span class="mono dim">02</span>Cálculo da rota rodoviária e dos horários de passagem (ETAs).</li>' +
        '<li style="display:flex;gap:12px"><span class="mono dim">03</span>Consulta de múltiplas fontes meteorológicas por estação.</li>' +
        '<li style="display:flex;gap:12px"><span class="mono dim">04</span>Processamento de alertas e classificação de risco por trecho.</li>' +
      "</ol>" +
      '<div class="banner" style="margin-top:var(--sp-6)">' + icon("info") +
        "<div><b>Sem tempo real aqui?</b><p>Este protótipo usa dados reais capturados e simulação determinística para outros trajetos. Os estados de erro, dados ausentes e fallback são reais na interface.</p></div></div>";
  }

  /* =============================================================== PROCESSING */
  var STAGES = ["Localizando origem e destino", "Calculando rota e horários", "Consultando fontes meteorológicas", "Classificando risco e alertas"];
  function renderTrip() {
    if (state.status === "loading") return renderProcessing();
    if (state.status === "error") return renderError();
    return renderResult();
  }
  function renderProcessing() {
    var rows = STAGES.map(function (s, i) {
      var st = i < state.progStep ? "done" : i === state.progStep ? "active" : "todo";
      return '<div class="proc__step" data-state="' + st + '"><span class="proc__dot">' + (st === "done" ? icon("check") : "") + "</span>" + s + "</div>";
    }).join("");
    var skel = "";
    for (var i = 0; i < 6; i++) skel += '<div class="skel-row"><div class="skel" style="width:52px;height:14px"></div><div class="skel" style="width:40%;height:16px"></div><div class="skel" style="width:64px;height:16px;margin-inline-start:auto"></div></div>';
    return '<div class="app">' + appBar("<b>Calculando viagem</b><span>" + esc(state.form.origin) + " → " + esc(state.form.destination) + "</span>",
      '<a class="btn btn--ghost btn--sm" href="#/planejar">Cancelar</a>') +
      '<main id="main-content"><div class="container" style="padding-block:var(--sp-7)">' +
        '<div class="card"><span class="eyebrow">Processando</span><h2 style="margin:12px 0 24px">Montando a carta da sua viagem</h2>' +
          '<div style="display:grid;gap:14px">' + rows + "</div>" +
          '<p class="note" style="margin-top:22px">Isso pode levar alguns segundos: envolvemos geocodificação, roteamento, múltiplas fontes e cálculo de risco.</p></div>' +
        '<div class="card" style="margin-top:var(--sp-4)"><span class="label">Prévia da carta</span>' + skel + "</div>" +
      "</div></main>" + appFooterStub() + "</div>";
  }
  function renderError() {
    var e = state.error || { code: 0, message: "Algo deu errado." };
    var isNet = e.code === 0;
    var title = e.code === 400 ? "Não foi possível usar esses dados" : isNet ? "Não conseguimos falar com o serviço" : "Não foi possível calcular a rota";
    return '<div class="app">' + appBar("<b>Erro no cálculo</b><span>" + esc(state.form.origin) + " → " + esc(state.form.destination) + "</span>", "") +
      '<main id="main-content"><div class="container" style="padding-block:var(--sp-7)"><div class="card"><div class="state">' +
        '<div class="state__ic">' + icon(isNet ? "refresh" : "alert-triangle") + "</div>" +
        "<h3>" + title + "</h3><p class=\"muted\">" + esc(e.message) + "</p>" +
        '<p class="state__code">' + (e.code ? "HTTP " + e.code : "falha de rede") + "</p>" +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">' +
          '<button class="btn btn--primary" type="button" data-action="retry">' + icon("refresh") + "Tentar novamente</button>" +
          '<a class="btn btn--ghost" href="#/planejar">Alterar viagem</a></div>' +
      "</div></div></div></main>" + appFooterStub() + "</div>";
  }

  /* =================================================================== RESULT */
  function renderResult() {
    var trip = state.trip, s = trip.summary;
    var alerts = dedupeAlerts(trip.alerts);
    var unknownPoints = trip.timeline.filter(function (p) { return p.weather.hazard && p.weather.hazard.level === "unknown"; }).length;
    var attentionPoints = trip.timeline.filter(function (p) { var l = p.weather.hazard && p.weather.hazard.level; return l === "attention" || l === "alert" || l === "severe"; }).length;

    var banners = "";
    if (alerts.length > 0) {
      banners += '<div class="banner" style="border-color:color-mix(in srgb,var(--hazard-alert) 50%,var(--line))">' + icon("alert-octagon") +
        "<div><b>" + alerts.length + " alerta" + (alerts.length > 1 ? "s" : "") + " meteorológico" + (alerts.length > 1 ? "s" : "") + " oficial" + (alerts.length > 1 ? "is" : "") + " para a região</b>" +
        "<p>" + esc(alerts.map(function (a) { return a.event + " (" + a.severity + ")"; }).join(" · ")) + "</p>" +
        '<button class="btn btn--quiet btn--sm" type="button" data-action="alerts" style="margin-top:6px;padding-left:0">Ver detalhes e vigência ' + icon("chevron-right") + "</button></div></div>";
    }
    if (s.fallbackUsed) {
      banners += '<div class="banner">' + icon("shield") + "<div><b>Alguns trechos usaram fonte alternativa (fallback)</b><p>Uma fonte meteorológica ficou indisponível em parte do trajeto e foi substituída. As estações afetadas estão sinalizadas na carta.</p></div></div>";
    }
    if (unknownPoints > 0) {
      banners += '<div class="banner">' + icon("unknown") + "<div><b>" + unknownPoints + " estação" + (unknownPoints > 1 ? "ões" : "") + " sem dados suficientes</b><p>Nesses trechos não foi possível avaliar as condições. Ausência de dados não significa tempo seguro — trate como incerteza.</p></div></div>";
    }

    return '<div class="app app--result">' +
      appBar("<b>" + esc(s.origin.city || "Origem") + " → " + esc(s.destination.city || "Destino") + '</b><span>' + fmtNum(s.distanceKm, 1) + " km · " + fmtDur(s.durationH) + "</span>",
        '<button class="btn btn--ghost btn--sm" type="button" data-action="edit-departure">' + icon("calendar") + "Alterar saída</button>") +
      '<main id="main-content"><div class="container" style="padding-block:var(--sp-6)"><div class="result">' +
        summaryCard(trip, attentionPoints) +
        (banners ? '<div style="display:grid;gap:10px">' + banners + "</div>" : "") +
        '<div class="workspace">' +
          '<div class="col">' + mapCard(trip) + ribbonCard(trip) + attentionCard(trip) + "</div>" +
          '<div class="col">' + logCard(trip) + "</div>" +
        "</div>" +
        sourcesCard(trip) +
      "</div></div></main>" +
      appFooterStub() +
      '<div class="mobilebar">' +
        '<button class="btn btn--ghost btn--block" type="button" data-action="edit-departure">' + icon("calendar") + "Alterar saída</button>" +
        '<a class="btn btn--primary btn--block" href="#/planejar" data-action="new-trip">' + icon("plus") + "Nova viagem</a>" +
      "</div></div>";
  }

  function summaryCard(trip, attentionPoints) {
    var s = trip.summary;
    return '<section class="card" aria-labelledby="sum-title" data-od-id="summary">' +
      '<div class="summary"><div>' +
        '<h2 class="h2" id="sum-title" style="font-size:1.6rem">' + esc(s.origin.city || "Origem") + ' <span class="dim" style="font-weight:400">→</span> ' + esc(s.destination.city || "Destino") + "</h2>" +
        '<p class="note" style="margin-top:6px">Saída ' + fmtDate(s.departure) + " às " + fmtHM(s.departure) + " · " + (trip.live ? "ao vivo" : trip.real ? "amostra real capturada em 30/09/2026" : "trajeto simulado") + "</p></div>" +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + hazardBadge(s.worstHazard, { solid: true }) +
        (s.fallbackUsed ? '<span class="chip">' + icon("shield") + "fallback</span>" : "") + "</div></div>" +
      '<div class="metrics">' +
        metric("Distância", fmtNum(s.distanceKm, 1), "km") +
        metric("Duração", fmtDur(s.durationH), "") +
        metric("Chegada", fmtHM(s.arrival), "") +
        metric("Trechos a observar", String(attentionPoints), "de " + trip.timeline.length) +
      "</div>" +
      '<div id="departure-editor" hidden style="margin-top:var(--sp-5);padding-top:var(--sp-4);border-top:1px solid var(--line)">' +
        '<div class="field" style="max-width:380px"><label for="dep-edit">Novo horário de saída</label>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><input class="input" id="dep-edit" type="datetime-local" value="' + esc(isoToLocalInput(s.departure)) + '" style="flex:1;min-width:220px">' +
          '<button class="btn btn--primary" type="button" data-action="recalc">' + icon("refresh") + "Recalcular</button></div></div>" +
      "</div></section>";
  }
  function metric(lbl, val, unit) {
    return '<div class="metric"><span class="lbl">' + lbl + '</span><span class="val">' + val + (unit ? " <small>" + unit + "</small>" : "") + "</span></div>";
  }

  function mapCard(trip) {
    var real = typeof window !== "undefined" && !!window.L;
    return '<section class="card card--flush" aria-labelledby="map-title" data-od-id="map">' +
      '<div class="card__head"><span class="label" id="map-title">Rota e estações</span><span class="note">' + trip.timeline.length + " estações</span></div>" +
      (real ? realMap(trip) : mapSvg(trip)) + "</section>";
  }
  var HZCOLOR = { none: "#2e9e5b", attention: "#c99300", alert: "#d96c00", severe: "#d43a2f", unknown: "#8a8f98" };
  function realMap(trip) {
    return '<div class="map map--real">' +
      '<div id="vt-map" role="application" aria-label="Mapa real da rota"></div>' +
      '<span class="chip map__badge">' + icon("info") + "mapa real · OpenStreetMap</span>" +
      '<div class="map__legend" aria-hidden="true">' + ["none", "attention", "alert", "severe", "unknown"].map(function (l) {
        return '<span class="' + hzClass(l) + '"><i class="swatch" style="--hzc:var(--hazard-' + l + ')"></i>' + HZ[l].label + "</span>";
      }).join("") + "</div></div>";
  }
  function initRealMap(trip) {
    try {
      var el = document.getElementById("vt-map");
      if (!el || !window.L) return;
      var pts = trip.timeline.map(function (p) { return [p.latitude, p.longitude]; });
      var map = window.L.map(el);
      window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "© OpenStreetMap contributors"
      }).addTo(map);
      window.L.polyline(pts, { weight: 4, opacity: 0.85 }).addTo(map);
      trip.timeline.forEach(function (p, i) {
        var lvl = (p.weather.hazard && p.weather.hazard.level) || "unknown";
        var cond = COND[p.weather.condition] || COND.unknown;
        var label = i === 0 ? "origem" : i === trip.timeline.length - 1 ? "destino" : p.label;
        window.L.circleMarker([p.latitude, p.longitude], {
          radius: i === 0 || i === trip.timeline.length - 1 ? 9 : 7,
          color: HZCOLOR[lvl] || HZCOLOR.unknown, fillColor: HZCOLOR[lvl] || HZCOLOR.unknown,
          fillOpacity: 0.85, weight: 2
        }).addTo(map)
          .bindPopup("<b>" + esc(label) + "</b><br>" + esc(fmtHM(p.eta)) + " · " + esc(cond.label) +
            (p.weather.temperature != null ? "<br>" + temp(p.weather.temperature) + "°C" : ""));
      });
      map.fitBounds(pts, { padding: [24, 24] });
      map.attributionControl.setPrefix(false);
    } catch (e) { /* mantém o espaço do mapa; o esquemático volta no próximo render sem Leaflet */ }
  }
  function mapSvg(trip) {
    var pts = trip.timeline;
    var W = 820, Hh = 380, pad = 62;
    var lats = pts.map(function (p) { return p.latitude; }), lons = pts.map(function (p) { return p.longitude; });
    var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
    var minLon = Math.min.apply(null, lons), maxLon = Math.max.apply(null, lons);
    var spanLat = Math.max(maxLat - minLat, 0.08);
    minLat -= (spanLat - (maxLat - minLat)) / 2; maxLat += (spanLat - (maxLat - minLat)) / 2;
    var sl = Math.max(maxLon - minLon, 0.08);
    minLon -= (sl - (maxLon - minLon)) / 2; maxLon += (sl - (maxLon - minLon)) / 2;
    function X(lon) { return pad + ((lon - minLon) / (maxLon - minLon)) * (W - 2 * pad); }
    function Y(lat) { return pad + ((maxLat - lat) / (maxLat - minLat)) * (Hh - 2 * pad); }
    var xy = pts.map(function (p) { return { x: X(p.longitude), y: Y(p.latitude), p: p }; });
    var grid = "";
    for (var gx = 1; gx <= 5; gx++) { var x = pad + (gx / 6) * (W - 2 * pad); grid += '<line x1="' + x.toFixed(1) + '" y1="' + pad + '" x2="' + x.toFixed(1) + '" y2="' + (Hh - pad) + '"/>'; }
    for (var gy = 1; gy <= 3; gy++) { var y = pad + (gy / 4) * (Hh - 2 * pad); grid += '<line x1="' + pad + '" y1="' + y.toFixed(1) + '" x2="' + (W - pad) + '" y2="' + y.toFixed(1) + '"/>'; }
    var markers = xy.map(function (o, i) {
      var p = o.p, lvl = p.weather.hazard ? p.weather.hazard.level : "unknown";
      var cond = COND[p.weather.condition] || COND.unknown;
      var isEnd = i === 0 || i === pts.length - 1;
      var shape = isEnd
        ? (i === 0 ? '<rect class="pin" x="' + (o.x - 7).toFixed(1) + '" y="' + (o.y - 7).toFixed(1) + '" width="14" height="14" rx="3.5"/>'
                   : '<path class="pin" d="M' + o.x.toFixed(1) + " " + (o.y + 8).toFixed(1) + "L" + (o.x - 7).toFixed(1) + " " + (o.y - 3).toFixed(1) + "A8 8 0 1 1 " + (o.x + 7).toFixed(1) + " " + (o.y - 3).toFixed(1) + 'Z"/>')
        : '<circle class="pin" cx="' + o.x.toFixed(1) + '" cy="' + o.y.toFixed(1) + '" r="6"/>';
      var label = i === 0 ? "origem" : i === pts.length - 1 ? "destino" : "km " + Math.round(p.distanceFromStartKm);
      return '<g class="map__marker ' + hzClass(lvl) + '" tabindex="0" role="button" data-point="' + i + '" aria-current="' + (i === state.activePoint) + '" aria-label="' + esc(label + ", " + fmtHM(p.eta) + ", " + cond.label + ", risco " + HZ[lvl].label) + '">' +
        '<circle class="halo" cx="' + o.x.toFixed(1) + '" cy="' + o.y.toFixed(1) + '" r="17"/>' + shape +
        '<text class="txt" x="' + o.x.toFixed(1) + '" y="' + (o.y - 13).toFixed(1) + '" text-anchor="middle">' + esc(fmtHM(p.eta)) + "</text>" +
        "<title>" + esc(label + " · " + fmtHM(p.eta) + " · " + cond.label) + "</title></g>";
    }).join("");
    var legend = ["none", "attention", "alert", "severe", "unknown"].map(function (l) {
      return '<span class="' + hzClass(l) + '"><i class="swatch" style="--hzc:var(--hazard-' + l + ')"></i>' + HZ[l].label + "</span>";
    }).join("");
    return '<div class="map">' +
      '<svg viewBox="0 0 ' + W + " " + Hh + '" preserveAspectRatio="xMidYMid meet" role="group" aria-label="' + esc("Mapa esquemático da rota de " + (trip.summary.origin.city || "origem") + " a " + (trip.summary.destination.city || "destino")) + '">' +
        '<g class="map__grid">' + grid + "</g>" +
        '<path class="map__route" d="' + smoothPath(xy) + '"/>' + markers +
      "</svg>" +
      '<span class="chip map__badge">' + icon("info") + "mapa esquemático</span>" +
      '<div class="map__legend" aria-hidden="true">' + legend + "</div></div>";
  }
  function smoothPath(xy) {
    if (xy.length < 2) return "";
    var d = "M" + xy[0].x.toFixed(1) + " " + xy[0].y.toFixed(1);
    for (var i = 0; i < xy.length - 1; i++) {
      var p0 = xy[i - 1] || xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] || p2;
      d += "C" + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + " " + (p1.y + (p2.y - p0.y) / 6).toFixed(1) + " " +
        (p2.x - (p3.x - p1.x) / 6).toFixed(1) + " " + (p2.y - (p3.y - p1.y) / 6).toFixed(1) + " " + p2.x.toFixed(1) + " " + p2.y.toFixed(1);
    }
    return d;
  }

  function ribbonCard(trip) {
    var pts = trip.timeline, total = pts[pts.length - 1].distanceFromStartKm || 1, segs = "";
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1];
      var lvl = (HZ[a.weather.hazard.level].rank >= HZ[b.weather.hazard.level].rank) ? a.weather.hazard.level : b.weather.hazard.level;
      var w = Math.max(b.distanceFromStartKm - a.distanceFromStartKm, total * 0.02);
      segs += '<div class="ribbon__seg ' + hzClass(lvl) + '" style="flex:' + w + ';--hzc:var(--hazard-' + lvl + ')" title="km ' + Math.round(a.distanceFromStartKm) + "–" + Math.round(b.distanceFromStartKm) + ": " + HZ[lvl].label + '"></div>';
    }
    return '<section class="card" data-od-id="ribbon"><span class="label">Risco ao longo da distância</span>' +
      '<div style="margin-top:var(--sp-4)"><div class="ribbon__bar">' + segs + "</div>" +
      '<div class="ribbon__scale"><span>0 km</span><span>' + Math.round(total / 2) + ' km</span><span>' + Math.round(total) + " km</span></div></div>" +
      '<p class="note" style="margin-top:12px">Cada faixa é o risco predominante entre duas estações consecutivas.</p></section>';
  }

  function attentionCard(trip) {
    var flagged = trip.timeline.map(function (p, i) { return { p: p, i: i }; })
      .filter(function (o) { return o.p.weather.hazard && HZ[o.p.weather.hazard.level].rank >= 2; });
    var body;
    if (!flagged.length) {
      body = '<div class="empty">' + icon("check") + "<p>Nenhum trecho foi classificado com atenção, alerta ou severo com os dados disponíveis.</p></div>";
    } else {
      body = flagged.map(function (o) {
        var p = o.p, lvl = p.weather.hazard.level;
        var name = o.i === 0 ? (trip.summary.origin.city || "Origem") : o.i === trip.timeline.length - 1 ? (trip.summary.destination.city || "Destino") : p.label;
        return '<button class="attention__row ' + hzClass(lvl) + '" style="--hzc:var(--hazard-' + lvl + ')" type="button" data-point="' + o.i + '">' +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' + hazardBadge(lvl) +
          '<b style="font-size:.98rem">' + esc(name) + '</b><span class="mono dim" style="font-size:12px">' + esc(fmtHM(p.eta)) + " · km " + Math.round(p.distanceFromStartKm) + "</span></div>" +
          '<div class="station__reasons">' + (p.weather.hazard.reasons.length ? uniq(p.weather.hazard.reasons).slice(0, 3).map(function (r) { return '<span class="reason">' + esc(r) + "</span>"; }).join("") : '<span class="reason">motivos não informados</span>') + "</div></button>";
      }).join("");
    }
    return '<section class="card" data-od-id="attention"><span class="label">Trechos que merecem atenção</span><div style="margin-top:var(--sp-4)">' + body + "</div></section>";
  }

  function logCard(trip) {
    return '<section class="card" data-od-id="log"><div class="card__head" style="padding:0 0 var(--sp-4);border-bottom:0"><span class="label">Carta da rota</span><span class="note">' + trip.timeline.length + " estações · ordem cronológica</span></div>" + logMarkup(trip, {}) + "</section>";
  }
  function logMarkup(trip, opts) {
    opts = opts || {};
    var items = trip.timeline.map(function (p, i) {
      var w = p.weather, lvl = w.hazard ? w.hazard.level : "unknown", cond = COND[w.condition] || COND.unknown;
      var name = i === 0 ? (trip.summary.origin.city || "Origem") : i === trip.timeline.length - 1 ? (trip.summary.destination.city || "Destino") : p.label;
      var meta =
        chip("droplet", (w.precipitation && w.precipitation.probability != null ? w.precipitation.probability + "% chuva" : "chuva n/d")) +
        chip("wind", (w.wind && w.wind.gust != null ? "rajadas " + Math.round(w.wind.gust) + " km/h" : w.wind && w.wind.speed != null ? "vento " + Math.round(w.wind.speed) + " km/h" : "vento n/d")) +
        (w.precipitation && w.precipitation.amount > 0 ? chip("rain", fmtNum(w.precipitation.amount, 1) + " mm") : "");
      return '<div class="log__row ' + hzClass(lvl) + '" style="--hzc:var(--hazard-' + lvl + ')">' +
        '<div class="log__time"><b>' + fmtHM(p.eta) + "</b><span>km " + Math.round(p.distanceFromStartKm) + "</span></div>" +
        '<div class="log__rail"><span class="log__node"></span>' +
          '<button class="station" type="button" data-point="' + i + '" aria-current="' + (i === state.activePoint) + '" aria-label="' + esc(name + ", " + fmtHM(p.eta) + ", " + cond.label + ", " + HZ[lvl].label + ". Ver detalhes.") + '">' +
            "<div>" +
              '<div class="station__top">' + hazardBadge(lvl) +
                '<span class="station__name"><b>' + esc(name) + "</b><span>" + esc(cond.label) + "</span></span></div>" +
              '<div class="station__meta">' + meta +
                (w.nearbyObservation ? '<span class="chip">' + icon("eye") + "obs. real próxima</span>" : "") +
                (w.source.fallback ? '<span class="chip">' + icon("shield") + "fonte alt.</span>" : "") + "</div>" +
              (w.hazard && w.hazard.reasons.length ? '<div class="station__reasons">' + uniq(w.hazard.reasons).slice(0, 2).map(function (r) { return '<span class="reason">' + esc(r) + "</span>"; }).join("") + "</div>" : "") +
            "</div>" +
            '<div class="station__right">' + stationGlyph(w, 54) +
              '<div class="station__temp">' + (w.temperature == null ? '<span class="nd">n/d</span>' : temp(w.temperature) + "<small>°</small>") + "</div></div>" +
          "</button></div></div>";
    }).join("");
    return '<div class="log"' + (opts.compact ? ' style="padding:var(--sp-3) var(--sp-4)"' : ' style="padding-top:2px"') + ">" + items + "</div>";
  }
  function chip(ic, t) { return '<span class="chip">' + icon(ic) + t + "</span>"; }

  function sourcesCard(trip) {
    var rows = (trip.sources || []).map(function (s) {
      return "<li>" + icon("source") + " " + esc(s.institution || s.provider) + ' <span class="dim">· ' + esc(s.provider) + (s.model ? " / " + esc(s.model) : "") + (s.fallback ? " · fallback" : "") + (s.resolutionKm ? " · ~" + s.resolutionKm + " km" : "") + "</span></li>";
    }).join("");
    return '<section class="card" data-od-id="sources"><details class="prov"><summary>' + icon("chevron-right") + "Fontes e transparência dos dados</summary>" +
      '<ul class="tail" style="margin-top:var(--sp-4)">' + rows + "</ul>" +
      '<p class="note" style="margin-top:12px">Previsão e observação são mantidas separadas; probabilidades ausentes permanecem nulas (nunca derivadas). Alertas vêm do INMET. Este é um protótipo: estações intermediárias não trazem observação municipal.</p>' +
      "</details></section>";
  }

  function dedupeAlerts(alerts) {
    var seen = {}, out = [];
    (alerts || []).forEach(function (a) {
      var k = a.event + "|" + a.severity + "|" + (a.startsAt || "");
      if (!seen[k]) { seen[k] = 1; out.push(a); }
    });
    return out;
  }

  /* =================================================================== DRAWER */
  function buildDrawer() {
    var existing = document.getElementById("vt-drawer-root");
    if (existing) existing.parentNode.removeChild(existing);
    if (!state.trip || state.activePoint < 0) return;
    var p = state.trip.timeline[state.activePoint];
    var root = document.createElement("div");
    root.id = "vt-drawer-root";
    root.innerHTML = drawerHTML(state.trip, p, state.activePoint);
    document.body.appendChild(root);
    requestAnimationFrame(function () {
      var sc = root.querySelector(".scrim"), dr = root.querySelector(".drawer");
      if (sc) sc.setAttribute("data-open", "true");
      if (dr) dr.setAttribute("data-open", "true");
    });
  }
  function closeDrawer() {
    var root = document.getElementById("vt-drawer-root");
    if (!root) { state.activePoint = -1; render(); return; }
    var sc = root.querySelector(".scrim"), dr = root.querySelector(".drawer");
    if (sc) sc.setAttribute("data-open", "false");
    if (dr) dr.setAttribute("data-open", "false");
    setTimeout(function () { state.activePoint = -1; render(); var m = document.getElementById("main-content"); if (m) m.focus(); }, 240);
  }
  function drawerHTML(trip, p, idx) {
    var w = p.weather, lvl = w.hazard ? w.hazard.level : "unknown", cond = COND[w.condition] || COND.unknown;
    var name = idx === 0 ? (trip.summary.origin.city || "Origem") : idx === trip.timeline.length - 1 ? (trip.summary.destination.city || "Destino") : p.label;
    var reasons = w.hazard && w.hazard.reasons.length ? '<div class="station__reasons" style="margin-top:10px">' + uniq(w.hazard.reasons).map(function (r) { return '<span class="reason">' + esc(r) + "</span>"; }).join("") + "</div>" : "";
    var gapNote = w.hazard && w.hazard.dataGap ? '<div class="banner" style="margin-top:10px">' + icon("unknown") + "<div><b>Dados insuficientes para avaliar com segurança</b><p>Faltam campos críticos nesta estação. Ausência de dados não significa condição segura.</p></div></div>" : "";

    function cell(ic, label, value, unit) {
      return '<div class="kv__cell"><dt>' + icon(ic) + label + "</dt><dd>" + (value == null ? '<span class="dim">n/d</span>' : value + (unit ? " <small>" + unit + "</small>" : "")) + "</dd></div>";
    }
    var pr = w.precipitation || {}, wind = w.wind || {};
    var kv = '<dl class="kv">' +
      cell("thermometer", "Temp.", temp(w.temperature), "°C") +
      cell("thermometer", "Sensação", temp(w.feelsLike), "°C") +
      cell("droplet", "Chuva", pr.probability == null ? null : pr.probability, "%") +
      cell("droplet", "Precip.", pr.amount == null ? null : fmtNum(pr.amount, 1), "mm") +
      cell("wind", "Vento", wind.speed == null ? null : Math.round(wind.speed), "km/h") +
      cell("wind", "Rajadas", wind.gust == null ? null : Math.round(wind.gust), "km/h") +
      cell("compass", "Direção", wind.direction == null ? null : Math.round(wind.direction), "°") +
      cell("eye", "Visibilidade", w.visibility == null ? null : (w.visibility >= 1000 ? fmtNum(w.visibility / 1000, 1) : w.visibility), w.visibility == null ? "" : (w.visibility >= 1000 ? "km" : "m")) +
      cell("thermometer", "Umidade", w.humidity == null ? null : w.humidity, "%") +
      cell("cloud", "Nebulosidade", w.cloudCover == null ? null : w.cloudCover, "%") +
      "</dl>";

    var obs = "";
    if (w.nearbyObservation) {
      var o = w.nearbyObservation;
      obs = '<div class="obs"><span class="obs__tag">' + icon("eye") + "Observação real próxima</span>" +
        "<p style=\"margin-top:8px\">Estação <b>" + esc(o.stationName || o.stationCode) + "</b> a " + fmtNum(o.distanceKm, 1) + " km desta estação registrou:</p>" +
        '<div class="obs__grid">' +
          obsCell(o.temperatureC == null ? "n/d" : temp(o.temperatureC) + "°C", "temperatura") +
          obsCell(o.windSpeedKmh == null ? "n/d" : Math.round(o.windSpeedKmh) + " km/h", "vento") +
          obsCell(o.windGustKmh == null ? "n/d" : Math.round(o.windGustKmh) + " km/h", "rajada") +
          obsCell(o.humidityPct == null ? "n/d" : o.humidityPct + "%", "umidade") +
          obsCell(o.ageMinutes == null ? "—" : "há " + o.ageMinutes + " min", "medição") +
        "</div>" +
        '<p class="note" style="margin-top:10px">É uma medição em um ponto próximo — não a previsão exata deste trecho.</p></div>';
    }

    var alerts = "";
    var pa = dedupeAlerts(w.alerts);
    if (pa.length) {
      alerts = pa.map(function (a) {
        return '<div class="alert-item"><div class="alert-item__top">' + icon("alert-octagon") + "<b>" + esc(a.event) + '</b><span class="sev dim">' + esc(a.severity) + "</span></div>" +
          (a.headline ? '<span class="note">' + esc(a.headline) + "</span>" : "") +
          '<span class="when">' + esc(a.startsAt || "—") + " → " + esc(a.endsAt || "—") + "</span>" +
          '<span class="note">' + esc(a.source) + "</span></div>";
      }).join("");
      alerts = '<div><span class="label">Alertas para esta estação</span><div style="display:grid;gap:10px;margin-top:8px">' + alerts + "</div></div>";
    }

    var s = w.source;
    var prov = '<details class="prov"><summary>' + icon("chevron-right") + "Proveniência e qualidade dos dados</summary>" +
      '<dl class="prov__grid">' +
        provRow("Instituição", s.institution || "—") + provRow("Provider", s.provider) + provRow("Modelo", s.model || "—") +
        provRow("Rodada", s.run || "—") + provRow("Interpolação", s.interpolation || "—") +
        provRow("Resolução", s.resolutionKm ? s.resolutionKm + " km" : "—") +
        provRow("Fallback", s.fallback ? "sim (" + (s.fallbackChain || []).join(" → ") + ")" : "não") +
        provRow("Completude", Math.round((w.quality.completeness || 0) * 100) + "%") +
        (w.quality.missingFields && w.quality.missingFields.length ? provRow("Campos ausentes", w.quality.missingFields.join(", ")) : "") +
        provRow("Timestep", w.forecastTime ? fmtDate(w.forecastTime) + " " + fmtHM(w.forecastTime) : "—") +
      "</dl></details>";

    return '<div class="scrim" data-open="false" data-action="close-drawer"></div>' +
      '<aside class="drawer" data-open="false" role="dialog" aria-modal="true" aria-label="Detalhes de ' + esc(name) + '">' +
        '<div class="drawer__head">' + stationGlyph(w, 40) +
          '<div style="flex:1;min-width:0"><h3>' + esc(name) + "</h3>" +
          '<span class="sub">' + fmtHM(p.eta) + " · km " + Math.round(p.distanceFromStartKm) + " · " + esc(cond.label) + "</span></div>" +
          '<button class="iconbtn" type="button" data-action="close-drawer" aria-label="Fechar detalhes">' + icon("close") + "</button></div>" +
        '<div class="drawer__body">' +
          '<div><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' + hazardBadge(lvl, { solid: true }) +
            (w.temperature != null ? '<span class="drawer__big">' + temp(w.temperature) + "<small>°C</small></span>" : "") + "</div>" + reasons + gapNote + "</div>" +
          alerts +
          "<div>" + kv + "</div>" +
          obs + prov +
        "</div></aside>";
  }
  function obsCell(v, l) { return "<div><b>" + v + "</b><span>" + l + "</span></div>"; }
  function provRow(k, v) { return '<div class="prov__row"><dt>' + k + "</dt><dd>" + esc(v) + "</dd></div>"; }

  function appFooterStub() {
    return '<footer class="appfoot"><div class="container appfoot__in">' +
      "<span>ViaTempo · fontes: Open-Meteo · INMET · CPTEC/INPE · OSRM</span>" +
      '<span class="appfoot__src"><span>' + icon("source") + "Open-Meteo</span><span>" + icon("source") + "INMET</span><span>" + icon("source") + "CPTEC/INPE</span><span>" + icon("route") + "OSRM</span></span>" +
      "</div></footer>";
  }

  /* =================================================================== EVENTOS */
  function startTrips() {
    var f = state.form;
    state.status = "loading"; state.progStep = 0;
    go("#/viagem");
    var timers = [
      setTimeout(function () { state.progStep = 1; patchProgress(); }, 600),
      setTimeout(function () { state.progStep = 2; patchProgress(); }, 1200),
      setTimeout(function () { state.progStep = 3; patchProgress(); }, 1800)
    ];
    VT.forecast({ origin: f.origin, destination: f.destination, departure: localInputToIso(f.departure), maxPoints: f.maxPoints })
      .then(function (trip) {
        timers.forEach(clearTimeout);
        state.trip = trip; state.status = "ready"; state.activePoint = -1; render();
      })
      .catch(function (err) {
        timers.forEach(clearTimeout);
        state.error = { code: err && err.code ? err.code : 0, message: (err && err.message) || "Falha ao calcular a viagem." };
        state.status = "error"; render();
      });
  }
  function patchProgress() {
    document.querySelectorAll(".proc__step").forEach(function (el, i) {
      var st = i < state.progStep ? "done" : i === state.progStep ? "active" : "todo";
      el.setAttribute("data-state", st);
      el.querySelector(".proc__dot").innerHTML = st === "done" ? icon("check") : "";
    });
  }
  function clearFieldError(field) {
    var wrap = document.querySelector('[data-field="' + field + '"]');
    if (!wrap) return;
    var err = wrap.querySelector(".field__err"); if (err) { err.hidden = true; err.textContent = ""; }
    var inp = wrap.querySelector(".input"); if (inp) inp.removeAttribute("aria-invalid");
  }
  function setFieldError(field, msg) {
    var wrap = document.querySelector('[data-field="' + field + '"]');
    if (!wrap) return false;
    var err = wrap.querySelector(".field__err");
    if (err) { err.hidden = false; err.innerHTML = icon("alert-triangle") + esc(msg); }
    var inp = wrap.querySelector(".input"); if (inp) inp.setAttribute("aria-invalid", "true");
    return true;
  }
  function validate() {
    var f = state.form, ok = true;
    clearFieldError("origin"); clearFieldError("destination"); clearFieldError("departure");
    if (!f.origin.trim()) { setFieldError("origin", "Informe a origem."); ok = false; }
    if (!f.destination.trim()) { setFieldError("destination", "Informe o destino."); ok = false; }
    if (!f.departure) { setFieldError("departure", "Escolha data e horário de saída."); ok = false; }
    else if (Date.parse(localInputToIso(f.departure)) < Date.now() - 365 * 86400000) { setFieldError("departure", "Data de saída inválida."); ok = false; }
    return ok;
  }
  function bindPlanner() {
    var form = document.getElementById("trip-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      state.form.origin = document.getElementById("origin").value;
      state.form.destination = document.getElementById("destination").value;
      state.form.departure = document.getElementById("departure").value;
      if (!validate()) { var bad = document.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
      startTrips();
    });
    ["origin", "destination", "departure"].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener("input", function () { state.form[id] = el.value; clearFieldError(id); });
    });
    var mp = document.getElementById("maxPoints");
    if (mp) mp.addEventListener("input", function () { state.form.maxPoints = Number(mp.value); var v = document.getElementById("mp-val"); if (v) v.textContent = mp.value; });
    bindCombos();
  }
  function comboMatches(q) {
    var qq = H.deaccent(q);
    if (!qq) return VT.CITIES.slice(0, 8);
    return VT.CITIES.filter(function (c) { return H.deaccent(c.name).indexOf(qq) >= 0; }).slice(0, 8);
  }
  function highlight(name, q) {
    var qq = H.deaccent(q), n = H.deaccent(name), i = n.indexOf(qq);
    if (i < 0 || !qq) return esc(name);
    return esc(name.slice(0, i)) + "<mark>" + esc(name.slice(i, i + qq.length)) + "</mark>" + esc(name.slice(i + qq.length));
  }
  function bindCombos() {
    ["origin", "destination"].forEach(function (id) {
      var input = document.getElementById(id), list = document.getElementById(id + "-list");
      if (!input || !list) return;
      var active = -1;
      function open() {
        var items = comboMatches(input.value);
        if (!items.length) { closeList(); return; }
        list.innerHTML = items.map(function (c, i) {
          return '<li class="combo__opt" role="option" id="' + id + "-opt-" + i + '" aria-selected="' + (i === active) + '" data-value="' + esc(c.name + ", " + c.uf) + '">' + highlight(c.name, input.value) + "<small>" + esc(c.uf) + "</small></li>";
        }).join("");
        list.hidden = false; input.setAttribute("aria-expanded", "true");
        input.setAttribute("aria-activedescendant", active >= 0 ? id + "-opt-" + active : "");
      }
      function closeList() { list.hidden = true; list.innerHTML = ""; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; }
      function choose(i) { var items = comboMatches(input.value); if (!items[i]) return; input.value = items[i].name + ", " + items[i].uf; state.form[id] = input.value; closeList(); clearFieldError(id); input.focus(); }
      input.addEventListener("input", function () { active = -1; open(); });
      input.addEventListener("focus", function () { open(); });
      input.addEventListener("keydown", function (e) {
        var items = comboMatches(input.value);
        if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, items.length - 1); open(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); open(); }
        else if (e.key === "Enter") { if (!list.hidden && active >= 0) { e.preventDefault(); choose(active); } }
        else if (e.key === "Escape") { closeList(); }
      });
      input.addEventListener("blur", function () { setTimeout(closeList, 160); });
      list.addEventListener("mousedown", function (e) {
        var opt = e.target.closest(".combo__opt"); if (!opt) return;
        e.preventDefault();
        choose(Array.prototype.indexOf.call(list.children, opt));
      });
    });
  }
  function bindActions() {
    document.addEventListener("click", function (e) {
      var sc = e.target.closest("[data-scroll]");
      if (sc) {
        e.preventDefault();
        var target = sc.getAttribute("data-scroll");
        if (state.route !== "landing") { go("#/"); setTimeout(function () { scrollToId(target); }, 90); }
        else scrollToId(target);
        return;
      }
      var t = e.target.closest("[data-action]");
      if (t) {
        var a = t.getAttribute("data-action");
        if (a === "theme") { toggleTheme(); return; }
        if (a === "swap") { var o = state.form.origin; state.form.origin = state.form.destination; state.form.destination = o; var oi = document.getElementById("origin"), di = document.getElementById("destination"); if (oi) oi.value = state.form.origin; if (di) di.value = state.form.destination; flash("Origem e destino invertidos"); return; }
        if (a === "example") { state.form.origin = t.getAttribute("data-o"); state.form.destination = t.getAttribute("data-d"); var oi2 = document.getElementById("origin"), di2 = document.getElementById("destination"); if (oi2) oi2.value = state.form.origin; if (di2) di2.value = state.form.destination; if (state.route !== "planner") go("#/planejar"); else startTrips(); return; }
        if (a === "retry") { startTrips(); return; }
        if (a === "new-trip") { state.trip = null; state.status = "idle"; state.activePoint = -1; return; }
        if (a === "edit-departure") { var ed = document.getElementById("departure-editor"); if (ed) { ed.hidden = !ed.hidden; if (!ed.hidden) { var inp = document.getElementById("dep-edit"); if (inp) inp.focus(); } } return; }
        if (a === "recalc") { var inp2 = document.getElementById("dep-edit"); if (inp2 && inp2.value) { state.form.origin = state.trip.summary.origin.city ? (state.trip.summary.origin.city + ", " + state.trip.summary.origin.uf) : state.form.origin; state.form.destination = state.trip.summary.destination.city ? (state.trip.summary.destination.city + ", " + state.trip.summary.destination.uf) : state.form.destination; state.form.departure = inp2.value; startTrips(); } return; }
        if (a === "close-drawer") { closeDrawer(); return; }
        if (a === "alerts") { state.activePoint = firstAlertPoint(); if (state.activePoint >= 0) openPoint(state.activePoint); return; }
      }
      var pt = e.target.closest("[data-point]");
      if (pt) openPoint(Number(pt.getAttribute("data-point")));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.activePoint >= 0) closeDrawer();
      var pt = e.target.closest && e.target.closest("[data-point]");
      if (pt && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openPoint(Number(pt.getAttribute("data-point"))); }
    });
    window.addEventListener("hashchange", render);
    window.addEventListener("scroll", function () { if (state.route === "landing") requestMood(); }, { passive: true });
  }
  function firstAlertPoint() {
    if (!state.trip) return -1;
    for (var i = 0; i < state.trip.timeline.length; i++) { if (state.trip.timeline[i].weather.alerts && state.trip.timeline[i].weather.alerts.length) return i; }
    return -1;
  }
  function openPoint(i) {
    if (!state.trip || !state.trip.timeline[i]) return;
    state.activePoint = i;
    document.querySelectorAll("[data-point]").forEach(function (el) { el.setAttribute("aria-current", Number(el.getAttribute("data-point")) === i ? "true" : "false"); });
    buildDrawer();
    var dr = document.querySelector(".drawer");
    if (dr) { var btn = dr.querySelector('[data-action="close-drawer"]'); if (btn) setTimeout(function () { btn.focus(); }, 60); }
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme") || "dark";
    var next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("vt-theme", next); } catch (e) {}
    showToast("Tema " + (next === "dark" ? "escuro" : "claro"));
  }
  function flash(msg) { showToast(msg); }
  var toastTimer = null;
  function showToast(msg) {
    var el = document.getElementById("vt-toast");
    if (!el) { el = document.createElement("div"); el.id = "vt-toast"; el.className = "toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
    el.textContent = msg; el.setAttribute("data-open", "true");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.setAttribute("data-open", "false"); }, 2200);
  }

  /* ======================================================================= INIT */
  function init() {
    buildSprite();
    initScene();
    bindActions();
    if (!location.hash) location.replace("#/");
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
