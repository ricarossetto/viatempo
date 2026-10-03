/**
 * ViaTempo — domínio meteorológico normalizado.
 *
 * O consumidor nunca vê GRIB/NetCDF/estação/grid/timestep.
 * Campos ausentes são `null`. Nunca inventamos valores.
 */

export type WeatherKind = "forecast" | "observation" | "nowcast";

export type HazardLevel = "none" | "attention" | "alert" | "severe" | "unknown";

export type NormalizedCondition =
  | "clear"
  | "partly_cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy_rain"
  | "storm"
  | "snow"
  | "unknown";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  /** Nome legível do ponto (cidade/trecho), quando conhecido. */
  label?: string | null;
}

export interface Precipitation {
  /** 0–100. null quando o modelo não fornece probabilidade. */
  probability: number | null;
  /** mm no timestep/hora de referência. null quando desconhecido. */
  amount: number | null;
  /** mm/h estimada. null quando desconhecida. */
  intensity: number | null;
}

export interface Wind {
  /** km/h. null quando desconhecido. */
  speed: number | null;
  /** km/h. null quando desconhecido. */
  gust: number | null;
  /** graus 0–360. null quando desconhecido. */
  direction: number | null;
}

export interface SourceProvenance {
  institution: string | null;
  provider: string;
  model: string | null;
  /** Ex.: "2026-09-30 00z". null quando não aplicável. */
  run: string | null;
  generatedAt: string | null;
  ingestedAt: string | null;
  fallback: boolean;
  /** Cadeia tentada, ex. ["inmet","open-meteo"]. */
  fallbackChain?: string[];
  /** Ex.: "nearest-hour" | "linear-time" | "nearest-station-24km". */
  interpolation: string | null;
  resolutionKm: number | null;
}

export interface DataQuality {
  /** Campos que ficaram null e por quê (curto). */
  missingFields: string[];
  /** Minutos entre medição/run e o requestedTime (obs) ou idade do run. */
  ageMinutes: number | null;
  /** Para observações: distância estação→ponto. */
  stationDistanceKm: number | null;
  /** 0–1 fração de campos críticos preenchidos. */
  completeness: number;
}

export interface NearbyObservation {
  stationCode: string;
  stationName: string | null;
  distanceKm: number;
  measuredAt: string;
  ageMinutes: number | null;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  humidityPct: number | null;
  precipitationMm: number | null;
}

export interface WeatherAlert {
  id: string;
  source: string;
  event: string;
  severity: string;
  level: number | null;
  headline: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

export interface HazardAssessment {
  level: HazardLevel;
  /** Frases curtas em pt-BR, ex. "rajadas de 64 km/h". */
  reasons: string[];
  completeness: number;
  /** true quando dados insuficientes p/ avaliar com segurança. */
  dataGap: boolean;
}

export interface NormalizedWeather {
  point: GeoPoint;
  requestedTime: string;
  /** Tempo do timestep usado (forecast) ou da medição (obs). */
  forecastTime: string | null;
  kind: WeatherKind;
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  pressureHpa: number | null;
  precipitation: Precipitation;
  wind: Wind;
  visibility: number | null;
  cloudCover: number | null;
  condition: NormalizedCondition | null;
  conditionCode: string | null;
  hazard: HazardAssessment | null;
  source: SourceProvenance;
  quality: DataQuality;
  nearbyObservation: NearbyObservation | null;
  alerts: WeatherAlert[];
}

export interface BatchWeatherRequest {
  latitude: number;
  longitude: number;
  /** ISO 8601 com offset. */
  timestamp: string;
  label?: string;
}

export interface TripPoint extends BatchWeatherRequest {
  /** ETA ISO. */
  eta?: string;
  distanceFromStartKm?: number;
}
