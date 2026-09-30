import type { RouteCandidate } from '../core/types';

export interface RouteSelectorCallbacks {
  onSelect(routeId: string): void;
  onPreview(routeId: string | null): void;
}

function fmtDur(totalS: number): string {
  const h = Math.floor(totalS / 3600);
  const m = Math.round((totalS % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
}

function routeName(r: RouteCandidate): string {
  return r.roadNames.length ? `Via ${r.roadNames.join(' / ')}` : `Rota ${r.rank + 1}`;
}

/**
 * Controle secundário: chips compactos em linha (radio nativo).
 * Escondido quando há 1 rota. Sem badges subjetivos, só deltas objetivos.
 */
export function renderRouteSelector(
  fieldset: HTMLElement,
  cardsEl: HTMLElement,
  countEl: HTMLElement,
  routes: RouteCandidate[],
  selectedId: string,
  cb: RouteSelectorCallbacks,
): void {
  countEl.textContent = `(${routes.length})`;
  if (routes.length < 2) {
    fieldset.hidden = true;
    return;
  }
  fieldset.hidden = false;
  const minDur = Math.min(...routes.map((r) => r.durationS));
  const minDist = Math.min(...routes.map((r) => r.distanceM));
  const fastest = routes.filter((r) => r.durationS === minDur);
  const shortest = routes.filter((r) => r.distanceM === minDist);
  const bothSame = fastest.length === 1 && shortest.length === 1 && fastest[0].id === shortest[0].id;

  cardsEl.innerHTML = '';
  for (const r of routes) {
    const label = document.createElement('label');
    label.className = 'route-chip' + (r.id === selectedId ? ' selected' : '');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'route';
    radio.value = r.id;
    radio.checked = r.id === selectedId;
    radio.addEventListener('change', () => cb.onSelect(r.id));
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
    const sub = [...badges, ...deltas].join(' · ');
    label.innerHTML =
      `<span class="chip-dot" aria-hidden="true"></span>` +
      `<span class="chip-text"><span class="chip-name">${routeName(r)}</span>` +
      `<span class="chip-meta">${(r.distanceM / 1000).toFixed(0)} km · ${fmtDur(r.durationS)}${sub ? ` · ${sub}` : ''}</span></span>`;
    label.prepend(radio);
    label.addEventListener('mouseenter', () => cb.onPreview(r.id));
    label.addEventListener('mouseleave', () => cb.onPreview(null));
    radio.addEventListener('focus', () => cb.onPreview(r.id));
    radio.addEventListener('blur', () => cb.onPreview(null));
    cardsEl.append(label);
  }
}

export function syncRouteSelector(cardsEl: HTMLElement, selectedId: string): void {
  cardsEl.querySelectorAll<HTMLInputElement>('input[name="route"]').forEach((r) => {
    r.checked = r.value === selectedId;
    r.closest('.route-chip')?.classList.toggle('selected', r.checked);
  });
}
