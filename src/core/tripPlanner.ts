import type {
  Place,
  PlanTripInput,
  RouteCandidate,
  TimelineSample,
  TripPlanResult,
} from './types';
import { buildTimedPoints } from './sampling';
import { evaluateHazard } from './hazard';
import { createCache } from '../services/cache';
import { createGeocoder } from '../services/geocoding';
import { createRouter } from '../services/routing';
import { createWeather } from '../services/weather';

export type PlanStage = 'routing' | 'weather';

export interface TripPlanner {
  /** Etapa A: descobre candidatas (1 request OSRM, com cache 24h). */
  findRoutes(origin: Place, destination: Place): Promise<RouteCandidate[]>;
  /** Etapa C: clima da rota escolhida (1 request Open-Meteo, com cache 30min). */
  planRoute(
    route: RouteCandidate,
    origin: Place,
    destination: Place,
    departureISO: string,
    opts?: { onProgress?: (stage: PlanStage) => void },
  ): Promise<TripPlanResult>;
  /** Compat: primeira candidata + clima (fluxo antigo em uma chamada). */
  planTrip(
    input: PlanTripInput,
    opts?: { onProgress?: (stage: PlanStage) => void },
  ): Promise<TripPlanResult>;
  /** Reposiciona a mesma timeline p/ nova partida sem fetch (preview do slider). */
  retimeTimeline(base: TripPlanResult, newDepartureISO: string): TripPlanResult;
}

const cache = createCache();
const geocoder = createGeocoder(cache);
const router = createRouter(cache);
const weather = createWeather(cache);

export { geocoder };

export function createTripPlanner(): TripPlanner {
  async function findRoutes(origin: Place, destination: Place): Promise<RouteCandidate[]> {
    return router.getRoutes(origin, destination);
  }

  async function planRoute(
    route: RouteCandidate,
    origin: Place,
    destination: Place,
    departureISO: string,
    opts?: { onProgress?: (stage: PlanStage) => void },
  ): Promise<TripPlanResult> {
    const maxDate = Date.now() + 6.5 * 24 * 3600_000;
    if (new Date(departureISO).getTime() > maxDate) {
      throw new Error('Saída além de 7 dias: sem previsão horária.');
    }
    opts?.onProgress?.('weather');
    const timed = buildTimedPoints(route, departureISO);
    const samples = await weather.getForPoints(timed);

    const timeline: TimelineSample[] = timed.map((tp, i) => {
      const w = samples[i];
      const hz = evaluateHazard(w);
      return {
        atISO: tp.atISO,
        elapsedMin: tp.elapsedMin,
        distKm: tp.distKm,
        point: tp.point,
        weather: w,
        hazard: hz.level,
        hazardScore: hz.score,
        reason: hz.reason,
      };
    });

    const worst = timeline.reduce((a, b) => (b.hazardScore > a.hazardScore ? b : a), timeline[0]);
    const arrivalISO = timeline[timeline.length - 1]?.atISO ?? departureISO;
    return {
      origin,
      destination,
      departureISO,
      arrivalISO,
      route,
      timeline,
      worstHazard: worst?.hazard ?? 'ok',
      summary: worst && worst.hazard !== 'ok'
        ? `${worst.reason} por volta de ${formatHour(worst.atISO)} (km ${Math.round(worst.distKm)})`
        : 'Rota limpa: sem chuva relevante no percurso.',
    };
  }

  async function planTrip(
    input: PlanTripInput,
    opts?: { onProgress?: (stage: PlanStage) => void },
  ): Promise<TripPlanResult> {
    opts?.onProgress?.('routing');
    const routes = await findRoutes(input.origin, input.destination);
    const first = routes[0];
    if (!first) throw new Error('Rota não encontrada');
    return planRoute(first, input.origin, input.destination, input.departureISO, opts);
  }

  function retimeTimeline(base: TripPlanResult, newDepartureISO: string): TripPlanResult {
    const t0 = new Date(base.departureISO).getTime();
    const t1 = new Date(newDepartureISO).getTime();
    const deltaMin = (t1 - t0) / 60_000;
    const timeline = base.timeline.map((s) => ({
      ...s,
      atISO: new Date(new Date(s.atISO).getTime() + deltaMin * 60_000).toISOString(),
      elapsedMin: s.elapsedMin,
    }));
    const arrivalISO = timeline[timeline.length - 1]?.atISO ?? newDepartureISO;
    return { ...base, departureISO: newDepartureISO, arrivalISO, timeline };
  }

  return { findRoutes, planRoute, planTrip, retimeTimeline };
}

function formatHour(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
