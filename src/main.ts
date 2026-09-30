import './style.css';
import type { Place, RouteCandidate, TripPlanResult } from './core/types';
import { createTripPlanner, geocoder } from './core/tripPlanner';
import { initMap } from './map/mapController';
import { wmoToLabel } from './lib/wmo';

const planner = createTripPlanner();

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<a class="skip" href="#summary">Pular para o resultado</a>
<header>
  <div class="brand"><img src="/favicon.svg" alt="" /> Clima de estrada</div>
  <h1>Saiba o tempo que você vai encontrar pelo caminho.</h1>
  <p class="lede">Veja chuva, vento, temperatura e visibilidade no horário em que você passar por cada trecho.</p>
</header>
<section class="panel">
  <form class="form" id="searchForm" aria-label="Buscar previsão da rota">
    <label class="field"><span>Origem</span><input id="from" value="Ijuí, RS" autocomplete="off" placeholder="Ex.: Ijuí, RS" /><div id="fromList" class="suggest"></div></label>
    <span class="swap-arrow" aria-hidden="true">→</span>
    <label class="field"><span>Destino</span><input id="to" value="Porto Alegre, RS" autocomplete="off" placeholder="Ex.: Porto Alegre, RS" /><div id="toList" class="suggest"></div></label>
    <label class="field"><span>Saída</span><input id="depart" type="datetime-local" /></label>
    <button class="primary" type="submit">Ver previsão</button>
  </form>
</section>
<p class="notice" id="status" role="status"></p>
<p class="sr-only" role="status" id="live"></p>
<div class="result-top">
  <div class="summary" id="summary" tabindex="-1"></div>
  <fieldset class="routes" id="routesFs" hidden>
    <legend>Rotas encontradas <span id="routeCount"></span></legend>
    <div class="route-cards" id="routeCards"></div>
  </fieldset>
</div>
<div class="map-wrap">
  <div id="map" role="img" aria-label="Mapa da rota com pontos de previsão do tempo"></div>
  <p class="map-hint" id="mapHint">Sua previsão aparece ao longo da estrada. Escolha origem, destino e horário para começar.</p>
</div>
<fieldset class="shift-panel" id="shiftFs" disabled hidden>
  <legend>E se eu sair em outro horário?</legend>
  <div class="quick" id="quickRow">
    <button type="button" data-shift="-60">−1h</button>
    <button type="button" data-shift="-30">−30min</button>
    <button type="button" data-shift="0" id="baseShift">08:00</button>
    <button type="button" data-shift="30">+30min</button>
    <button type="button" data-shift="60">+1h</button>
    <button type="button" data-shift="120">+2h</button>
  </div>
  <div class="shift-fine">
    <input id="shift" type="range" min="-180" max="360" step="30" value="0" aria-label="Ajuste fino do horário de saída em minutos" />
    <output id="shiftLabel" for="shift">+0min</output>
  </div>
  <div class="shift-eta" id="shiftEta" hidden>
    <div><span>Saída</span><b id="etaOut">–</b></div>
    <div><span>Chegada</span><b id="etaIn">–</b></div>
  </div>
