// Primitivas de motion: só transform/opacity/numbers, sem biblioteca.
// Tudo respeita prefers-reduced-motion (retorna estado final imediato).
export const reducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const rolls = new WeakMap<Element, number>();

/** Number roll discreto (~350ms, ease-out). Valores finais sempre legíveis. */
export function numberRoll(el: Element, from: number, to: number, format: (n: number) => string): void {
  const prev = rolls.get(el);
  if (prev) cancelAnimationFrame(prev);
  if (reducedMotion || from === to) {
    el.textContent = format(to);
    return;
  }
  const t0 = performance.now();
  const dur = 380;
  const step = (t: number) => {
    const f = Math.min(1, (t - t0) / dur);
    const eased = 1 - (1 - f) * (1 - f);
    el.textContent = format(Math.round(from + (to - from) * eased));
    if (f < 1) rolls.set(el, requestAnimationFrame(step));
    else rolls.delete(el);
  };
  rolls.set(el, requestAnimationFrame(step));
}

/** Lê número atual de um elemento (para animar a partir dele). */
export function currentNumber(el: Element, fallback: number): number {
  const m = (el.textContent ?? '').replace(/[^0-9-]/g, '');
  const n = Number.parseInt(m, 10);
  return Number.isFinite(n) ? n : fallback;
}
