import './style.css';
import type { Place } from './core/types';
import { createTripPlanner, geocoder } from './core/tripPlanner';
import { initMap } from './map/mapController';
import { wmoToLabel } from './lib/wmo';

const planner = createTripPlanner();

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header>
  <h1>Previsão do tempo da rota</h1>
  <p>Origem, destino e hora de saída → clima em cada trecho. Dados: OSRM + Open-Meteo (gratuitos, sem chave).</p>
</header>
<section class="form">
  <label>Origem <input id="from" value="Ijuí, RS" autocomplete="off" /><div id="fromList" class="suggest"></div></label>
  <label>Destino <input id="to" value="Porto Alegre, RS" autocomplete="off" /><div id="toList" class="suggest"></div></label>
  <label>Saída <input id="depart" type="datetime-local" /></label>
  <button id="go">Ver previsão</button>
</section>
<section class="sliderRow">
  <label>Ajustar saída <input id="shift" type="range" min="-180" max="360" step="30" value="0" /> <span id="shiftLabel">+0min</span></label>
</section>
<div id="status"></div>
<div id="summary"></div>
<div id="map"></div>
<div id="timeline"></div>
<footer>Mapa © OpenStreetMap · Clima: Data by Open-Meteo.com (CC-BY 4.0)</footer>
`;

const fromEl = app.querySelector<HTMLInputElement>('#from')!;
const toEl = app.querySelector<HTMLInputElement>('#to')!;
const departEl = app.querySelector<HTMLInputElement>('#depart')!;
const goBtn = app.querySelector<HTMLButtonElement>('#go')!;
const statusEl = app.querySelector<HTMLDivElement>('#status')!;
const summaryEl = app.querySelector<HTMLDivElement>('#summary')!;
const timelineEl = app.querySelector<HTMLDivElement>('#timeline')!;
const shiftEl = app.querySelector<HTMLInputElement>('#shift')!;
const shiftLabel = app.querySelector<HTMLSpanElement>('#shiftLabel')!;

// default: amanhã 08:00 local
{
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  departEl.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let fromPlace: Place | null = { lat: -28.3879, lon: -53.9153, name: 'Ijuí', displayName: 'Ijuí — RS', id: '-28.3879,-53.9153' };
let toPlace: Place | null = { lat: -30.0346, lon: -51.2177, name: 'Porto Alegre', displayName: 'Porto Alegre — RS', id: '-30.0346,-51.2177' };
let basePlan: Awaited<ReturnType<typeof planner.planTrip>> | null = null;

const mapCtl = initMap(app.querySelector<HTMLDivElement>('#map')!);

function hookAutocomplete(input: HTMLInputElement, list: HTMLDivElement, set: (p: Place) => void) {
  let timer = 0;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      try {
        const opts = await geocoder.search(input.value);
        list.innerHTML = opts.map((o, i) => `<button data-i="${i}">${o.displayName}</button>`).join('');
        list.querySelectorAll('button').forEach((b) => {
          b.onclick = () => {
            const p = opts[Number(b.dataset.i)];
            input.value = p.displayName;
            set(p);
            list.innerHTML = '';
          };
        });
      } catch {
        /* ignora */
      }
    }, 350);
  });
}
hookAutocomplete(fromEl, app.querySelector('#fromList')!, (p) => (fromPlace = p));
hookAutocomplete(toEl, app.querySelector('#toList')!, (p) => (toPlace = p));

function renderTimeline() {
  if (!basePlan) return;
  const shiftMin = Number(shiftEl.value);
  shiftLabel.textContent = `${shiftMin >= 0 ? '+' : ''}${shiftMin}min`;
  const plan = shiftMin === 0 ? basePlan : planner.retimeTimeline(basePlan, shiftDate(basePlan.departureISO, shiftMin));
  summaryEl.innerHTML = `<strong>${plan.summary}</strong><br><small>${(plan.route.distanceM / 1000).toFixed(0)} km · ${(plan.route.durationS / 3600).toFixed(1)} h · chegada ${fmtHour(plan.arrivalISO)} · via ${plan.route.provider}</small>`;
  timelineEl.innerHTML = plan.timeline
    .map((s) => {
      const info = wmoToLabel(s.weather.weatherCode);
      return `<div class="card ${s.hazard}"><b>${fmtHour(s.atISO)}</b><span>km ${Math.round(s.distKm)}</span><span class="big">${info.icon}</span><span>${info.label}</span><span>${s.weather.tempC.toFixed(0)}°C · 🌧 ${Math.round(s.weather.precipitationProb)}%</span><small>💨 ${Math.round(s.weather.windKmh)} km/h · ${s.reason}</small></div>`;
    })
    .join('');
  mapCtl.drawPlan(plan.timeline, plan.route.geometry);
}

function shiftDate(iso: string, min: number): string {
  return new Date(new Date(iso).getTime() + min * 60_000).toISOString();
}
function fmtHour(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

shiftEl.addEventListener('input', renderTimeline);

goBtn.onclick = async () => {
  if (!fromPlace || !toPlace) {
    statusEl.textContent = 'Escolha origem e destino (use a sugestão ou mantenha o padrão Ijuí → POA).';
    return;
  }
  if (!departEl.value) {
    statusEl.textContent = 'Escolha a hora de saída.';
    return;
  }
  statusEl.textContent = 'Buscando rota + clima…';
  summaryEl.textContent = '';
  try {
    basePlan = await planner.planTrip({
      origin: fromPlace,
      destination: toPlace,
      departureISO: new Date(departEl.value).toISOString(),
    });
    shiftEl.value = '0';
    statusEl.textContent = '';
    renderTimeline();
  } catch (e) {
    statusEl.textContent = `Falhou: ${(e as Error).message}`;
  }
};
