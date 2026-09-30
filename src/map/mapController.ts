import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint, RouteCandidate, TimelineSample } from '../core/types';
import { cumulativeKm } from '../core/sampling';
import { wmoToLabel } from '../lib/wmo';
import { weatherKind, weatherSvg, iconSvg } from './weatherIcons';

const HAZARD_COLOR: Record<TimelineSample['hazard'], string> = {
  ok: '#1f9d55',
  atencao: '#c07f1a',
  perigo: '#bc3f2a',
};

/** Traço também varia por nível: cor nunca é o único sinal. */
const HAZARD_DASH: Record<TimelineSample['hazard'], string | undefined> = {
  ok: undefined,
  atencao: '10 6',
  perigo: '3 5',
};

const MUTED = '#9eaaa5';
const BRAND = '#0e7c5b';

const reducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export type MarkerDensity = 'summary' | 'detailed';

export interface MapHandle {
  map: L.Map;
  /** Desenha todas as candidatas; selecionada ganha destaque (anima só se pedido). */
  setRouteCandidates(routes: RouteCandidate[], selectedId: string, opts?: { animate?: boolean }): void;
  selectRoute(routeId: string): void;
  /** Preview temporário (hover/focus no card): não troca a seleção. */
  previewRoute(routeId: string | null): void;
  /** Segmenta a rota selecionada pela condição de cada trecho. */
  drawWeather(routeId: string, timeline: TimelineSample[], opts?: { reveal?: boolean }): void;
  /** Quantos markers de checkpoint aparecem: só eventos ou todos. */
  setMarkerDensity(mode: MarkerDensity): void;
  highlightSample(index: number | null): void;
  focusSample(index: number): void;
  fitAll(): void;
  onRouteClick(cb: (routeId: string) => void): void;
  onSampleClick(cb: (index: number) => void): void;
  clear(): void;
}

/**
 * Agrupa trechos consecutivos de mesmo hazard e devolve as coordenadas
 * de cada grupo. Representação interpolada entre checkpoints, não
 * precisão metro a metro: o corte acontece no ponto da geometry mais
 * próximo de cada marco de distância.
 */
function hazardSegments(
  geometry: GeoPoint[],
  timeline: TimelineSample[],
): Array<{ hazard: TimelineSample['hazard']; latlngs: Array<[number, number]> }> {
  if (!timeline.length) return [];
  const cum = cumulativeKm(geometry);
  const total = cum[cum.length - 1] ?? 0;
  const groups: Array<{ hazard: TimelineSample['hazard']; from: number; to: number }> = [];
  timeline.forEach((s, i) => {
    const to = i + 1 < timeline.length ? timeline[i + 1].distKm : total;
    const last = groups[groups.length - 1];
    if (last && last.hazard === s.hazard) last.to = to;
    else groups.push({ hazard: s.hazard, from: s.distKm, to });
  });
  return groups.map((g) => ({
    hazard: g.hazard,
    latlngs: geometry
      .filter((_, i) => cum[i] >= g.from - 0.05 && cum[i] <= g.to + 0.05)
      .map((p) => [p.lat, p.lon] as [number, number]),
  })).filter((g) => g.latlngs.length > 1);
}

function animateDraw(line: L.Polyline, ms: number, delayMs = 0) {
  const run = () => {
    if (reducedMotion) return;
    const el = (line as unknown as { _path?: SVGPathElement })._path;
    if (!el || typeof el.getTotalLength !== 'function') return;
    const len = el.getTotalLength();
    el.style.transition = 'none';
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    void el.getBoundingClientRect();
    el.style.transition = `stroke-dashoffset ${ms}ms cubic-bezier(0.3, 0.7, 0.3, 1)`;
    el.style.strokeDashoffset = '0';
    window.setTimeout(() => {
      el.style.transition = '';
      el.style.strokeDasharray = '';
      el.style.strokeDashoffset = '';
    }, ms + 60);
  };
  if (delayMs <= 0 || reducedMotion) run();
  else window.setTimeout(run, delayMs);
}