</fieldset>
<div class="roadstrip" id="timeline" role="list" aria-label="Previsão trecho a trecho" hidden></div>
<footer>Trajeto por <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> (roteamento OSRM). Clima por <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> (CC-BY 4.0). Sem cadastro, sem chave.</footer>
`;

const fromEl = app.querySelector<HTMLInputElement>('#from')!;
const toEl = app.querySelector<HTMLInputElement>('#to')!;
const departEl = app.querySelector<HTMLInputElement>('#depart')!;
const formEl = app.querySelector<HTMLFormElement>('#searchForm')!;
const statusEl = app.querySelector<HTMLParagraphElement>('#status')!;
const liveEl = app.querySelector<HTMLParagraphElement>('#live')!;
const summaryEl = app.querySelector<HTMLDivElement>('#summary')!;
const timelineEl = app.querySelector<HTMLDivElement>('#timeline')!;
const routesFs = app.querySelector<HTMLElement>('#routesFs')!;
const routeCardsEl = app.querySelector<HTMLDivElement>('#routeCards')!;
const routeCountEl = app.querySelector<HTMLSpanElement>('#routeCount')!;
const shiftFs = app.querySelector<HTMLFieldSetElement>('#shiftFs')!;
const shiftEl = app.querySelector<HTMLInputElement>('#shift')!;
const shiftLabel = app.querySelector<HTMLOutputElement>('#shiftLabel')!;
const baseShiftBtn = app.querySelector<HTMLButtonElement>('#baseShift')!;
const etaOutEl = app.querySelector<HTMLElement>('#etaOut')!;
const etaInEl = app.querySelector<HTMLElement>('#etaIn')!;
const shiftEtaEl = app.querySelector<HTMLDivElement>('#shiftEta')!;
const mapHintEl = app.querySelector<HTMLParagraphElement>('#mapHint')!;
const goBtn = formEl.querySelector<HTMLButtonElement>('button.primary')!;

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

/** Sessão: candidatas, seleção e planos por rota+horário. Geometria nunca é refeita. */
const session = {
  origin: null as Place | null,
  destination: null as Place | null,
  baseDepartureISO: '',
  candidates: [] as RouteCandidate[],
  selectedId: '',
  plans: new Map<string, TripPlanResult>(),
  shiftMin: 0,
  selectedStop: -1,
  firstSearch: true,
};

const mapCtl = initMap(app.querySelector<HTMLDivElement>('#map')!);
mapCtl.onRouteClick((id) => void selectRoute(id, true));
mapCtl.onSampleClick((i) => selectStop(i, true));

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

function setStatus(kind: '' | 'info' | 'error', text: string) {
  statusEl.className = kind ? `notice ${kind}` : 'notice';
  statusEl.textContent = text;
}

function fmtHour(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function fmtDur(totalS: number): string {
  const h = Math.floor(totalS / 3600);
  const m = Math.round((totalS % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
}

function routeName(r: RouteCandidate): string {
  return r.roadNames.length ? `Via ${r.roadNames.join(' / ')}` : `Rota ${r.rank + 1}`;
}

function shiftDate(iso: string, min: number): string {
  return new Date(new Date(iso).getTime() + min * 60_000).toISOString();
}

function departureKey(): string {
  return shiftDate(session.baseDepartureISO, session.shiftMin);
}

function planKey(routeId: string): string {
  return `${routeId}@${departureKey()}`;
}

/* ---------------- route cards ---------------- */

function renderRouteCards() {
  const routes = session.candidates;
  routeCountEl.textContent = `(${routes.length})`;
  if (routes.length < 2) {
    routesFs.hidden = true;
    return;
  }
  routesFs.hidden = false;
  const minDur = Math.min(...routes.map((r) => r.durationS));
  const minDist = Math.min(...routes.map((r) => r.distanceM));
  const fastest = routes.filter((r) => r.durationS === minDur);
  const shortest = routes.filter((r) => r.distanceM === minDist);
  const bothSame = fastest.length === 1 && shortest.length === 1 && fastest[0].id === shortest[0].id;

  routeCardsEl.innerHTML = '';
  for (const r of routes) {
    const label = document.createElement('label');
    label.className = 'route-card' + (r.id === session.selectedId ? ' selected' : '');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'route';
    radio.value = r.id;
    radio.checked = r.id === session.selectedId;
    radio.addEventListener('change', () => void selectRoute(r.id, false));
    const dot = document.createElement('span');
    dot.className = 'radio-dot';
    dot.setAttribute('aria-hidden', 'true');
    const body = document.createElement('span');
    body.className = 'route-body';
    const badges: string[] = [];
    if (bothSame && r.id === fastest[0].id) badges.push('Mais rápida e mais curta');
    else {
      if (fastest.some((f) => f.id === r.id)) badges.push('Mais rápida');
      if (shortest.some((f) => f.id === r.id)) badges.push('Mais curta');
    }
    const deltas: string[] = [];
    if (r.durationS > minDur) deltas.push(`+${Math.round((r.durationS - minDur) / 60)} min`);
    if (r.distanceM > minDist && !shortest.some((f) => f.id === r.id)) {
      deltas.push(`+${Math.round((r.distanceM - minDist) / 1000)} km`);
    }
    body.innerHTML =
      `<span class="route-name">${routeName(r)}</span>` +
      `<span class="route-meta">${(r.distanceM / 1000).toFixed(0)} km · ${fmtDur(r.durationS)}</span>` +
      (badges.length || deltas.length
        ? `<span class="route-tags">${[...badges.map((b) => `<em>${b}</em>`), ...deltas.map((d) => `<i>${d}</i>`)].join('')}</span>`
        : '');
    label.append(radio, dot, body);
    label.addEventListener('mouseenter', () => mapCtl.previewRoute(r.id));
    label.addEventListener('mouseleave', () => mapCtl.previewRoute(null));
    radio.addEventListener('focus', () => mapCtl.previewRoute(r.id));
    radio.addEventListener('blur', () => mapCtl.previewRoute(null));
    routeCardsEl.append(label);
  }
}

/* ---------------- brief + timeline ---------------- */

let lastWeathers: Array<{ temp: number; chuva: number }> = [];

function renderBrief(plan: TripPlanResult) {
  const title =
    plan.worstHazard === 'ok' ? 'Viagem tranquila'
    : plan.worstHazard === 'perigo' ? 'Alerta no caminho'
    : 'Atenção no caminho';
  const worst = plan.timeline.reduce((a, b) => (b.hazardScore > a.hazardScore ? b : a), plan.timeline[0]);
  const detail =
    plan.worstHazard === 'ok'
      ? 'Sem chuva relevante no percurso'
      : `Trecho de maior atenção próximo ao km ${Math.round(worst.distKm)}, por volta das ${fmtHour(worst.atISO)}.`;
  document.body.dataset.hazard = plan.worstHazard;
  summaryEl.innerHTML =
    `<div class="brief-head"><span class="led ${plan.worstHazard}" aria-hidden="true"></span>` +
    `<div><strong>${title}</strong><p>${detail}</p></div></div>` +
    `<div class="brief-nums">` +
    `<div><b>${(plan.route.distanceM / 1000).toFixed(0)} km</b><span>distância</span></div>` +
    `<div><b>${fmtDur(plan.route.durationS)}</b><span>duração</span></div>` +
    `<div><b>${fmtHour(plan.arrivalISO)}</b><span>chegada</span></div></div>` +
    `<p class="brief-note">Tempos estimados sem trânsito ao vivo.</p>`;
}

function renderTimeline(plan: TripPlanResult, changedOnly: Array<boolean>) {
  timelineEl.innerHTML =
    `<div class="road" aria-hidden="true"></div>` +
    plan.timeline
      .map((s, i) => {
        const info = wmoToLabel(s.weather.weatherCode);
        const vis = s.weather.visibilityM > 0 && s.weather.visibilityM < 8000
          ? ` · vis. ${(s.weather.visibilityM / 1000).toFixed(0)} km` : '';
        const dupCond = s.reason.toLowerCase() === info.label.toLowerCase();
        const reason = s.reason === 'tempo bom' || dupCond ? '' : `<span class="reason">${s.reason}</span>`;
        return `<button type="button" class="stop ${s.hazard}${changedOnly[i] ? ' tick' : ''}" data-i="${i}" aria-label="${fmtHour(s.atISO)}, km ${Math.round(s.distKm)}, ${info.label}, ${s.weather.tempC.toFixed(0)} graus">` +
          `<span class="dot" aria-hidden="true"></span><span class="stop-body">` +
          `<time>${fmtHour(s.atISO)}</time><span class="km">km ${Math.round(s.distKm)}</span>` +
          `<span class="icon" aria-hidden="true">${info.icon}</span><span class="cond">${info.label}</span>` +
          `<span class="temp">${s.weather.tempC.toFixed(0)}°</span>` +
          `<span class="meta">Chuva ${Math.round(s.weather.precipitationProb)}%, vento ${Math.round(s.weather.windKmh)} km/h${vis}</span>` +
          `${reason}</span></button>`;
      })
      .join('');
  timelineEl.querySelectorAll<HTMLButtonElement>('.stop').forEach((btn) => {
    const i = Number(btn.dataset.i);
    btn.addEventListener('mouseenter', () => mapCtl.highlightSample(i));
    btn.addEventListener('mouseleave', () => mapCtl.highlightSample(session.selectedStop));
    btn.addEventListener('focus', () => mapCtl.highlightSample(i));
    btn.addEventListener('blur', () => mapCtl.highlightSample(session.selectedStop));
    btn.addEventListener('click', () => selectStop(i, false));
  });
}

/** Marca valores que mudaram desde o último render (highlight 500ms, sem piscar tudo). */
function diffWeathers(plan: TripPlanResult): Array<boolean> {
  const cur = plan.timeline.map((s) => ({
    temp: Math.round(s.weather.tempC),
    chuva: Math.round(s.weather.precipitationProb),
  }));
  const out = cur.map((c, i) => {
    const p = lastWeathers[i];
    return !!p && (p.temp !== c.temp || p.chuva !== c.chuva);
  });
  lastWeathers = cur;
  return out;
}

function renderPlan(plan: TripPlanResult) {
  renderBrief(plan);
  renderTimeline(plan, diffWeathers(plan));
  mapCtl.drawWeather(plan.route.id, plan.timeline);
}

function selectStop(i: number, fromMap: boolean) {
  session.selectedStop = i;
  mapCtl.focusSample(i);
  if (fromMap) {
    timelineEl.querySelector<HTMLButtonElement>(`.stop[data-i="${i}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

/* ---------------- fluxos ---------------- */

async function ensurePlan(routeId: string): Promise<TripPlanResult> {
  const key = planKey(routeId);
  const hit = session.plans.get(key);
  if (hit) return hit;
  const route = session.candidates.find((r) => r.id === routeId);
  if (!route || !session.origin || !session.destination) throw new Error('Sessão inválida');
  const plan = await planner.planRoute(route, session.origin, session.destination, departureKey(), {
    onProgress: (stage) => {
      if (stage === 'weather') setStatus('info', 'Consultando o clima desta rota…');
    },
  });
  session.plans.set(key, plan);
  return plan;
}

async function selectRoute(routeId: string, fromMap: boolean) {
  if (!session.candidates.length || routeId === session.selectedId) {
    // já selecionada: garante destaque no mapa
    mapCtl.selectRoute(session.selectedId);
    if (fromMap) syncRadioCards();
    const existing = session.plans.get(planKey(routeId));
    if (existing) {
      renderPlan(existing);
      updateShiftEta(existing);
    }
    return;
  }
  session.selectedId = routeId;
  session.selectedStop = -1;
  mapCtl.selectRoute(routeId);
  syncRadioCards();
  const key = planKey(routeId);
  const hit = session.plans.get(key);
  if (hit) {
    setStatus('', '');
    renderPlan(hit);
    updateShiftEta(hit);
    liveEl.textContent = `Rota ${routeName(session.candidates.find((r) => r.id === routeId)!)} selecionada. ${hit.summary}`;
    return;
  }
  // skeleton só na timeline; mapa e cards ficam
  setStatus('info', 'Consultando o clima desta rota…');
  timelineEl.innerHTML =
    `<div class="road" aria-hidden="true"></div>` +
    Array.from({ length: 6 }, () => `<div class="stop skel"><span class="dot"></span><div class="stop-body"><b>··:··</b></div></div>`).join('');
  try {
    const plan = await ensurePlan(routeId);
    setStatus('', '');
    renderPlan(plan);
    updateShiftEta(plan);
    liveEl.textContent = `Rota selecionada. ${plan.summary}`;
  } catch (e) {
    setStatus('error', `Não deu para ver o clima desta rota: ${(e as Error).message}. Tente de novo.`);
  }
}

function syncRadioCards() {
  routeCardsEl.querySelectorAll<HTMLInputElement>('input[name="route"]').forEach((r) => {
    r.checked = r.value === session.selectedId;
    r.closest('.route-card')?.classList.toggle('selected', r.checked);
  });
}

/* ---------------- horário ---------------- */

let shiftTimer = 0;

function setShift(min: number) {
  session.shiftMin = min;
  shiftEl.value = String(min);
  shiftLabel.textContent = `${min >= 0 ? '+' : ''}${min}min`;
  baseShiftBtn.textContent = fmtHour(session.baseDepartureISO);
  const plan = session.plans.get(planKey(session.selectedId));
  if (plan && session.origin) {
    // preview instantâneo + correção com dados reais (só clima, sem OSRM)
    const preview = planner.retimeTimeline(plan, departureKey());
    renderBrief(preview);
    renderTimeline(preview, diffWeathers(preview));
    updateShiftEta(preview);
  }
  window.clearTimeout(shiftTimer);
  shiftTimer = window.setTimeout(async () => {
    try {
      setStatus('info', 'Consultando o clima…');
      const fresh = await ensurePlan(session.selectedId);
      setStatus('', '');
      renderPlan(fresh);
      updateShiftEta(fresh);
      liveEl.textContent = `Horário atualizado: saída ${fmtHour(fresh.departureISO)}.`;
    } catch (e) {
      setStatus('error', `Não deu para atualizar: ${(e as Error).message}. Mostrando o horário aproximado.`);
    }
  }, 700);
}

function updateShiftEta(plan: TripPlanResult) {
  shiftEtaEl.hidden = false;
  const out = fmtHour(session.baseDepartureISO);
  const shifted = fmtHour(plan.departureISO);
  etaOutEl.textContent = out === shifted ? out : `${out} → ${shifted}`;
  etaInEl.textContent = fmtHour(plan.arrivalISO);
}

shiftEl.addEventListener('input', () => setShift(Number(shiftEl.value)));
app.querySelector('#quickRow')!.addEventListener('click', (ev) => {
  const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-shift]');
  if (btn) setShift(Number(btn.dataset.shift));
});

