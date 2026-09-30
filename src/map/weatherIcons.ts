// Ícones meteorológicos em SVG inline: traço consistente, sem emoji, sem asset externo.
// Cada condição tem forma própria (o anel colorido de hazard é redundância, não o único sinal).
export type WeatherKind =
  | 'sol'
  | 'sol-nuvem'
  | 'nublado'
  | 'nevoeiro'
  | 'garoa'
  | 'chuva'
  | 'tempestade'
  | 'neve';

export function weatherKind(code: number): WeatherKind {
  if (code === 0 || code === 1) return 'sol';
  if (code === 2) return 'sol-nuvem';
  if (code === 3) return 'nublado';
  if (code === 45 || code === 48) return 'nevoeiro';
  if (code >= 51 && code <= 57) return 'garoa';
  if (code >= 71 && code <= 77) return 'neve';
  if (code >= 95) return 'tempestade';
  return 'chuva';
}

const SUN = `<circle class="sun-core" cx="12" cy="12" r="4.6"/>
<g class="rays"><line x1="12" y1="2.5" x2="12" y2="5.5"/><line x1="12" y1="18.5" x2="12" y2="21.5"/>
<line x1="2.5" y1="12" x2="5.5" y2="12"/><line x1="18.5" y1="12" x2="21.5" y2="12"/>
<line x1="5.3" y1="5.3" x2="7.4" y2="7.4"/><line x1="16.6" y1="16.6" x2="18.7" y2="18.7"/>
<line x1="5.3" y1="18.7" x2="7.4" y2="16.6"/><line x1="16.6" y1="7.4" x2="18.7" y2="5.3"/></g>`;

const CLOUD = (cls: string) =>
  `<path class="${cls}" d="M7 18.5h9.5a3.8 3.8 0 0 0 .6-7.55A5.2 5.2 0 0 0 7 12.3a3.2 3.2 0 0 0 0 6.2Z"/>`;

const DROPS = (cls: string, x1 = 8, x2 = 12, x3 = 16) =>
  `<g class="${cls}"><line x1="${x1}" y1="18" x2="${x1 - 1}" y2="21"/><line x1="${x2}" y1="18" x2="${x2 - 1}" y2="21"/><line x1="${x3}" y1="18" x2="${x3 - 1}" y2="21"/></g>`;

export function weatherSvg(kind: WeatherKind): string {
  switch (kind) {
    case 'sol':
      return SUN;
    case 'sol-nuvem':
      return `<g transform="translate(-3.5,-3) scale(0.72)">${SUN}</g>` + CLOUD('puff');
    case 'nublado':
      return `<g transform="translate(4.5,-2.5) scale(0.78)" opacity="0.55">${CLOUD('puff')}</g>` + CLOUD('puff');
    case 'nevoeiro':
      return CLOUD('puff') +
        `<g class="mist"><line x1="6" y1="19" x2="18" y2="19"/><line x1="8" y1="21.5" x2="16" y2="21.5"/></g>`;
    case 'garoa':
      return CLOUD('puff') + DROPS('drizzle', 9, 12, 15);
    case 'chuva':
      return CLOUD('puff') + DROPS('drops');
    case 'tempestade':
      return CLOUD('puff') + `<path class="bolt" d="M12.5 14.5 9 19.5h3l-1 3.5 4.5-6h-3l1.5-2.5Z"/>`;
    case 'neve':
      return CLOUD('puff') +
        `<g class="flakes"><circle cx="9" cy="19.5" r="1.1"/><circle cx="12.5" cy="20.5" r="1.1"/><circle cx="16" cy="19.5" r="1.1"/></g>`;
  }
}
