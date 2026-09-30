import './style.css';
import type { Place, RouteCandidate, TripPlanResult } from './core/types';
import { createTripPlanner, geocoder } from './core/tripPlanner';
import { initMap } from './map/mapController';
import { renderWeatherSummary, renderJourneySkeleton } from './ui/weatherSummary';
import { renderRibbon, renderRibbonSkeleton } from './ui/forecastRibbon';
import { renderRouteSelector, syncRouteSelector } from './ui/routeSelector';
import { renderTimeline, renderTimelineSkeleton } from './ui/timeline';
import { demoMode, applyDemo } from './ui/demo';
import { summarizeJourney } from './core/journey';

const planner = createTripPlanner();
const demo = demoMode();

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<a class="skip" href="#wxPanel">Pular para a previsão</a>
<header id="hero">
  <div class="hero-full">
    <div class="brand"><img src="/favicon.svg" alt="" /> Clima de estrada</div>
    <h1>Saiba o tempo que você vai encontrar pelo caminho.</h1>
    <p class="lede">Veja chuva, vento, temperatura e visibilidade no horário em que você passar por cada trecho.</p>
  </div>
  <div class="hero-mini">
    <span class="brand"><img src="/favicon.svg" alt="" /> Clima de estrada</span>
    <p class="hero-route"><b id="hmFrom">Ijuí</b><span aria-hidden="true"> → </span><b id="hmTo">Porto Alegre</b></p>
    <p class="hero-time">saída <b id="hmTime">08:00</b></p>
    <button type="button" class="ghost" id="editSearch">Alterar</button>
  </div>
</header>
<section class="panel" id="searchPanel">
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
<section id="wxPanel" aria-label="Previsão da viagem" tabindex="-1" hidden>
  <p class="demo-badge" id="demoBadge" hidden>Demonstração com dados simulados</p>
  <div class="summary journey" id="summary" tabindex="-1"></div>
  <div class="ribbon" id="ribbon"></div>
</section>
<div class="map-wrap">
  <div id="map" role="img" aria-label="Mapa da rota com pontos de previsão do tempo"></div>
  <p class="map-hint" id="mapHint">Sua previsão aparece ao longo da estrada. Escolha origem, destino e horário para começar.</p>
</div>
<fieldset class="routes chips" id="routesFs" hidden>
  <legend>Rota <span id="routeCount"></span></legend>
  <div class="route-cards" id="routeCards"></div>
</fieldset>
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
<div class="detail-wrap" id="detailWrap" hidden>
  <button type="button" class="ghost wide" id="detailToggle" aria-expanded="false">Ver trecho a trecho</button>
  <div class="roadstrip" id="timeline" role="list" aria-label="Previsão trecho a trecho" hidden></div>
</div>
<footer>Trajeto por <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> (roteamento OSRM). Clima por <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> (CC-BY 4.0). Sem cadastro, sem chave.</footer>
`;

const fromEl = app.querySelector<HTMLInputElement>('#from')!;
const toEl = app.querySelector<HTMLInputElement>('#to')!;
const departEl = app.querySelector<HTMLInputElement>('#depart')!;
const formEl = app.querySelector<HTMLFormElement>('#searchForm')!;
const statusEl = app.querySelector<HTMLParagraphElement>('#status')!;
const liveEl = app.querySelector<HTMLParagraphElement>('#live')!;
const summaryEl = app.querySelector<HTMLDivElement>('#summary')!;
const ribbonEl = app.querySelector<HTMLDivElement>('#ribbon')!;
const wxPanel = app.querySelector<HTMLElement>('#wxPanel')!;
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
const detailWrap = app.querySelector<HTMLDivElement>('#detailWrap')!;
const detailToggle = app.querySelector<HTMLButtonElement>('#detailToggle')!;
const timelineEl = app.querySelector<HTMLDivElement>('#timeline')!;
const hmFrom = app.querySelector<HTMLElement>('#hmFrom')!;
const hmTo = app.querySelector<HTMLElement>('#hmTo')!;
const hmTime = app.querySelector<HTMLElement>('#hmTime')!;
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
  detailed: false,
  firstSearch: true,
};

const mapCtl = initMap(app.querySelector<HTMLDivElement>('#map')!);
mapCtl.onRouteClick((id) => void selectRoute(id));
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
  return `${routeId}@${departureKey()}${demo ? `#${demo}` : ''}`;
}

let lastWeathers: Array<{ temp: number; chuva: number }> = [];

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

function currentPlan(): TripPlanResult | undefined {
  return session.plans.get(planKey(session.selectedId));
}

function renderAll(plan: TripPlanResult, opts?: { reveal?: boolean }) {
  renderWeatherSummary(summaryEl, plan);
  renderRibbon(ribbonEl, plan, {
    onChapterHover: (i) => {
      if (i === null) {
        mapCtl.highlightSample(session.selectedStop);
        return;
      }
      const ch = summarizeJourney(plan.timeline).chapters[i];
      if (ch) {
        const mid = ch.sampleIndexes[Math.floor(ch.sampleIndexes.length / 2)];
        mapCtl.highlightSample(mid);
      }
    },
    onChapterSelect: (i) => {
      const ch = summarizeJourney(plan.timeline).chapters[i];
      if (ch) selectStop(ch.sampleIndexes[Math.floor(ch.sampleIndexes.length / 2)], false);
    },
  });
  renderTimeline(timelineEl, plan, diffWeathers(plan), timelineCallbacks());
  mapCtl.drawWeather(plan.route.id, plan.timeline, { reveal: opts?.reveal });
  if (opts?.reveal) {
    summaryEl.classList.remove('reveal');
    ribbonEl.classList.remove('reveal');
    void summaryEl.offsetWidth;
    summaryEl.classList.add('reveal');
    ribbonEl.classList.add('reveal');
  }
  updateShiftEta(plan);
}

function selectStop(i: number, fromMap: boolean) {
  session.selectedStop = i;
  mapCtl.focusSample(i);
  if (fromMap) {
    if (timelineEl.hidden) setDetailed(true);
    timelineEl.querySelector<HTMLButtonElement>(`.stop[data-i="${i}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function setDetailed(on: boolean) {
  session.detailed = on;
  timelineEl.hidden = !on;
  detailToggle.setAttribute('aria-expanded', String(on));
  detailToggle.textContent = on
    ? 'Ocultar detalhe'
    : `Ver trecho a trecho (${currentPlan()?.timeline.length ?? ''})`.trim();
  // Marcadores do mapa ficam sempre todos visíveis; o toggle controla só a timeline.
}