function fadeIn(line: L.Polyline, ms: number) {
  if (reducedMotion) return;
  const el = (line as unknown as { _path?: SVGPathElement })._path;
  if (!el) return;
  el.style.transition = 'none';
  el.style.opacity = '0';
  void el.getBoundingClientRect();
  el.style.transition = `opacity ${ms}ms ease-out`;
  el.style.opacity = '';
  window.setTimeout(() => {
    el.style.transition = '';
    el.style.opacity = '';
  }, ms + 60);
}

/**
 * Índices dos markers visíveis no modo resumo: mudanças de condição mais
 * o pior trecho (se relevante de verdade). O resto aparece no hover da
 * timeline, no modo detalhado ou durante a revelação.
 */
export function eventSampleIndexes(timeline: TimelineSample[]): number[] {
  const out: number[] = [];
  let prevKind = '';
  timeline.forEach((s, i) => {
    const kind = weatherKind(s.weather.weatherCode);
    if (kind !== prevKind) {
      prevKind = kind;
      out.push(i);
    }
  });
  let worst = -1;
  let worstScore = 31;
  timeline.forEach((s, i) => {
    if (s.hazardScore > worstScore) {
      worstScore = s.hazardScore;
      worst = i;
    }
  });
  if (worst >= 0 && !out.includes(worst)) out.push(worst);
  return out.sort((a, b) => a - b);
}

