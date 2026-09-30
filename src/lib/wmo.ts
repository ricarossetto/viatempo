// Tabela WMO -> pt-BR. Single-source. Nunca quebra: fallback '?'.
export interface WmoInfo {
  label: string;
  icon: string;
}

export function wmoToLabel(code: number): WmoInfo {
  if (code === 0) return { label: 'Céu limpo', icon: '☀️' };
  if (code === 1) return { label: 'Quase limpo', icon: '🌤️' };
  if (code === 2) return { label: 'Parcialmente nublado', icon: '⛅' };
  if (code === 3) return { label: 'Nublado', icon: '☁️' };
  if (code === 45 || code === 48) return { label: 'Nevoeiro', icon: '🌫️' };
  if (code >= 51 && code <= 57) return { label: 'Garoa', icon: '🌦️' };
  if (code >= 61 && code <= 67) return { label: 'Chuva', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { label: 'Neve', icon: '❄️' };
  if (code >= 80 && code <= 82) return { label: 'Pancadas de chuva', icon: '🌧️' };
  if (code >= 95) return { label: 'Tempestade', icon: '⛈️' };
  return { label: '—', icon: '❓' };
}

/** Peso 0-100 do código WMO para o hazard index. */
export function wmoWeight(code: number): number {
  if (code >= 95) return 100;
  if (code >= 80) return 80;
  if (code >= 61) return 70;
  if (code >= 51) return 50;
  if (code === 45 || code === 48 || (code >= 71 && code <= 77)) return 60;
  if (code >= 1 && code <= 3) return 10;
  return 0;
}