detailToggle.addEventListener('click', () => setDetailed(!session.detailed));

/* ---------------- fluxos ---------------- */

async function ensurePlan(routeId: string): Promise<TripPlanResult> {
  const key = planKey(routeId);
  const hit = session.plans.get(key);
  if (hit) return hit;
  const route = session.candidates.find((r) => r.id === routeId);
  if (!route || !session.origin || !session.destination) throw new Error('Sessão inválida');
  const raw = await planner.planRoute(route, session.origin, session.destination, departureKey(), {
    onProgress: (stage) => {
      if (stage === 'weather') setStatus('info', 'Consultando o clima desta rota…');
    },
  });
  const plan = demo ? applyDemo(raw, demo) : raw;
  session.plans.set(key, plan);
  return plan;
}

async function selectRoute(routeId: string) {
  if (!session.candidates.length) return;
  const changed = routeId !== session.selectedId;
  session.selectedId = routeId;
  session.selectedStop = -1;
  // geometria destacada na hora; clima entra quando estiver pronto (cache ou fetch)
  mapCtl.selectRoute(routeId);
  syncRouteSelector(routeCardsEl, routeId);
  if (!changed) {
    const existing = session.plans.get(planKey(routeId));
    if (existing) {
      renderAll(existing);
      updateShiftEta(existing);
    }
    return;
  }
  const key = planKey(routeId);
  const hit = session.plans.get(key);
  if (hit) {
    setStatus('', '');
    renderAll(hit);
    updateShiftEta(hit);
    liveEl.textContent = `Rota ${routeName(session.candidates.find((r) => r.id === routeId)!)} selecionada.`;
    return;
  }
  // loading local: mapa permanece, ribbon usa skeleton, timeline some por ora
  setStatus('info', 'Consultando o clima desta rota…');
  renderJourneySkeleton(summaryEl);
  renderRibbonSkeleton(ribbonEl);
  renderTimelineSkeleton(timelineEl);
  syncRouteSelector(routeCardsEl, routeId);
  try {
    const plan = await ensurePlan(routeId);
    setStatus('', '');
    renderAll(plan);
    updateShiftEta(plan);
    liveEl.textContent = 'Rota selecionada. Previsão atualizada.';
  } catch (e) {
    setStatus('error', `Não deu para ver o clima desta rota: ${(e as Error).message}. Tente de novo.`);
  }
}

/* ---------------- horário ---------------- */

let shiftTimer = 0;

function setShift(min: number) {
  session.shiftMin = min;
  shiftEl.value = String(min);
  shiftLabel.textContent = `${min >= 0 ? '+' : ''}${min}min`;
  baseShiftBtn.textContent = fmtHour(session.baseDepartureISO);
  hmTime.textContent = fmtHour(departureKey());
  const plan = currentPlan();
  if (plan) {
    // preview instantâneo + correção com dados reais (só clima, sem OSRM)
    const preview = planner.retimeTimeline(plan, departureKey());
    renderWeatherSummary(summaryEl, preview);
    renderRibbon(ribbonEl, preview, ribbonCallbacks(preview));
    renderTimeline(timelineEl, preview, diffWeathers(preview), timelineCallbacks());
    updateShiftEta(preview);
  }
  window.clearTimeout(shiftTimer);
  shiftTimer = window.setTimeout(async () => {
    try {
      setStatus('info', 'Consultando o clima…');
      const fresh = await ensurePlan(session.selectedId);
      setStatus('', '');
      renderAll(fresh);
      updateShiftEta(fresh);
      liveEl.textContent = `Horário atualizado: saída ${fmtHour(fresh.departureISO)}.`;
    } catch (e) {
      setStatus('error', `Não deu para atualizar: ${(e as Error).message}. Mostrando o horário aproximado.`);
    }
  }, 700);
}

