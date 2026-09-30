import type { TripPlanResult } from '../core/types';
import { reevaluateTimeline } from '../core/journey';

/**
 * Harness visual DEV-only: transforma o plano real em cenário de atenção
 * ou perigo para validar amarelo/vermelho sem depender do clima do dia.
 * Ativo só com `?demo=atencao|perigo` em `import.meta.env.DEV`. A UI exibe
 * um aviso "demonstração" e produção nunca vê estes dados.
 */
export function demoMode(): 'atencao' | 'perigo' | null {
  if (!import.meta.env.DEV) return null;
  const m = new URLSearchParams(window.location.search).get('demo');
  return m === 'atencao' || m === 'perigo' ? m : null;
}

export function applyDemo(plan: TripPlanResult, mode: 'atencao' | 'perigo'): TripPlanResult {
  const total = plan.timeline.length;
  const timeline = plan.timeline.map((s, i) => {
    const f = i / Math.max(1, total - 1);
    if (mode === 'atencao' && f >= 0.4 && f <= 0.6) {
      return {
        ...s,
        weather: { ...s.weather, weatherCode: 61, precipitationProb: 68, windKmh: 32, gustsKmh: 45 },
      };
    }
    if (mode === 'perigo' && f >= 0.55 && f <= 0.75) {
      return {
        ...s,
        weather: { ...s.weather, weatherCode: 95, precipitationProb: 92, windKmh: 58, gustsKmh: 71, visibilityM: 600 },
      };
    }
    return s;
  });
  const fixed = reevaluateTimeline(timeline);
  const worst = fixed.reduce((a, b) => (b.hazardScore > a.hazardScore ? b : a), fixed[0]);
  return { ...plan, timeline: fixed, worstHazard: worst.hazard, summary: `Demonstração (${mode}).` };
}
