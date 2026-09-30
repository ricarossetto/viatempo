import type { HazardLevel, TimelineSample, TripPlanResult } from './types';
import { weatherKind, type WeatherKind } from '../map/weatherIcons';
import { wmoToLabel } from '../lib/wmo';
import { evaluateHazard } from './hazard';

export interface WeatherChapter {
  kind: WeatherKind;
  label: string;
  fromISO: string;
  toISO: string;
  fromKm: number;
  toKm: number;
  sampleIndexes: number[];
  representativeTempC: number;
  maxRainProbability: number;
  hazard: HazardLevel;
}

export interface JourneyWeatherSummary {
  dominantKind: WeatherKind;
  dominantLabel: string;
  minTempC: number;
  maxTempC: number;
  maxRainProbability: number;
  maxWindKmh: number;
  minVisibilityM: number;
  mostRelevantSample?: TimelineSample;
  chapters: WeatherChapter[];
  stable: boolean;
}

/** Agrupa samples consecutivos de mesma condição em capítulos de viagem. */
export function buildChapters(timeline: TimelineSample[]): WeatherChapter[] {
  const chapters: WeatherChapter[] = [];
  timeline.forEach((s, i) => {
    const kind = weatherKind(s.weather.weatherCode);
    const last = chapters[chapters.length - 1];
    if (last && last.kind === kind) {
      last.toISO = s.atISO;
      last.toKm = s.distKm;
      last.sampleIndexes.push(i);
      last.representativeTempC = Math.round(
        last.sampleIndexes.reduce((a, j) => a + timeline[j].weather.tempC, 0) / last.sampleIndexes.length,
      );
      last.maxRainProbability = Math.max(last.maxRainProbability, Math.round(s.weather.precipitationProb));
      if (hazardRank(s.hazard) > hazardRank(last.hazard)) last.hazard = s.hazard;
    } else {
      chapters.push({
        kind,
        label: wmoToLabel(s.weather.weatherCode).label,
        fromISO: s.atISO,
        toISO: s.atISO,
        fromKm: s.distKm,
        toKm: s.distKm,
        sampleIndexes: [i],
        representativeTempC: Math.round(s.weather.tempC),
        maxRainProbability: Math.round(s.weather.precipitationProb),
        hazard: s.hazard,
      });
    }
  });
  return chapters;
}

function hazardRank(h: HazardLevel): number {
  return h === 'perigo' ? 2 : h === 'atencao' ? 1 : 0;
}

/**
 * Um sample é relevante quando há algo concreto a dizer: risco, chuva
 * forte, vento forte, visibilidade baixa ou tempestade. Sem isso, a
 * viagem é estável e nenhum evento é inventado.
 */
function isRelevant(s: TimelineSample): boolean {
  return (
    s.hazardScore >= 31 ||
    s.weather.precipitationProb >= 50 ||
    s.weather.windKmh >= 50 ||
    (s.weather.visibilityM > 0 && s.weather.visibilityM < 1000) ||
    s.weather.weatherCode >= 95
  );
}

export function summarizeJourney(timeline: TimelineSample[]): JourneyWeatherSummary {
  const temps = timeline.map((s) => s.weather.tempC);
  const byKind = new Map<WeatherKind, number>();
  timeline.forEach((s, i) => {
    const next = timeline[i + 1];
    const span = next ? next.distKm - s.distKm : 0;
    byKind.set(weatherKind(s.weather.weatherCode), (byKind.get(weatherKind(s.weather.weatherCode)) ?? 0) + span);
  });
  let dominantKind: WeatherKind = 'nublado';
  let best = -1;
  for (const [kind, dist] of byKind) {
    if (dist > best) {
      best = dist;
      dominantKind = kind;
    }
  }
  const relevant = timeline.filter(isRelevant);
  const mostRelevantSample = relevant.length
    ? relevant.reduce((a, b) => (b.hazardScore > a.hazardScore ? b : a))
    : undefined;
  return {
    dominantKind,
    dominantLabel: dominantLabelFor(dominantKind),
    minTempC: Math.round(Math.min(...temps)),
    maxTempC: Math.round(Math.max(...temps)),
    maxRainProbability: Math.round(Math.max(...timeline.map((s) => s.weather.precipitationProb))),
    maxWindKmh: Math.round(Math.max(...timeline.map((s) => s.weather.windKmh))),
    minVisibilityM: Math.round(Math.min(...timeline.map((s) => s.weather.visibilityM || Number.MAX_SAFE_INTEGER))),
    mostRelevantSample,
    chapters: buildChapters(timeline),
    stable: !mostRelevantSample,
  };
}

function dominantLabelFor(kind: WeatherKind): string {
  switch (kind) {
    case 'sol': return 'Sol na maior parte do caminho';
    case 'sol-nuvem': return 'Sol entre nuvens na maior parte do caminho';
    case 'nublado': return 'Nublado na maior parte do caminho';
    case 'nevoeiro': return 'Nevoeiro em boa parte do caminho';
    case 'garoa': return 'Garoa em boa parte do caminho';
    case 'chuva': return 'Chuva na maior parte do caminho';
    case 'tempestade': return 'Temporal em parte do caminho';
    case 'neve': return 'Neve em parte do caminho';
  }
}

/** Resumo curto do plano (título + detalhe), derivado só de dados reais. */
export function summarizePlan(plan: TripPlanResult): { title: string; detail: string } {
  const journey = summarizeJourney(plan.timeline);
  if (plan.worstHazard === 'ok' && journey.stable) {
    const rains = plan.timeline.filter(
      (s) => s.weather.precipitationProb >= 20 || s.weather.weatherCode >= 51,
    );
    const extra = rains.length
      ? ` ${describeRainMentions(rains)}.`
      : '';
    return {
      title: journey.dominantLabel,
      detail: `Sem condição de risco relevante.${extra}`,
    };
  }
  const w = journey.mostRelevantSample ?? plan.timeline[0];
  const title = plan.worstHazard === 'perigo' ? 'Alerta no caminho' : 'Atenção no caminho';
  return {
    title,
    detail: `Trecho de maior atenção próximo ao km ${Math.round(w.distKm)}, por volta das ${fmtHour(w.atISO)}.`,
  };
}

function describeRainMentions(rains: TimelineSample[]): string {
  const parts = rains.slice(0, 3).map((s) => {
    const info = wmoToLabel(s.weather.weatherCode);
    return `${info.label.toLowerCase()} por volta das ${fmtHour(s.atISO)}`;
  });
  return parts.join(' e ');
}

/** Reavalia o hazard da timeline (usado pelo harness de demonstração). */
export function reevaluateTimeline(timeline: TimelineSample[]): TimelineSample[] {
  return timeline.map((s) => {
    const hz = evaluateHazard(s.weather);
    return { ...s, hazard: hz.level, hazardScore: hz.score, reason: hz.reason };
  });
}

function fmtHour(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
