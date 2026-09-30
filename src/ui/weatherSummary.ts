import type { TripPlanResult } from '../core/types';
import { summarizeJourney, type JourneyWeatherSummary } from '../core/journey';
import { weatherSvg } from '../map/weatherIcons';
import { currentNumber, numberRoll } from './motion';

function fmtHour(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** Linha do evento mais relevante, só com dados reais. */
function eventLine(j: JourneyWeatherSummary): string {
  const s = j.mostRelevantSample;
  if (!s) return 'Condição estável durante quase todo o trajeto.';
  return `${eventKindLabel(s.weather.weatherCode)} por volta das ${fmtHour(s.atISO)}, próximo ao km ${Math.round(s.distKm)}.`;
}

import { weatherKind } from '../map/weatherIcons';

function eventKindLabel(code: number): string {
  switch (weatherKind(code)) {
    case 'sol': return 'Sol forte';
    case 'sol-nuvem': return 'Sol entre nuvens';
    case 'nublado': return 'Período nublado';
    case 'nevoeiro': return 'Nevoeiro';
    case 'garoa': return 'Garoa leve';
    case 'chuva': return 'Chuva';
    case 'tempestade': return 'Temporal';
    case 'neve': return 'Neve';
  }
}

/**
 * Protagonista da página: condição dominante grande, evento relevante,
 * faixa de temperatura e fatos. Números fazem roll ao atualizar.
 */
export function renderWeatherSummary(el: HTMLElement, plan: TripPlanResult): void {
  const j = summarizeJourney(plan.timeline);
  const prevMin = el.querySelector('[data-r="min"]');
  const prevMax = el.querySelector('[data-r="max"]');
  const prevRain = el.querySelector('[data-r="rain"]');
  const prevWind = el.querySelector('[data-r="wind"]');

  document.body.dataset.hazard = plan.worstHazard;
  el.innerHTML =
    `<div class="j-icon big" aria-hidden="true"><svg viewBox="0 0 24 24">${weatherSvg(j.dominantKind)}</svg></div>` +
    `<div class="j-main">` +
    `<p class="j-dom">${j.dominantLabel}</p>` +
    `<p class="j-event">${eventLine(j)}</p>` +
    `<p class="j-temps"><b><span data-r="min">${j.minTempC}°</span>–<span data-r="max">${j.maxTempC}°</span></b></p>` +
    `<ul class="j-facts">` +
    `<li>chuva máx. <b data-r="rain">${j.maxRainProbability}%</b></li>` +
    `<li>vento máx. <b data-r="wind">${j.maxWindKmh} km/h</b></li>` +
    `<li>${(plan.route.distanceM / 1000).toFixed(0)} km · ${fmtDur(plan.route.durationS)} · chegada ${fmtHour(plan.arrivalISO)}</li>` +
    `</ul>` +
    `<p class="j-note">${j.stable ? 'Sem condição de risco relevante.' : 'Trecho classificado como ' + (plan.worstHazard === 'perigo' ? 'perigo' : 'atenção') + '.'}</p>` +
    `</div>`;

  // number roll a partir dos valores anteriores (quando existirem)
  const minEl = el.querySelector('[data-r="min"]')!;
  const maxEl = el.querySelector('[data-r="max"]')!;
  const rainEl = el.querySelector('[data-r="rain"]')!;
  const windEl = el.querySelector('[data-r="wind"]')!;
  if (prevMin) {
    numberRoll(minEl, currentNumber(prevMin, j.minTempC), j.minTempC, (n) => `${n}°`);
    numberRoll(maxEl, currentNumber(prevMax!, j.maxTempC), j.maxTempC, (n) => `${n}°`);
    numberRoll(rainEl, currentNumber(prevRain!, j.maxRainProbability), j.maxRainProbability, (n) => `${n}%`);
    numberRoll(windEl, currentNumber(prevWind!, j.maxWindKmh), j.maxWindKmh, (n) => `${n} km/h`);
  }
}

/** Skeleton contextual do summary (mesma forma do conteúdo real). */
export function renderJourneySkeleton(el: HTMLElement): void {
  el.innerHTML =
    `<div class="j-icon big skel" aria-hidden="true"></div>` +
    `<div class="j-main"><div class="skel-line wide"></div><div class="skel-line"></div>` +
    `<div class="skel-line short"></div></div>`;
}

function fmtDur(totalS: number): string {
  const h = Math.floor(totalS / 3600);
  const m = Math.round((totalS % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
}
