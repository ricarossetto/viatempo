import type { TripPlanResult } from '../core/types';
import { wmoToLabel } from '../lib/wmo';
import { iconSvg } from '../map/weatherIcons';

function fmtHour(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export interface TimelineCallbacks {
  onHighlight(index: number | null): void;
  onSelect(index: number): void;
}

/** Detalhamento trecho a trecho (nível secundário, atrás de toggle). */
export function renderTimeline(
  el: HTMLElement,
  plan: TripPlanResult,
  changed: Array<boolean>,
  cb: TimelineCallbacks,
): void {
  el.innerHTML =
    `<div class="road" aria-hidden="true"></div>` +
    plan.timeline
      .map((s, i) => {
        const info = wmoToLabel(s.weather.weatherCode);
        const vis = s.weather.visibilityM > 0 && s.weather.visibilityM < 8000
          ? ` · vis. ${(s.weather.visibilityM / 1000).toFixed(0)} km` : '';
        const dupCond = s.reason.toLowerCase() === info.label.toLowerCase();
        const reason = s.reason === 'tempo bom' || dupCond ? '' : `<span class="reason">${s.reason}</span>`;
        return `<button type="button" class="stop ${s.hazard}${changed[i] ? ' tick' : ''}" data-i="${i}" aria-label="${fmtHour(s.atISO)}, km ${Math.round(s.distKm)}, ${info.label}, ${s.weather.tempC.toFixed(0)} graus">` +
          `<span class="dot" aria-hidden="true"></span><span class="stop-body">` +
          `<time>${fmtHour(s.atISO)}</time><span class="km">km ${Math.round(s.distKm)}</span>` +
          `<span class="icon" aria-hidden="true">${iconSvg(s.weather.weatherCode, 30)}</span><span class="cond">${info.label}</span>` +
          `<span class="temp">${s.weather.tempC.toFixed(0)}°</span>` +
          `<span class="meta">Chuva ${Math.round(s.weather.precipitationProb)}%, vento ${Math.round(s.weather.windKmh)} km/h${vis}</span>` +
          `${reason}</span></button>`;
      })
      .join('');
  el.querySelectorAll<HTMLButtonElement>('.stop').forEach((btn) => {
    const i = Number(btn.dataset.i);
    btn.addEventListener('mouseenter', () => cb.onHighlight(i));
    btn.addEventListener('mouseleave', () => cb.onHighlight(null));
    btn.addEventListener('focus', () => cb.onHighlight(i));
    btn.addEventListener('blur', () => cb.onHighlight(null));
    btn.addEventListener('click', () => cb.onSelect(i));
  });
}

export function renderTimelineSkeleton(el: HTMLElement): void {
  el.innerHTML =
    `<div class="road" aria-hidden="true"></div>` +
    Array.from({ length: 6 }, () => `<div class="stop skel"><span class="dot"></span><div class="stop-body"><b>··:··</b></div></div>`).join('');
}
