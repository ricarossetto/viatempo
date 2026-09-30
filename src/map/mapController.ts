import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint, RouteCandidate, TimelineSample } from '../core/types';
import { cumulativeKm } from '../core/sampling';
import { wmoToLabel } from '../lib/wmo';

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

export interface MapHandle {
  map: L.Map;
  /** Desenha todas as candidatas; selecionada ganha destaque (anima só se pedido). */
  setRouteCandidates(routes: RouteCandidate[], selectedId: string, opts?: { animate?: boolean }): void;
  selectRoute(routeId: string): void;
  /** Preview temporário (hover/focus no card): não troca a seleção. */
  previewRoute(routeId: string | null): void;
  /** Segmenta a rota selecionada pela condição de cada trecho. */
  drawWeather(routeId: string, timeline: TimelineSample[]): void;
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

function animateDraw(line: L.Polyline, ms: number) {
  if (reducedMotion) return;
  const el = (line as unknown as { _path?: SVGPathElement })._path;
  if (!el || typeof el.getTotalLength !== 'function') return;
  const len = el.getTotalLength();
  el.style.transition = 'none';
  el.style.strokeDasharray = `${len}`;
  el.style.strokeDashoffset = `${len}`;
  void el.getBoundingClientRect();
  el.style.transition = `stroke-dashoffset ${ms}ms ease-out`;
  el.style.strokeDashoffset = '0';
  window.setTimeout(() => {
    el.style.transition = '';
    el.style.strokeDasharray = '';
    el.style.strokeDashoffset = '';
  }, ms + 50);
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
    `<div class="wx-cond">${info.icon} ${info.label}, ${s.weather.tempC.toFixed(0)}°</div>` +
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
  let sampleMarkers: L.CircleMarker[] = [];
  let sampleTimeline: TimelineSample[] = [];
  let carMarker: L.Marker | null = null;
  let highlighted = -1;
  let routeClickCb: ((routeId: string) => void) | null = null;
  let sampleClickCb: ((index: number) => void) | null = null;

  function clear() {
    if (layer) layer.remove();
    layer = L.layerGroup().addTo(map);
    selectedLines = [];
    candidateLines = new Map();
    sampleMarkers = [];
    sampleTimeline = [];
    carMarker = null;
    highlighted = -1;
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
      carMarker = null;
      highlighted = -1;
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
    if (animate) animateDraw(core, 800);
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

  function drawWeather(routeId: string, timeline: TimelineSample[]) {
    const route = candidates.find((r) => r.id === routeId);
    if (!route || !layer) return;
    selectedId = routeId;
    sampleTimeline = timeline;
    // troca o core sólido pelos segmentos meteorológicos
    for (const l of selectedLines) layer.removeLayer(l);
    selectedLines = [];
    const latlngs = latlngsOf(route.geometry);
    const casing = L.polyline(latlngs, { weight: 10, opacity: 1, color: '#ffffff' }).addTo(layer);
    selectedLines.push(casing);
    for (const seg of hazardSegments(route.geometry, timeline)) {
      const line = L.polyline(seg.latlngs, {
        weight: 5, opacity: 0.95, color: HAZARD_COLOR[seg.hazard], dashArray: HAZARD_DASH[seg.hazard],
      }).addTo(layer);
      selectedLines.push(line);
    }
    // markers de checkpoint
    for (const m of sampleMarkers) layer.removeLayer(m);
    sampleMarkers = timeline.map((s, i) => {
      const m = L.circleMarker([s.point.lat, s.point.lon], {
        radius: 7, color: HAZARD_COLOR[s.hazard], fillColor: HAZARD_COLOR[s.hazard],
        fillOpacity: 0.95, weight: 2,
      })
        .bindPopup(popupHtml(s), { className: 'wx-pop-wrap', closeButton: false })
        .on('click', () => sampleClickCb?.(i))
        .addTo(layer as L.LayerGroup);
      return m;
    });
    // origem/destino próprios (sem pin padrão)
    if (timeline.length) {
      L.marker([route.geometry[0].lat, route.geometry[0].lon], { icon: originIcon, title: 'Origem' }).addTo(layer);
      const last = route.geometry[route.geometry.length - 1];
      L.marker([last.lat, last.lon], { icon: destIcon, title: 'Destino' }).addTo(layer);
    }
  }

  function highlightSample(index: number | null) {
    sampleMarkers.forEach((m, i) => {
      const s = sampleTimeline[i];
      if (!s) return;
      const active = index === i;
      m.setStyle({ radius: active ? 11 : 7, weight: active ? 3 : 2 });
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
    highlightSample,
    focusSample,
    fitAll,
    onRouteClick(cb) { routeClickCb = cb; },
    onSampleClick(cb) { sampleClickCb = cb; },
    clear,
  };
}