function setStatusPublic(kind: '' | 'info' | 'error', text: string) {
  setStatus(kind, text);
}

/* ---------------- busca ---------------- */

formEl.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!fromPlace || !toPlace) {
    setStatusPublic('error', 'Escolha a origem e o destino nas sugestões, ou mantenha o exemplo Ijuí → Porto Alegre.');
    return;
  }
  if (!departEl.value) {
    setStatusPublic('error', 'Diga a que horas você pretende sair.');
    return;
  }
  session.origin = fromPlace;
  session.destination = toPlace;
  session.baseDepartureISO = new Date(departEl.value).toISOString();
  session.plans.clear();
  session.shiftMin = 0;
  session.selectedStop = -1;
  lastWeathers = [];
  shiftEl.value = '0';
  shiftLabel.textContent = '+0min';
  baseShiftBtn.textContent = fmtHour(session.baseDepartureISO);

  goBtn.disabled = true;
  goBtn.textContent = 'Buscando…';
  setStatusPublic('info', 'Buscando rotas…');
  summaryEl.innerHTML = '';
  mapHintEl.hidden = true;
  shiftFs.disabled = false;
  try {
    const routes = await planner.findRoutes(fromPlace, toPlace);
    if (!routes.length) throw new Error('Rota não encontrada');
    session.candidates = routes;
    session.selectedId = routes[0].id;
    timelineEl.hidden = false;
    shiftFs.hidden = false;
    // Etapa B: mostra rotas na hora, com animação só na primeira busca
    const animate = session.firstSearch;
    session.firstSearch = false;
    mapCtl.setRouteCandidates(routes, session.selectedId, { animate });
    mapCtl.fitAll();
    renderRouteCards();
    setStatusPublic('info', 'Consultando o clima…');
    const plan = await ensurePlan(session.selectedId);
    setStatusPublic('', '');
    renderPlan(plan);
    updateShiftEta(plan);
    liveEl.textContent = `Previsão pronta: ${plan.timeline.length} trechos, chegada ${fmtHour(plan.arrivalISO)}.`;
  } catch (e) {
    setStatusPublic('error', `Não deu para montar a previsão: ${(e as Error).message}. Confira a conexão e tente de novo.`);
    mapHintEl.hidden = false;
  } finally {
    goBtn.disabled = false;
    goBtn.textContent = 'Ver previsão';
  }
});
