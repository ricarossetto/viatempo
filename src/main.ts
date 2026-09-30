import './style.css';
import type { Place } from './core/types';
import { createTripPlanner, geocoder } from './core/tripPlanner';
import { initMap } from './map/mapController';
import { wmoToLabel } from './lib/wmo';

const planner = createTripPlanner();

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header>
  <div class="brand"><img src="/favicon.svg" alt="" /> Clima de estrada</div>
  <h1>Previsão do tempo da sua rota</h1>
  <p class="lede">Diga de onde sai, para onde vai e a que horas. A gente mostra o tempo em cada trecho do caminho na hora em que você passar por lá: chuva, neblina e vento.</p>
</header>
<section class="panel">
  <form class="form" id="searchForm">
    <label class="field"><span>De onde você sai?</span><input id="from" value="Ijuí, RS" autocomplete="off" placeholder="Ex.: Ijuí, RS" /><div id="fromList" class="suggest"></div></label>
    <label class="field"><span>Para onde você vai?</span><input id="to" value="Porto Alegre, RS" autocomplete="off" placeholder="Ex.: Porto Alegre, RS" /><div id="toList" class="suggest"></div></label>
    <label class="field"><span>Que horas você sai?</span><input id="depart" type="datetime-local" /></label>
    <button class="primary" type="submit">Ver previsão da rota</button>
  </form>
</section>
<section class="shift disabled" id="shiftRow">
  <span>Testar outro horário de saída</span>
  <input id="shift" type="range" min="-180" max="360" step="30" value="0" disabled aria-label="Deslocar horário de saída em minutos" />
  <output id="shiftLabel" for="shift">+0min</output>
