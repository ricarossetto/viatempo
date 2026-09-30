import type { TripPlanResult } from '../core/types';
import { summarizeJourney, type WeatherChapter } from '../core/journey';
import { weatherKind, weatherSvg } from '../map/weatherIcons';
import { wmoToLabel } from '../lib/wmo';

/** Cor de fenômeno (condição), independente do hazard. */
export const KIND_BG: Record<string, string> = {
  sol: '#f6e6bd',
  'sol-nuvem': '#ece7d0',
  nublado: '#dde3e0',
  nevoeiro: '#d9d9d3',
  garoa: '#cfdfee',
  chuva: '#bcd0e9',
  tempestade: '#c9c1da',
  neve: '#e1ebf3',
};

function fmtHour(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export interface RibbonCallbacks {
  onChapterHover(index: number | null): void;
  onChapterSelect(index: number): void;
}

/**
 * Visão geral da viagem: capítulos proporcionais à distância, com ícone,
 * temperatura e extremos origem/destino. Interação sincroniza mapa e timeline.
 */
export function renderRibbon(
  el: HTMLElement,
  plan: TripPlanResult,
  cb: RibbonCallbacks,
): void {
  const j = summarizeJourney(plan.timeline);
  const totalKm = plan.route.distanceM / 1000 || 1;
  const origin = plan.origin.name;
  const dest = plan.destination.name;

  el.innerHTML =
    `<div class="ribbon-ends"><span>${origin} · ${fmtHour(plan.departureISO)}</span>` +
    `<span>${fmtHour(plan.arrivalISO)} · ${dest}</span></div>` +
    `<div class="ribbon-track" role="group" aria-label="Trechos de clima da viagem">` +
    j.chapters.map((c, i) => chapterHtml(c, totalKm, i)).join('') +
    `</div>` +
    eventHtml(j.mostRelevantSample
      ? { atISO: j.mostRelevantSample.atISO, distKm: j.mostRelevantSample.distKm, code: j.mostRelevantSample.weather.weatherCode }
      : undefined);

  el.querySelectorAll<HTMLButtonElement>('.chapter').forEach((btn) => {
    const i = Number(btn.dataset.i);
    btn.addEventListener('mouseenter', () => cb.onChapterHover(i));
    btn.addEventListener('mouseleave', () => cb.onChapterHover(null));
    btn.addEventListener('focus', () => cb.onChapterHover(i));
    btn.addEventListener('blur', () => cb.onChapterHover(null));
    btn.addEventListener('click', () => cb.onChapterSelect(i));
  });
}

/** Skeleton contextual da ribbon (faixa + evento). */
export function renderRibbonSkeleton(el: HTMLElement): void {
  el.innerHTML =
    `<div class="ribbon-ends"><span>···</span><span>···</span></div>` +
    `<div class="ribbon-track skel"><span></span><span></span><span></span></div>` +
    `<p class="ribbon-event calm">Consultando o clima…</p>`;
}

function chapterHtml(c: WeatherChapter, totalKm: number, i: number): string {
  const w = Math.max(6, ((c.toKm - c.fromKm) / totalKm) * 100);
  const dot = c.hazard === 'ok' ? '' : `<span class="ch-hazard ${c.hazard}" aria-hidden="true"></span>`;
  const range = c.fromKm === c.toKm
    ? `km ${Math.round(c.fromKm)}`
    : `km ${Math.round(c.fromKm)}–${Math.round(c.toKm)}`;
  return `<button type="button" class="chapter" data-i="${i}" style="flex-grow:${w.toFixed(1)};--cond:${KIND_BG[c.kind] ?? '#dde3e0'}" ` +
    `aria-label="${c.label}, ${range}, ${c.representativeTempC} graus">` +
    `<span class="ch-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${weatherSvg(c.kind)}</svg></span>` +
    `<span class="ch-temp">${c.representativeTempC}°</span>${dot}</button>`;
}

function eventHtml(ev?: { atISO: string; distKm: number; code: number }): string {
  if (!ev) return `<p class="ribbon-event calm">Condição estável durante quase todo o trajeto.</p>`;
  const info = wmoToLabel(ev.code);
  return `<p class="ribbon-event"><span class="ch-icon sm" aria-hidden="true"><svg viewBox="0 0 24 24">${weatherSvg(weatherKind(ev.code))}</svg></span>` +
    `<span>${info.label} às ${fmtHour(ev.atISO)} · km ${Math.round(ev.distKm)}</span></p>`;
}
