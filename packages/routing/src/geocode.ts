import { MemoryCache } from "@viatempo/providers";

export interface Geocoded {
  latitude: number;
  longitude: number;
  label: string;
  city: string | null;
  uf: string | null;
  timezone: string | null;
  source: string;
}

const UF_BY_ADMIN1: Record<string, string> = {
  "acre": "AC", "alagoas": "AL", "amapá": "AP", "amapa": "AP", "amazonas": "AM", "bahia": "BA",
  "ceará": "CE", "ceara": "CE", "distrito federal": "DF", "espírito santo": "ES", "espirito santo": "ES",
  "goiás": "GO", "goias": "GO", "maranhão": "MA", "maranhao": "MA", "mato grosso": "MT",
  "mato grosso do sul": "MS", "minas gerais": "MG", "pará": "PA", "para": "PA", "paraíba": "PB", "paraiba": "PB",
  "paraná": "PR", "parana": "PR", "pernambuco": "PE", "piauí": "PI", "piaui": "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS",
  "rondônia": "RO", "rondonia": "RO", "roraima": "RR", "santa catarina": "SC", "são paulo": "SP", "sao paulo": "SP",
  "sergipe": "SE", "tocantins": "TO",
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const cache = new MemoryCache<Geocoded>(30 * 24 * 3600 * 1000);

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "ViaTempo/1.0 (contato: viatempo)", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Geocoding: Open-Meteo (primário) -> Nominatim -> Photon. */
export async function geocode(text: string): Promise<Geocoded> {
  const key = `geo:${norm(text)}`;
  const hit = cache.get(key);
  if (hit) return hit.value;

  // 1. Open-Meteo geocoding
  try {
    const data = (await getJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=1&language=pt&format=json`,
      7000,
    )) as { results?: { latitude: number; longitude: number; name: string; admin1?: string; country?: string; timezone?: string }[] };
    const r = data.results?.[0];
    if (r) {
      const uf = r.admin1 ? (UF_BY_ADMIN1[norm(r.admin1)] ?? null) : null;
      const out: Geocoded = {
        latitude: r.latitude,
        longitude: r.longitude,
        label: r.country && !/brasil/i.test(r.country) ? `${r.name} (${r.country})` : text,
        city: r.name ?? null,
        uf,
        timezone: r.timezone ?? null,
        source: "open-meteo-geocoding",
      };
      cache.set(key, out);
      return out;
    }
  } catch { /* fallback */ }

  // 2. Nominatim
  try {
    const data = (await getJson(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`,
      8000,
    )) as { lat: string; lon: string; display_name: string }[];
    const r = data?.[0];
    if (r) {
      const out: Geocoded = {
        latitude: Number(r.lat),
        longitude: Number(r.lon),
        label: text,
        city: text.split(",")[0].trim(),
        uf: null,
        timezone: null,
        source: "nominatim",
      };
      cache.set(key, out);
      return out;
    }
  } catch { /* fallback */ }

  // 3. Photon
  const data = (await getJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=1`, 8000)) as {
    features?: { properties?: { name?: string; state?: string }; geometry?: { coordinates?: [number, number] } }[];
  };
  const f = data.features?.[0];
  if (!f?.geometry?.coordinates) throw new Error(`geocoding falhou para: ${text}`);
  const out: Geocoded = {
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
    label: text,
    city: f.properties?.name ?? text.split(",")[0].trim(),
    uf: null,
    timezone: null,
    source: "photon",
  };
  cache.set(key, out);
  return out;
}