</section>
<p class="notice" id="status" role="status"></p>
<div class="summary" id="summary"></div>
<div id="map" role="img" aria-label="Mapa da rota com pontos de previsão do tempo"></div>
<div class="roadstrip" id="timeline"></div>
<footer>Trajeto por <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> (roteamento OSRM). Clima por <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> (CC-BY 4.0). Sem cadastro, sem chave.</footer>
`;

const fromEl = app.querySelector<HTMLInputElement>('#from')!;
const toEl = app.querySelector<HTMLInputElement>('#to')!;
const departEl = app.querySelector<HTMLInputElement>('#depart')!;
const formEl = app.querySelector<HTMLFormElement>('#searchForm')!;
const statusEl = app.querySelector<HTMLParagraphElement>('#status')!;
const summaryEl = app.querySelector<HTMLDivElement>('#summary')!;
const timelineEl = app.querySelector<HTMLDivElement>('#timeline')!;
const shiftRow = app.querySelector<HTMLElement>('#shiftRow')!;
const shiftEl = app.querySelector<HTMLInputElement>('#shift')!;
const shiftLabel = app.querySelector<HTMLOutputElement>('#shiftLabel')!;

// default: amanhã 08:00 local
{
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  departEl.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let fromPlace: Place | null = { lat: -28.3879, lon: -53.9153, name: 'Ijuí', displayName: 'Ijuí, RS', id: '-28.3879,-53.9153' };
let toPlace: Place | null = { lat: -30.0346, lon: -51.2177, name: 'Porto Alegre', displayName: 'Porto Alegre, RS', id: '-30.0346,-51.2177' };
let basePlan: Awaited<ReturnType<typeof planner.planTrip>> | null = null;

const mapCtl = initMap(app.querySelector<HTMLDivElement>('#map')!);

function hookAutocomplete(input: HTMLInputElement, list: HTMLDivElement, set: (p: Place) => void) {
  let timer = 0;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      try {
        const opts = await geocoder.search(input.value);
        list.innerHTML = opts.map((o, i) => `<button type="button" data-i="${i}">${o.displayName}</button>`).join('');
        list.querySelectorAll('button').forEach((b) => {
          b.onclick = () => {
            const p = opts[Number((b as HTMLButtonElement).dataset.i)];
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
hookAutocomplete(fromEl, app.querySelector<HTMLDivElement>('#fromList')!, (p) => (fromPlace = p));
hookAutocomplete(toEl, app.querySelector<HTMLDivElement>('#toList')!, (p) => (toPlace = p));

function renderEmpty() {
  timelineEl.innerHTML = `<div class="empty"><strong>Nenhuma rota por aqui ainda</strong>Preencha origem, destino e horário lá em cima e peça a previsão. A faixa de estrada aparece aqui, trecho a trecho.</div>`;
}

function renderSkeleton() {
  timelineEl.innerHTML =
    `<div class="road" aria-hidden="true"></div>` +
    Array.from({ length: 6 }, () => `<div class="stop skel"><span class="dot"></span><div class="stop-body"><b>··:··</b></div></div>`).join('');
}

function setStatus(kind: '' | 'info' | 'error', text: string) {
  statusEl.className = kind ? `notice ${kind}` : 'notice';
  statusEl.textContent = text;
}

function renderPlan() {
  if (!basePlan) return;
  const plan = basePlan;
  summaryEl.innerHTML =
    `<strong>${plan.summary}</strong>` +
    `<div class="facts"><span>${(plan.route.distanceM / 1000).toFixed(0)} km</span>` +
    `<span>${(plan.route.durationS / 3600).toFixed(1)} h de viagem</span>` +
    `<span>chegada ${fmtHour(plan.arrivalISO)}</span></div>`;
  timelineEl.innerHTML =
    `<div class="road" aria-hidden="true"></div>` +
    plan.timeline
      .map((s) => {
        const info = wmoToLabel(s.weather.weatherCode);
        return `<div class="stop ${s.hazard}"><span class="dot"></span><div class="stop-body">` +
          `<time>${fmtHour(s.atISO)}</time><span class="km">km ${Math.round(s.distKm)}</span>` +
          `<span class="icon">${info.icon}</span><span class="cond">${info.label}</span>` +
          `<span class="temp">${s.weather.tempC.toFixed(0)}°</span>` +
          `<span class="meta">Chuva ${Math.round(s.weather.precipitationProb)}%, vento ${Math.round(s.weather.windKmh)} km/h</span>` +
          `<span class="reason">${s.reason}</span></div></div>`;
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

function baseDepartureISO(): string {
  return new Date(departEl.value).toISOString();
}

// Slider faz re-planejamento real (debounced): desloca a saída e refaz o fetch
// do clima. A rota vem do cache (24h), então custa só 1 request Open-Meteo.
let shiftTimer = 0;
let lastShiftMin = 0;
shiftEl.addEventListener('input', () => {
  const shiftMin = Number(shiftEl.value);
  shiftLabel.textContent = `${shiftMin >= 0 ? '+' : ''}${shiftMin}min`;
  if (!basePlan || !fromPlace || !toPlace) return;
  // Preview instantâneo reposicionando os horários…
  basePlan = planner.retimeTimeline(basePlan, shiftDate(basePlan.departureISO, shiftMin - lastShiftMin));
  lastShiftMin = shiftMin;
  renderPlan();
  // …e correção com dados reais após parar de arrastar.
  window.clearTimeout(shiftTimer);
  shiftTimer = window.setTimeout(async () => {
    try {
      setStatus('info', 'Atualizando o clima para o novo horário…');
      basePlan = await planner.planTrip({
        origin: fromPlace as Place,
        destination: toPlace as Place,
        departureISO: shiftDate(baseDepartureISO(), Number(shiftEl.value)),
      });
      setStatus('', '');
      renderPlan();
    } catch (e) {
      setStatus('error', `Não deu para atualizar: ${(e as Error).message}. Mostrando o horário aproximado.`);
    }
  }, 700);
});

formEl.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!fromPlace || !toPlace) {
    setStatus('error', 'Escolha a origem e o destino nas sugestões, ou mantenha o exemplo Ijuí → Porto Alegre.');
    return;
  }
  if (!departEl.value) {
    setStatus('error', 'Diga a que horas você pretende sair.');
    return;
  }
  setStatus('info', 'Buscando a rota e o clima de cada trecho…');
  summaryEl.textContent = '';
  renderSkeleton();
  try {
    basePlan = await planner.planTrip({
      origin: fromPlace,
      destination: toPlace,
      departureISO: new Date(departEl.value).toISOString(),
    });
    shiftEl.value = '0';
    lastShiftMin = 0;
    shiftLabel.textContent = '+0min';
    shiftEl.disabled = false;
    shiftRow.classList.remove('disabled');
    setStatus('', '');
    renderPlan();
  } catch (e) {
    setStatus('error', `Não deu para montar a previsão: ${(e as Error).message}. Confira a conexão e tente de novo.`);
    renderEmpty();
  }
});

renderEmpty();
