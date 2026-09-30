// Contrato único de domínio. Sem imports. Wire-types das APIs nunca vazam daqui.
export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Place extends GeoPoint {
  id: string;
  name: string;
  displayName: string;
  admin1?: string;
  country?: string;
}

export interface RouteResult {
  distanceM: number;
  durationS: number;
  geometry: GeoPoint[];
  provider: 'osrm-demo' | 'fossgis';
}

export interface WeatherSample {
  timeISO: string;
  tempC: number;
  precipitationProb: number;
  weatherCode: number;
  windKmh: number;
  gustsKmh: number;
  visibilityM: number;
  isInterpolated: boolean;
}

export type HazardLevel = 'ok' | 'atencao' | 'perigo';

export interface TimelineSample {
  atISO: string;
  elapsedMin: number;
  distKm: number;
  point: GeoPoint;
  weather: WeatherSample;
  hazard: HazardLevel;
  hazardScore: number;
  reason: string;
}

export interface TripPlanResult {
  origin: Place;
  destination: Place;
  departureISO: string;
  arrivalISO: string;
  route: RouteResult;
  timeline: TimelineSample[];
  worstHazard: HazardLevel;
  summary: string;
}

export interface PlanTripInput {
  origin: Place;
  destination: Place;
  departureISO: string;
}

export type PlannerStatus = 'idle' | 'geocoding' | 'planning' | 'ready' | 'error';