const originIcon = L.divIcon({
  className: 'od-marker',
  html: `<span class="od origin" title="Origem"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destIcon = L.divIcon({
  className: 'od-marker',
  html: `<span class="od dest" title="Destino"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const carIcon = L.divIcon({
  className: 'car-marker',
  html: `<span class="car-dot" title="Trecho selecionado"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function popupHtml(s: TimelineSample): string {
  const info = wmoToLabel(s.weather.weatherCode);
  const hour = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(s.atISO),
  );
  return (
    `<div class="wx-pop"><div class="wx-top">${hour}, km ${Math.round(s.distKm)}</div>` +
    `<div class="wx-cond">${iconSvg(s.weather.weatherCode, 20)} ${info.label}, ${s.weather.tempC.toFixed(0)}°</div>` +
    `<div class="wx-meta">Chuva ${Math.round(s.weather.precipitationProb)}%</div>` +
    `<div class="wx-meta">Vento ${Math.round(s.weather.windKmh)} km/h</div></div>`
  );
}

export function initMap(el: HTMLElement): MapHandle {
  const map = L.map(el, { zoomControl: false }).setView([-29.5, -52.5], 7);
  L.control.zoom({ position: 'topright' }).addTo(map);
  // OSM standard: sem chave, permite hotlink com atribuição (Tile Usage Policy).
  // NÃO usar CARTO basemaps: passaram a exigir API key (watermark "API KEY REQUIRED").
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors, clima: Open-Meteo.com',
  }).addTo(map);

  let layer: L.LayerGroup | null = null;
  let candidates: RouteCandidate[] = [];
  let selectedId: string | null = null;
  let previewId: string | null = null;
  let selectedLines: L.Polyline[] = [];
  /** Linhas visuais das candidatas não selecionadas (estilo muda no preview). */
  let candidateLines = new Map<string, L.Polyline>();
  let sampleMarkers: L.Marker[] = [];
  let sampleTimeline: TimelineSample[] = [];
  let markerDensity: MarkerDensity = 'summary';
  let destMarker: L.Marker | null = null;
  let pendingTimers: number[] = [];
  let carMarker: L.Marker | null = null;
  let highlighted = -1;
  let routeClickCb: ((routeId: string) => void) | null = null;
  let sampleClickCb: ((index: number) => void) | null = null;

  function clearTimers() {
    for (const t of pendingTimers) window.clearTimeout(t);
    pendingTimers = [];
  }

  function clear() {
    if (layer) layer.remove();
    layer = L.layerGroup().addTo(map);
    selectedLines = [];
    candidateLines = new Map();
    sampleMarkers = [];
    sampleTimeline = [];
    destMarker = null;
    carMarker = null;
    highlighted = -1;
    clearTimers();
  }
  layer = L.layerGroup().addTo(map);

  function latlngsOf(g: GeoPoint[]): Array<[number, number]> {
    return g.map((p) => [p.lat, p.lon] as [number, number]);
  }

  function selectRoute(routeId: string) {
    selectedId = routeId;
    previewId = null;
    if (layer) {
      // Recomeça a base sem acumular camadas; markers/clima voltam via drawWeather.
      layer.clearLayers();
      sampleMarkers = [];
      selectedLines = [];
      sampleTimeline = [];
      destMarker = null;
      carMarker = null;
      highlighted = -1;
      clearTimers();
      drawBase();
    }
    drawSelected(false);
  }

  function previewRoute(routeId: string | null) {
    if (routeId === previewId) return;
    previewId = routeId;
    // Só troca estilo das linhas existentes: nada é criado nem destruído.
    for (const [id, line] of candidateLines) {
      const active = id === routeId;
      line.setStyle({
        weight: active ? 6 : 4,
        opacity: active ? 0.9 : 0.55,
        color: active ? BRAND : MUTED,
      });
    }
  }
  function drawSelected(animate: boolean) {
    // remove só as linhas da selecionada; candidatas e markers ficam
    for (const l of selectedLines) layer?.removeLayer(l);
    selectedLines = [];
    const route = candidates.find((r) => r.id === selectedId);
    if (!route || !layer) return;
    const latlngs = latlngsOf(route.geometry);
    const casing = L.polyline(latlngs, { weight: 10, opacity: 1, color: '#ffffff' }).addTo(layer);
    const core = L.polyline(latlngs, { weight: 5, opacity: 0.95, color: BRAND }).addTo(layer);
    selectedLines = [casing, core];
    if (animate && !reducedMotion) {
      // casing surge suave primeiro; o core percorre a estrada em ~1100ms
      fadeIn(casing, 350);
      animateDraw(core, 1100);
      pulseDest(1250);
    }
  }

  /** Pequeno pulso de chegada no destino ao fim do draw. */
  function pulseDest(delayMs: number) {
    if (reducedMotion || !destMarker) return;
    pendingTimers.push(window.setTimeout(() => {
      destMarker?.getElement()?.classList.add('arrived');
      pendingTimers.push(window.setTimeout(() => {
        destMarker?.getElement()?.classList.remove('arrived');
      }, 900));
    }, delayMs));
  }

  /** (Re)desenha base: candidatas muted + hit areas. Chamar antes de drawSelected. */
  function drawBase() {
    if (!layer) return;
    candidateLines = new Map();
    for (const r of candidates) {
      if (r.id === selectedId) continue;
      const latlngs = latlngsOf(r.geometry);
      const line = L.polyline(latlngs, {
        weight: 4, opacity: 0.55, color: MUTED, interactive: false,
      }).addTo(layer);
      candidateLines.set(r.id, line);
      // Área clicável invisível e generosa: sem clique milimétrico.
      L.polyline(latlngs, { weight: 18, opacity: 0, color: MUTED })
        .on('click', () => routeClickCb?.(r.id))
        .addTo(layer);
    }
  }

  function setRouteCandidates(routes: RouteCandidate[], selId: string, opts?: { animate?: boolean }) {
    clear();
    candidates = routes;
    selectedId = selId;
    previewId = null;
    drawBase();
    drawSelected(!!opts?.animate);
  }

  function drawWeather(routeId: string, timeline: TimelineSample[], opts?: { reveal?: boolean }) {
    const route = candidates.find((r) => r.id === routeId);
    if (!route || !layer) return;
    clearTimers();
    selectedId = routeId;
    sampleTimeline = timeline;
    const reveal = !!opts?.reveal && !reducedMotion;
    // troca o core sólido pelos segmentos meteorológicos
    for (const l of selectedLines) layer.removeLayer(l);
    selectedLines = [];
    const latlngs = latlngsOf(route.geometry);
    const casing = L.polyline(latlngs, { weight: 10, opacity: 1, color: '#ffffff' }).addTo(layer);
    selectedLines.push(casing);
    if (reveal) fadeIn(casing, 350);
    const segments = hazardSegments(route.geometry, timeline);
    const lyr = layer;
    segments.forEach((seg, si) => {
      const line = L.polyline(seg.latlngs, {
        weight: 5, opacity: 0.95, color: HAZARD_COLOR[seg.hazard], dashArray: HAZARD_DASH[seg.hazard],
      }).addTo(lyr);
      selectedLines.push(line);
      // segmentos surgem em sequência, percorrendo a estrada (~1100ms no total)
      if (reveal) animateDraw(line, 500, 250 + si * Math.max(0, Math.floor(600 / Math.max(1, segments.length))));
    });
    // markers de checkpoint: ícone do clima dentro de bolha com anel de hazard
    for (const m of sampleMarkers) layer.removeLayer(m);
    const visible = markerDensity === 'detailed'
      ? timeline.map((_, i) => i)
      : eventSampleIndexes(timeline);
    const totalKm = timeline[timeline.length - 1]?.distKm || 1;
    sampleMarkers = timeline.map((s, i) => {
      const icon = L.divIcon({
        className: 'wxm-wrap',
        html: `<span class="wxm ${s.hazard}"><svg viewBox="0 0 24 24" aria-hidden="true">${weatherSvg(weatherKind(s.weather.weatherCode))}</svg></span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      const m = L.marker([s.point.lat, s.point.lon], { icon, title: `${wmoToLabel(s.weather.weatherCode).label} ${Math.round(s.weather.tempC)}°` })
        .bindPopup(popupHtml(s), { className: 'wx-pop-wrap', closeButton: false })
        .on('click', () => sampleClickCb?.(i))
        .addTo(layer as L.LayerGroup);
      if (!visible.includes(i)) m.getElement()?.classList.add('wx-hidden');
      // pop sincronizado ao draw: surge quando a linha alcança o trecho
      if (reveal && visible.includes(i)) {
        const delay = 250 + Math.round((s.distKm / totalKm) * 850);
        pendingTimers.push(window.setTimeout(() => {
          m.getElement()?.classList.add('pop');
          pendingTimers.push(window.setTimeout(() => m.getElement()?.classList.remove('pop'), 650));
        }, delay));
      }
      return m;
    });
    // origem/destino próprios (sem pin padrão)
    if (timeline.length) {
      L.marker([route.geometry[0].lat, route.geometry[0].lon], { icon: originIcon, title: 'Origem' }).addTo(layer);
      const last = route.geometry[route.geometry.length - 1];
      destMarker = L.marker([last.lat, last.lon], { icon: destIcon, title: 'Destino' }).addTo(layer);
      if (reveal) pulseDest(1250);
    }
  }

  function setMarkerDensity(mode: MarkerDensity) {
    if (mode === markerDensity) return;
    markerDensity = mode;
    const visible = markerDensity === 'detailed'
      ? sampleTimeline.map((_, i) => i)
      : eventSampleIndexes(sampleTimeline);
    sampleMarkers.forEach((m, i) => {
      m.getElement()?.classList.toggle('wx-hidden', !visible.includes(i));
    });
  }

  function highlightSample(index: number | null) {
    sampleMarkers.forEach((m, i) => {
      m.getElement()?.classList.toggle('active', index === i);
    });
    highlighted = index ?? -1;
  }

  function focusSample(index: number) {
    const s = sampleTimeline[index];
    if (!s || !layer) return;
    highlightSample(index);
    map.panTo([s.point.lat, s.point.lon], { animate: !reducedMotion });
    if (!carMarker) {
      carMarker = L.marker([s.point.lat, s.point.lon], {
        icon: carIcon, interactive: false, keyboard: false,
      }).addTo(layer);
    } else {
      carMarker.setLatLng([s.point.lat, s.point.lon]);
    }
    void highlighted;
  }

  function fitAll() {
    const all: Array<[number, number]> = [];
    for (const r of candidates) all.push(...latlngsOf(r.geometry));
    if (all.length) map.fitBounds(L.latLngBounds(all).pad(0.12));
  }

  return {
    map,
    setRouteCandidates,
    selectRoute,
    previewRoute,
    drawWeather,
    setMarkerDensity,
    highlightSample,
    focusSample,
    fitAll,
    onRouteClick(cb) { routeClickCb = cb; },
    onSampleClick(cb) { sampleClickCb = cb; },
    clear,
  };
}
