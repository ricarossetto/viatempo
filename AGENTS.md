# AGENTS.md: Previsão do tempo da rota

Memória operacional do projeto. Atualizar quando o usuário corrigir algo ou impuser restrição.

## Restrições duras (usuário)

- **100% gratuito, sem API key, sem cadastro.** Só dados públicos: OSRM (routing),
  Open-Meteo (forecast + geocoding), tiles OSM standard.
- **Nunca usar `*.basemaps.cartocdn.com` sem chave.** A CARTO passou a exigir API key
  e serve tile com watermark "API KEY REQUIRED" (com HTTP 200! status não prova nada).
  Tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` com atribuição OSM.
- UI em **pt-BR**, sentence case, voz ativa, sem clichês de IA (seamless, elevate etc.).
- Stack: Vite + TS + Leaflet. Sem framework de UI, sem store externa.

## Como verificar (evidência > chute)

- `npm run build` precisa passar (`tsc + vite build`).
- Status HTTP 200 **não valida conteúdo** (caso CARTO acima). Checar o corpo/resposta.
- Harness headless do código real: esbuild bundle + node com stub de `localStorage`.
  O script vive em `C:\Users\RICARD~1\AppData\Local\Temp\opencode\harness.ts`. Se sumir, recriar.
- E2E de navegador: `npm run test:e2e` (Playwright + Chromium headless). Captura console,
  erros de request, fluxo completo e screenshot em `e2e/evidencias/`.
- Não pedir ao usuário para abrir F12 / copiar erro / fazer passo manual.
  Reproduzir do lado do agente primeiro; só envolver o usuário se impossível.

## Operação do dev server (Windows)

- Dev: `cmd /c start /min node node_modules/vite/bin/vite.js dev --port 5173 --strictPort`
  a partir da raiz do projeto. NÃO usar `Start-Process npm ...` (npm é .cmd, falha)
  nem jobs que morrem com a sessão. URL: http://localhost:5173/
- HMR recarrega sozinho; confirmar via curl que o HTML novo está servido.

## Design (skills instaladas em `.agents/skills/`)

- `frontend-design` + `redesign-existing-projects` + `ui-ux-pro-max`.
- Identidade "faixa de estrada": base clara fria, tinta verde-petróleo `#0f2a26`,
  acento único verde-estrada `#0e7c5b`, Space Grotesk em títulos/números
  (tabular-nums), timeline como estrada com marcos. Tokens em `src/style.css`.
- Anti-padrões banidos: gradiente roxo-azul, eyebrow em caps, cards SaaS idênticos,
  emoji como ícone de UI (ícones de clima ☀️🌧️ são conteúdo, ok).

## Limites conhecidos das APIs

- OSRM demo: 1 req/s, sem SLA → fallback FOSSGIS em **qualquer** falha, não só 429.
- Open-Meteo: 10k req/dia, CC-BY. Exibir "Data by Open-Meteo.com" no rodapé (já está lá).
- Geocoding Open-Meteo com `countryCode=BR`. Cache: rota 24h, clima 30min (chave com
  a hora!), geo 7 dias.
- Ordem OSRM é `lon,lat`. Fuso: `timezone=auto` + `America/Sao_Paulo` p/ exibir.

## Git

- Commits em PT, curtos, na master. Nada de push/PR sem pedido.
