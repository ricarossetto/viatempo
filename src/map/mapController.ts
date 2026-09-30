import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TimelineSample } from '../core/types';
import { wmoToLabel } from '../lib/wmo';

const COLOR: Record<TimelineSample['hazard'], string> = {
  ok: '#22c55e',
  atencao: '#eab308',
  perigo: '#ef4444',
};

export interface MapHandle {
  map: L.Map;
  drawPlan(timeline: TimelineSample[], geometry: Array<{ lat: number; lon: number }>): void;
  clear(): void;
}

export function initMap(el: HTMLElement): MapHandle {
  const map = L.map(el).setView([-29.5, -52.5], 7);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors · Clima: Open-Meteo.com',
  }).addTo(map);
  let layer: L.LayerGroup | null = null;

  function clear() {
    if (layer) {
      layer.remove();
      layer = null;
    }
  }

  function drawPlan(timeline: TimelineSample[], geometry: Array<{ lat: number; lon: number }>) {
    clear();
    layer = L.layerGroup().addTo(map);
    const latlngs = geometry.map((g) => [g.lat, g.lon] as [number, number]);
    // Estilo "Google Maps": casing branca + núcleo azul
    L.polyline(latlngs, { weight: 9, opacity: 1, color: '#ffffff' }).addTo(layer);
    L.polyline(latlngs, { weight: 5, opacity: 0.95, color: '#1a73e8' }).addTo(layer);
    for (const s of timeline) {
      const info = wmoToLabel(s.weather.weatherCode);
      const hour = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(s.atISO),
      );
      L.circleMarker([s.point.lat, s.point.lon], {
        radius: 8,
        color: COLOR[s.hazard],
        fillColor: COLOR[s.hazard],
        fillOpacity: 0.9,
      })
        .bindPopup(
          `<b>${hour}</b> · km ${Math.round(s.distKm)}<br>${info.icon} ${info.label}<br>` +
            `${s.weather.tempC.toFixed(1)}°C · chuva ${Math.round(s.weather.precipitationProb)}%<br>` +
            `vento ${Math.round(s.weather.windKmh)} km/h · ${s.reason}`,
        )
        .addTo(layer);
    }
    if (latlngs.length) map.fitBounds(L.latLngBounds(latlngs).pad(0.15));
  }

  return { map, drawPlan, clear };
}
