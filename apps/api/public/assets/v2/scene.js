/* ============================================================================
   ViaTempo — "Estrada Viva" · motor de cena atmosférica
   Canvas 2D puro. Sem dependências, sem rede, sem assets externos.
   Pinta um céu que muda com o clima, a estrada em perspectiva e os veículos
   (carro, moto, caminhão) que a percorrem. Exposto como window.VTScene.
   Respeita prefers-reduced-motion e pausa quando a aba/canvas sai de vista.
   ========================================================================== */
(function () {
  "use strict";

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hex(h) {
    h = String(h).replace("#", "");
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mix(a, b, t) {
    return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
  }
  function css(c, a) {
    return a == null ? "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"
                     : "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function dark(c, k) { return [Math.round(c[0] * (1 - k)), Math.round(c[1] * (1 - k)), Math.round(c[2] * (1 - k))]; }
  function lighten(c, k) { return [Math.round(lerp(c[0], 255, k)), Math.round(lerp(c[1], 255, k)), Math.round(lerp(c[2], 255, k))]; }

  /* ------------------------------------------------------------------ climas */
  /* Cada clima é um "look" completo: céu, astro, nuvens, precipitação, vento,
     névoa, gelo, noite, calor, pista molhada e os veículos presentes. */
  var MOODS = {
    amanhecer: { sky: ["#1f3a6e", "#5b6fa8", "#e79a6b", "#ffd9a0"], horizon: 0.60, sun: { x: 0.80, y: 0.58, col: "#ffd9a0" }, stars: 0.15, clouds: 0.42, cloudCol: "#f0b98f", cloudSpeed: 0.35, cloudY: 0.52, precip: null, precipI: 0, wind: 0.2, fog: 0.30, lightning: 0, heat: 0, wet: 0.12, ice: 0, night: 0.25, rays: 1, vehicles: ["car", "truck"] },
    manha:     { sky: ["#1d4f9c", "#3f83d1", "#8fc3ec", "#dff0fb"], horizon: 0.58, sun: { x: 0.20, y: 0.32, col: "#fff2c8" }, stars: 0, clouds: 0.22, cloudCol: "#ffffff", cloudSpeed: 0.55, cloudY: 0.38, precip: null, precipI: 0, wind: 0.15, fog: 0.08, lightning: 0, heat: 0, wet: 0, ice: 0, night: 0, rays: 1, vehicles: ["car", "moto", "truck"] },
    calor:     { sky: ["#2a63ae", "#63a3dd", "#bcdfef", "#fff3cf"], horizon: 0.60, sun: { x: 0.50, y: 0.20, col: "#fff6d0" }, stars: 0, clouds: 0.14, cloudCol: "#fff8ea", cloudSpeed: 0.35, cloudY: 0.30, precip: null, precipI: 0, wind: 0.10, fog: 0.18, lightning: 0, heat: 0.95, wet: 0, ice: 0, night: 0, rays: 1, vehicles: ["car", "moto", "truck"] },
    nublado:   { sky: ["#5c7186", "#8399ab", "#aebdca", "#d3dde4"], horizon: 0.56, sun: null, stars: 0, clouds: 0.85, cloudCol: "#cfd8e0", cloudSpeed: 0.6, cloudY: 0.42, precip: null, precipI: 0, wind: 0.35, fog: 0.36, lightning: 0, heat: 0, wet: 0.08, ice: 0, night: 0.05, rays: 0, vehicles: ["car", "truck"] },
    chuva:     { sky: ["#2b3b52", "#41526b", "#5f7288", "#8698a8"], horizon: 0.55, sun: null, stars: 0, clouds: 0.9, cloudCol: "#6d7c8d", cloudSpeed: 0.75, cloudY: 0.40, precip: "rain", precipI: 0.55, wind: 0.45, fog: 0.42, lightning: 0.05, heat: 0, wet: 0.85, ice: 0, night: 0.2, rays: 0, vehicles: ["car", "truck"] },
    tempestade:{ sky: ["#0e1626", "#1b2740", "#2b3a58", "#435878"], horizon: 0.55, sun: null, stars: 0, clouds: 1, cloudCol: "#3a4763", cloudSpeed: 1.0, cloudY: 0.34, precip: "heavy", precipI: 0.95, wind: 0.8, fog: 0.45, lightning: 1, heat: 0, wet: 1, ice: 0, night: 0.45, rays: 0, vehicles: ["car", "truck"] },
    vendaval:  { sky: ["#26333f", "#3a4a58", "#586a76", "#7e8c94"], horizon: 0.58, sun: null, stars: 0.05, clouds: 0.95, cloudCol: "#5b6a76", cloudSpeed: 1.35, cloudY: 0.40, precip: "rain", precipI: 0.35, wind: 1, fog: 0.30, lightning: 0.15, heat: 0, wet: 0.6, ice: 0, night: 0.3, rays: 0, vehicles: ["truck"] },
    gelo:      { sky: ["#4a5f70", "#7d95a6", "#b6c8d3", "#e6f1f6"], horizon: 0.56, sun: null, stars: 0, clouds: 0.7, cloudCol: "#dbe7ee", cloudSpeed: 0.4, cloudY: 0.42, precip: "snow", precipI: 0.55, wind: 0.3, fog: 0.55, lightning: 0, heat: 0, wet: 0.3, ice: 1, night: 0.1, rays: 0, vehicles: ["car", "truck"] },
    crepusculo:{ sky: ["#101a3a", "#3a3560", "#8a4f72", "#e98a5b"], horizon: 0.60, sun: { x: 0.24, y: 0.60, col: "#ffb27a" }, stars: 0.35, clouds: 0.4, cloudCol: "#c98a86", cloudSpeed: 0.4, cloudY: 0.50, precip: null, precipI: 0, wind: 0.25, fog: 0.26, lightning: 0, heat: 0, wet: 0.15, ice: 0, night: 0.5, rays: 1, vehicles: ["car", "moto", "truck"] },
    noite:     { sky: ["#050912", "#0c1526", "#16233a", "#26374f"], horizon: 0.58, sun: null, moon: true, stars: 0.9, clouds: 0.35, cloudCol: "#2a3a52", cloudSpeed: 0.3, cloudY: 0.38, precip: null, precipI: 0, wind: 0.2, fog: 0.20, lightning: 0, heat: 0, wet: 0.35, ice: 0, night: 1, rays: 0, vehicles: ["car", "truck"] }
  };

  function resolve(m) {
    var o = {};
    for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k)) o[k] = m[k];
    o.sky = m.sky.map(hex);
    o.cloudCol = hex(m.cloudCol);
    o.sunCol = m.sun ? hex(m.sun.col) : [255, 255, 255];
    o.sun = m.sun ? { x: m.sun.x, y: m.sun.y } : null;
    o.moon = !!m.moon;
    o.rays = m.rays || 0;
    o.vehicles = m.vehicles || [];
    return o;
  }

  function lerpLook(a, b, t) {
    return {
      sky: [mix(a.sky[0], b.sky[0], t), mix(a.sky[1], b.sky[1], t), mix(a.sky[2], b.sky[2], t), mix(a.sky[3], b.sky[3], t)],
      horizon: lerp(a.horizon, b.horizon, t),
      sunCol: mix(a.sunCol, b.sunCol, t),
      sun: b.sun ? { x: lerp(a.sun ? a.sun.x : b.sun.x, b.sun.x, t), y: lerp(a.sun ? a.sun.y : b.sun.y, b.sun.y, t) } : a.sun,
      moon: b.moon, stars: lerp(a.stars, b.stars, t),
      clouds: lerp(a.clouds, b.clouds, t), cloudCol: mix(a.cloudCol, b.cloudCol, t),
      cloudSpeed: lerp(a.cloudSpeed, b.cloudSpeed, t), cloudY: lerp(a.cloudY, b.cloudY, t),
      precipI: lerp(a.precipI, b.precipI, t), precip: t > 0.5 ? b.precip : a.precip,
      wind: lerp(a.wind, b.wind, t), fog: lerp(a.fog, b.fog, t),
      lightning: lerp(a.lightning, b.lightning, t), heat: lerp(a.heat, b.heat, t),
      wet: lerp(a.wet, b.wet, t), ice: lerp(a.ice, b.ice, t), night: lerp(a.night, b.night, t),
      rays: lerp(a.rays, b.rays, t), vehicles: t > 0.5 ? b.vehicles : a.vehicles
    };
  }

  /* ------------------------------------------------------------------- cena */
  function create(canvas) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var from = resolve(MOODS.manha), to = from, look = from;
    var tMix = 1, mixSpeed = 0.055;
    var raf = 0, running = false, visible = true, destroyed = false;
    var t = 0;

    var stars = [], clouds = [], hillsA = [], hillsB = [], poles = [];
    var drops = [], flakes = [], traffic = [], flash = 0, bolt = null, boltT = 0;
    var roadScroll = 0;

    var r = rng(20260930);

    function buildWorld() {
      var i;
      stars = [];
      for (i = 0; i < 160; i++) stars.push({ x: r(), y: r() * 0.6, s: 0.4 + r() * 1.5, tw: r() * 6.28 });
      clouds = [];
      for (i = 0; i < 26; i++) {
        var puffs = [];
        var n = 3 + Math.floor(r() * 4);
        for (var j = 0; j < n; j++) puffs.push({ dx: (r() - 0.5) * 1.6, dy: (r() - 0.5) * 0.42, s: 0.5 + r() * 0.9 });
        clouds.push({ x: r(), y: 0.06 + r() * 0.5, s: 0.5 + r() * 1.3, spd: 0.6 + r() * 0.9, a: 0.5 + r() * 0.5, puffs: puffs });
      }
      hillsA = []; hillsB = [];
      for (i = 0; i <= 48; i++) {
        hillsA.push(0.35 * Math.sin(i * 0.5) + 0.2 * Math.sin(i * 1.7 + 1) + r() * 0.12);
        hillsB.push(0.5 * Math.sin(i * 0.34 + 2) + 0.16 * Math.sin(i * 2.1) + r() * 0.08);
      }
      poles = [];
      for (i = 0; i < 9; i++) poles.push({ p: i / 9, side: 1 });
      traffic = [];
      var types = ["car", "truck", "moto", "car", "truck"];
      for (i = 0; i < 6; i++) traffic.push(newVehicle(types[i % types.length], (i % 3) === 0 ? 1 : -1, r()));
    }
    function newVehicle(type, dir, p) {
      return { type: type, dir: dir, p: p, lane: dir > 0 ? (0.06 + r() * 0.2) : (-0.06 - r() * 0.2), spd: (type === "truck" ? 0.010 : 0.022) * (0.8 + r() * 0.6) };
    }

    function edgeAt(y, hy) {
      var k = clamp((y - hy) / Math.max(1, H - hy), 0, 1);
      var e = Math.pow(k, 0.72);
      return { l: lerp(0.470, 0.05, e) * W, r: lerp(0.530, 0.95, e) * W };
    }
    function centerAt(y, hy) {
      var e = edgeAt(y, hy), c = (e.l + e.r) / 2, w = (e.r - e.l);
      return function (lane) { return c + lane * w * 0.5; };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      roadScroll = 0;
      if (reduce) draw(0);
    }

    /* -------------------------------------------------------------- desenho */
    function draw(now) {
      if (!W || !H) return;
      t += 1 / 60;
      var m = look;
      var hy = H * m.horizon;

      var g = ctx.createLinearGradient(0, 0, 0, hy + 6);
      g.addColorStop(0, css(m.sky[0]));
      g.addColorStop(0.42, css(m.sky[1]));
      g.addColorStop(0.74, css(m.sky[2]));
      g.addColorStop(1, css(m.sky[3]));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, hy + 6);

      if (m.stars > 0.02) {
        for (var si = 0; si < stars.length; si++) {
          var st = stars[si];
          var tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * 1.6 + st.tw);
          ctx.globalAlpha = clamp(m.stars * tw * (1 - st.y * 0.4), 0, 1);
          ctx.fillStyle = "#eaf1ff";
          ctx.fillRect(st.x * W, st.y * hy, st.s, st.s);
        }
        ctx.globalAlpha = 1;
      }

      if (m.sun) {
        var sx = m.sun.x * W, sy = m.sun.y * hy, sr = Math.min(W, H) * 0.075;
        var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 6);
        glow.addColorStop(0, css(m.sunCol, 0.95));
        glow.addColorStop(0.18, css(m.sunCol, 0.42));
        glow.addColorStop(0.55, css(m.sunCol, 0.1));
        glow.addColorStop(1, css(m.sunCol, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, hy + 6);
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.283); ctx.fillStyle = css(lighten(m.sunCol, 0.55), 0.98); ctx.fill();
        if (m.rays > 0.4 && !reduce) {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.globalAlpha = 0.10 * m.rays * (1 - m.clouds * 0.6);
          ctx.strokeStyle = css(m.sunCol);
          for (var ri = 0; ri < 12; ri++) {
            var ang = (ri / 12) * 6.283 + t * 0.05;
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(ang) * sr * 7, Math.sin(ang) * sr * 7);
            ctx.lineWidth = 1.4; ctx.stroke();
          }
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      } else if (m.moon) {
        var mx = W * 0.76, my = hy * 0.34, mr = Math.min(W, H) * 0.032;
        var mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 6);
        mg.addColorStop(0, "rgba(214,228,255,0.75)");
        mg.addColorStop(0.4, "rgba(214,228,255,0.14)");
        mg.addColorStop(1, "rgba(214,228,255,0)");
        ctx.fillStyle = mg; ctx.fillRect(0, 0, W, hy + 6);
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fillStyle = "#e8f0ff"; ctx.fill();
        ctx.beginPath(); ctx.arc(mx + mr * 0.42, my - mr * 0.32, mr * 0.9, 0, 6.283); ctx.fillStyle = css(m.sky[0], 0.92); ctx.fill();
      }

      drawClouds(m, hy, t);

      ctx.fillStyle = css(dark(m.sky[3], 0.34), 0.85);
      drawHills(hillsA, hy, H * 0.085);
      ctx.fillStyle = css(dark(m.sky[3], 0.58), 0.95);
      drawHills(hillsB, hy, H * 0.05);

      drawGround(m, hy);

      drawPoles(m, hy);
      drawTraffic(m, hy);

      if (m.precip && m.precipI > 0.02) drawPrecip(m, hy);

      if (m.lightning > 0.05) {
        if (!reduce) {
          boltT -= 1 / 60;
          if (boltT <= 0 && r() < 0.01 * m.lightning) { flash = 0.9 * m.lightning; bolt = makeBolt(); boltT = 0; }
          if (boltT <= 0 && bolt) boltT = 0.6;
        }
        if (flash > 0) {
          ctx.fillStyle = "rgba(226,236,255," + (flash * 0.5).toFixed(3) + ")";
          ctx.fillRect(0, 0, W, H);
          if (bolt) { ctx.strokeStyle = "rgba(240,246,255," + clamp(flash * 1.4, 0, 1).toFixed(3) + ")"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bolt[0].x * W, 0); for (var bi = 1; bi < bolt.length; bi++) ctx.lineTo(bolt[bi].x * W, bolt[bi].y * hy); ctx.stroke(); }
          flash -= 0.06;
          if (flash < 0) { flash = 0; bolt = null; }
        }
      }

      if (m.fog > 0.03) {
        var fg = ctx.createLinearGradient(0, hy - H * 0.12, 0, hy + H * 0.05);
        fg.addColorStop(0, css(m.sky[3], 0));
        fg.addColorStop(0.5, css(lighten(m.sky[3], 0.25), m.fog * 0.55));
        fg.addColorStop(1, css(lighten(m.sky[3], 0.25), 0));
        ctx.fillStyle = fg; ctx.fillRect(0, hy - H * 0.12, W, H * 0.17);
      }

      if (m.heat > 0.05 && !reduce) {
        ctx.save();
        ctx.globalAlpha = m.heat * 0.06;
        ctx.strokeStyle = css(lighten(m.sky[3], 0.4));
        for (var hx = 0; hx < W; hx += 14) {
          ctx.beginPath();
          for (var yy = hy - H * 0.16; yy < hy + H * 0.02; yy += 6) {
            var off = Math.sin(yy * 0.09 + hx * 0.05 + t * 1.6) * 2.2;
            yy === hy - H * 0.16 ? ctx.moveTo(hx + off, yy) : ctx.lineTo(hx + off, yy);
          }
          ctx.lineWidth = 1.1; ctx.stroke();
        }
        ctx.restore();
      }

      var vg = ctx.createRadialGradient(W * 0.5, H * 0.42, Math.min(W, H) * 0.2, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(4,10,20," + (0.16 + m.night * 0.30).toFixed(2) + ")");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    function drawClouds(m, hy, tt) {
      if (m.clouds < 0.02) return;
      var count = Math.round(m.clouds * clouds.length);
      var base = css(m.cloudCol);
      var drift = (reduce ? 0 : tt) * m.cloudSpeed;
      for (var i = 0; i < count; i++) {
        var c = clouds[i];
        var cx = ((c.x + drift * 0.02 * c.spd * m.cloudSpeed) % 1.2 + 1.2) % 1.2 - 0.1;
        var cy = c.y * (0.55 + m.cloudY) * hy * 0.72 + hy * 0.03;
        var sc = c.s * Math.min(W, H) * 0.13;
        ctx.globalAlpha = clamp(c.a * m.clouds, 0, 1) * 0.9;
        for (var j = 0; j < c.puffs.length; j++) {
          var pf = c.puffs[j];
          var px = cx * W + pf.dx * sc, py = cy + pf.dy * sc, pr = pf.s * sc;
          var pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
          pg.addColorStop(0, base);
          pg.addColorStop(1, css(m.cloudCol, 0));
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawHills(pts, hy, amp) {
      var n = pts.length, base = hy + 4;
      ctx.beginPath();
      ctx.moveTo(0, base);
      for (var i = 0; i < n; i++) ctx.lineTo((i / (n - 1)) * W, base - pts[i] * amp);
      ctx.lineTo(W, base); ctx.closePath(); ctx.fill();
    }

    function drawGround(m, hy) {
      var asph = [26, 27, 32];
      var wetG = m.wet;
      var gg = ctx.createLinearGradient(0, hy, 0, H);
      gg.addColorStop(0, css(mix(asph, m.sky[3], 0.18 + wetG * 0.12)));
      gg.addColorStop(1, css(asph));
      ctx.fillStyle = gg;
      var e0 = edgeAt(H, hy), e1 = edgeAt(hy, hy);
      ctx.beginPath();
      ctx.moveTo(e1.l, hy); ctx.lineTo(e1.r, hy); ctx.lineTo(e0.r, H); ctx.lineTo(e0.l, H); ctx.closePath(); ctx.fill();

      if (m.ice > 0.05) {
        ctx.globalAlpha = m.ice * 0.5;
        ctx.strokeStyle = "rgba(226,240,250,0.9)";
        for (var ic = 0; ic < 26; ic++) {
          var iy = hy + (ic / 26) * (H - hy), ee = edgeAt(iy, hy);
          ctx.beginPath();
          ctx.moveTo(ee.l + (ee.r - ee.l) * r(), iy);
          ctx.lineTo(ee.l + (ee.r - ee.l) * r(), iy + 2);
          ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "rgba(235,225,160," + (0.35 + m.wet * 0.25).toFixed(2) + ")";
      var seg = 0.16;
      for (var y = hy + 0.02; y < 1; y += 0.03) {
        var yy = hy + (y - m.horizon) * H;
        if (yy < hy) continue;
        var ee2 = edgeAt(yy, hy), cx = centerAt(yy, hy);
        var dash = (roadScroll % 1);
        if (dash > 0.55) continue;
        var dl = cx(0) - (ee2.r - ee2.l) * 0.012, dr = cx(0) + (ee2.r - ee2.l) * 0.012;
        ctx.fillRect(dl, yy, dr - dl, 1 + (yy - hy) * 0.02);
      }
      var mid = centerAt(H - 2, hy);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(edgeAt(H, hy).l, H - 3, 3, 3);
      ctx.fillRect(edgeAt(H, hy).r - 3, H - 3, 3, 3);
      if (!reduce) roadScroll += 0.02 + (m.wet * 0.01);
    }

    function drawPoles(m, hy) {
      var lean = m.wind * 0.06;
      ctx.strokeStyle = css(dark(look.sky[3], 0.72), 0.85);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 2;
      for (var i = 0; i < poles.length; i++) {
        var p = ((poles[i].p + roadScroll * 0.05) % 1 + 1) % 1;
        var y = lerp(hy, H, Math.pow(p, 1.7));
        var e = edgeAt(y, hy);
        var x = e.r + (W - e.r) * 0.25;
        var hgt = (y - hy) * 1.1 + 8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + lean * hgt, y - hgt);
        ctx.stroke();
      }
    }

    function drawTraffic(m, hy) {
      var allowed = m.vehicles;
      for (var i = 0; i < traffic.length; i++) {
        var v = traffic[i];
        if (allowed.indexOf(v.type) < 0) continue;
        if (!reduce) {
          v.p += v.spd * v.dir * (v.dir > 0 ? 1 : 1);
          if (v.p > 1.02) v.p = -0.02;
          if (v.p < -0.02) v.p = 1.02;
        }
        var pp = clamp(v.p, 0, 1);
        var y = lerp(hy + 1, H, Math.pow(pp, 1.7));
        var e = edgeAt(y, hy), cx = centerAt(y, hy);
        var x = cx(v.lane);
        var scale = lerp(0.1, 1.15, Math.pow(pp, 1.5));
        ctx.save();
        ctx.translate(x, y);
        ctx.globalAlpha = clamp(pp * 1.2, 0, 1);
        drawVehicle(v.type, scale, v.dir, m, hy, y, pp);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function drawVehicle(type, s, dir, m, hy, y, pp) {
      var w = (type === "truck" ? 34 : type === "moto" ? 16 : 30) * s;
      var h = (type === "truck" ? 20 : type === "moto" ? 15 : 14) * s;
      var body = css(dark(m.sky[3], 0.55));
      var night = m.night;
      ctx.fillStyle = night > 0.35 ? "#11151d" : body;

      if (type === "truck") {
        ctx.fillRect(-w / 2, -h, w * 0.66, h);
        ctx.fillRect(w * 0.16, -h * 0.7, w * 0.34, h * 0.7);
      } else if (type === "moto") {
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0); ctx.lineTo(-w * 0.1, -h * 0.7);
        ctx.lineTo(w * 0.2, -h * 0.7); ctx.lineTo(w / 2, 0);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(-w / 2, 0);
        ctx.lineTo(-w * 0.42, -h * 0.55);
        ctx.lineTo(-w * 0.2, -h);
        ctx.lineTo(w * 0.24, -h);
        ctx.lineTo(w * 0.46, -h * 0.55);
        ctx.lineTo(w / 2, 0);
        ctx.closePath(); ctx.fill();
      }
      var wheelR = Math.max(1.2, h * 0.32);
      ctx.fillStyle = "#0a0d13";
      ctx.beginPath(); ctx.arc(-w * 0.3, -wheelR * 0.4, wheelR, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.3, -wheelR * 0.4, wheelR, 0, 6.283); ctx.fill();

      if (night > 0.3 && dir > 0) {
        var lg = ctx.createRadialGradient(w * 0.28, -h * 0.45, 0, w * 0.28, -h * 0.45, w * 1.4);
        lg.addColorStop(0, "rgba(255,246,214,0.85)");
        lg.addColorStop(0.4, "rgba(255,246,214,0.18)");
        lg.addColorStop(1, "rgba(255,246,214,0)");
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.arc(w * 0.28, -h * 0.45, w * 1.4, 0, 6.283); ctx.fill();
      }
      if (night > 0.3 && dir < 0) {
        ctx.fillStyle = "rgba(255,70,60,0.9)";
        ctx.fillRect(-w * 0.36, -h * 0.5, Math.max(1.4, w * 0.09), Math.max(1.4, h * 0.2));
        ctx.fillRect(w * 0.28, -h * 0.5, Math.max(1.4, w * 0.09), Math.max(1.4, h * 0.2));
      }
    }

    function makeBolt() {
      var pts = [], x = 0.25 + r() * 0.5, y = 0;
      while (y < 1) { pts.push({ x: x, y: y }); x += (r() - 0.5) * 0.06; y += 0.08 + r() * 0.06; }
      return pts;
    }

    function ensureParticles() {
      if (!drops.length) {
        for (var i = 0; i < 220; i++) drops.push({ x: r(), y: r(), l: 0.02 + r() * 0.05, v: 0.7 + r() * 0.9 });
      }
      if (!flakes.length) {
        for (var j = 0; j < 160; j++) flakes.push({ x: r(), y: r(), v: 0.1 + r() * 0.2, d: r() * 6.28, s: 0.6 + r() * 1.6 });
      }
    }

    function drawPrecip(m, hy) {
      ensureParticles();
      var heavy = m.precip === "heavy";
      var snow = m.precip === "snow";
      var ang = m.wind * 0.5;
      if (snow) {
        ctx.fillStyle = "rgba(245,250,255,0.85)";
        for (var i = 0; i < flakes.length * m.precipI; i++) {
          var f = flakes[i];
          if (!reduce) {
            f.y += f.v * m.precipI * 0.02;
            f.x += Math.sin(f.d + t) * 0.0012 + ang * 0.004;
            if (f.y > 1.05) { f.y = -0.05; f.x = r(); }
            if (f.x > 1.05) f.x = -0.05;
          }
          ctx.globalAlpha = 0.5 + 0.5 * m.precipI;
          ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.s * m.precipI, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = heavy ? "rgba(190,214,238,0.62)" : "rgba(190,214,238,0.42)";
        ctx.lineWidth = heavy ? 1.6 : 1;
        var n = drops.length * m.precipI;
        for (var d = 0; d < n; d++) {
          var dr = drops[d];
          if (!reduce) {
            dr.y += dr.v * (heavy ? 0.03 : 0.02) * m.precipI;
            dr.x += ang * 0.004;
            if (dr.y > 1.05) { dr.y = -0.05; dr.x = r(); }
            if (dr.x > 1.05) dr.x = -0.05;
          }
          var len = dr.l * H * (heavy ? 1.5 : 1);
          ctx.beginPath();
          ctx.moveTo(dr.x * W, dr.y * H);
          ctx.lineTo(dr.x * W - ang * len * 0.6, dr.y * H + len);
          ctx.stroke();
        }
      }
    }

    function frame() { draw(); raf = requestAnimationFrame(frame); }
    function tick() {
      var k = reduce ? 1 : mixSpeed;
      look = from === to ? to : lerpLook(from, to, tMix);
      if (tMix < 1 && !reduce) { tMix = Math.min(1, tMix + k); look = lerpLook(from, to, tMix); }
      else if (reduce) { look = to; }
      else { look = to; }
      draw();
    }
    function loop() { if (!running || destroyed) return; tick(); raf = requestAnimationFrame(loop); }
    function start() { if (running || destroyed) return; running = true; if (reduce) draw(); else loop(); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    function go(name, instant) {
      var target = MOODS[name] || MOODS.manha;
      var r2 = resolve(target);
      if (instant || reduce) { from = to = look = r2; tMix = 1; }
      else { from = look; to = r2; tMix = 0; }
      if (instant || reduce) draw();
    }

    function onVis() {
      visible = !document.hidden;
      if (visible && canvas.__wantRun) start(); else stop();
    }

    buildWorld();
    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", onVis, { passive: true });
    canvas.__wantRun = true;
    start();

    return {
      go: go,
      resize: resize,
      start: function () { canvas.__wantRun = true; if (visible) start(); },
      stop: function () { canvas.__wantRun = false; stop(); },
      destroy: function () { destroyed = true; stop(); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", onVis); }
    };
  }

  window.VTScene = { create: create, moods: Object.keys(MOODS) };
})();