function ribbonCallbacks(plan: TripPlanResult) {
  return {
    onChapterHover: (i: number | null) => {
      if (i === null) {
        mapCtl.highlightSample(session.selectedStop);
        return;
      }
      const ch = summarizeJourney(plan.timeline).chapters[i];
      if (ch) mapCtl.highlightSample(ch.sampleIndexes[Math.floor(ch.sampleIndexes.length / 2)]);
    },
    onChapterSelect: (i: number) => {
      const ch = summarizeJourney(plan.timeline).chapters[i];
      if (ch) selectStop(ch.sampleIndexes[Math.floor(ch.sampleIndexes.length / 2)], false);
    },
  };
}

function timelineCallbacks() {
  return {
    onHighlight: (i: number | null) => mapCtl.highlightSample(i === null ? session.selectedStop : i),
    onSelect: (i: number) => selectStop(i, false),
  };
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

/* ---------------- hero compacto ---------------- */

function compactHero() {
  document.body.dataset.state = 'ready';
  hmFrom.textContent = session.origin?.name ?? fromEl.value;
  hmTo.textContent = session.destination?.name ?? toEl.value;
  hmTime.textContent = fmtHour(departureKey() || session.baseDepartureISO);
}

app.querySelector('#editSearch')!.addEventListener('click', () => {
  document.body.dataset.state = '';
  app.querySelector('#searchPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  fromEl.focus({ preventScroll: true });
});

/* ---------------- busca ---------------- */

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
  session.origin = fromPlace;
  session.destination = toPlace;
  session.baseDepartureISO = new Date(departEl.value).toISOString();
  session.plans.clear();
  session.shiftMin = 0;
  session.selectedStop = -1;
  session.detailed = false;
  lastWeathers = [];
  shiftEl.value = '0';
  shiftLabel.textContent = '+0min';
  baseShiftBtn.textContent = fmtHour(session.baseDepartureISO);
  detailToggle.textContent = 'Ver trecho a trecho';
  detailToggle.setAttribute('aria-expanded', 'false');
  timelineEl.hidden = true;

  goBtn.disabled = true;
  goBtn.textContent = 'Buscando rotas…';
  // T+150ms: hero compacta enquanto as rotas chegam (morph, sem jank)
  window.setTimeout(() => {
    if (goBtn.disabled) compactHero();
  }, 150);
  setStatus('info', 'Buscando rotas…');
  renderJourneySkeleton(summaryEl);
  renderRibbonSkeleton(ribbonEl);
  wxPanel.hidden = false;
  mapHintEl.hidden = true;
  shiftFs.disabled = false;
  try {
    const routes = await planner.findRoutes(fromPlace, toPlace);
    if (!routes.length) throw new Error('Rota não encontrada');
    session.candidates = routes;
    session.selectedId = routes[0].id;
    // detalhe começa colapsado (progressive disclosure); shift e toggle aparecem
    shiftFs.hidden = false;
    detailWrap.hidden = false;
    // Etapa B: mostra rotas na hora, com animação só na primeira busca
    const animate = session.firstSearch;
    session.firstSearch = false;
    mapCtl.setRouteCandidates(routes, session.selectedId, { animate });
    mapCtl.fitAll();
    renderRouteSelector(routesFs, routeCardsEl, routeCountEl, routes, session.selectedId, {
      onSelect: (id) => void selectRoute(id),
      onPreview: (id) => mapCtl.previewRoute(id),
    });
    goBtn.textContent = 'Consultando o clima…';
    setStatus('info', 'Consultando o clima…');
    const plan = await ensurePlan(session.selectedId);
    setStatus('', '');
    app.querySelector<HTMLParagraphElement>('#demoBadge')!.hidden = !demo;
    renderAll(plan, { reveal: reducedMotionOff() });
    hmTime.textContent = fmtHour(plan.departureISO);
    updateShiftEta(plan);
    detailToggle.textContent = `Ver trecho a trecho (${plan.timeline.length})`;
    liveEl.textContent = `Previsão pronta: ${plan.timeline.length} trechos, chegada ${fmtHour(plan.arrivalISO)}.`;
  } catch (e) {
    document.body.dataset.state = '';
    setStatus('error', `Não deu para montar a previsão: ${(e as Error).message}. Confira a conexão e tente de novo.`);
    mapHintEl.hidden = false;
  } finally {
    goBtn.disabled = false;
    goBtn.textContent = 'Ver previsão';
  }
});

function reducedMotionOff(): boolean {
  return typeof matchMedia !== 'function' || !matchMedia('(prefers-reduced-motion: reduce)').matches;
}
