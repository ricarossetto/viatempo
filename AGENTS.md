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
  Requests com `alternatives=3&steps=true`; refs dos steps viram nomes de
  rodovia (sem ref → "Rota N", nunca inventar).
- Open-Meteo: 10k req/dia, CC-BY. Exibir "Data by Open-Meteo.com" no rodapé (já está lá).
- Geocoding Open-Meteo com `countryCode=BR`. Cache: rota 24h (chave `route:v2:alts3`),
  clima 30min (chave com a hora!), geo 7 dias.
- Ordem OSRM é `lon,lat`. Fuso: `timezone=auto` + `America/Sao_Paulo` p/ exibir.
- Arquitetura: `findRoutes` (OSRM 1x) + `planRoute` (clima da rota escolhida 1x).
  Trocar rota/horário nunca refaz geocoding nem OSRM. Sessão em memória no `main.ts`.
- UI (V3, previsão protagonista): `src/core/journey.ts` deriva resumo + capítulos;
  `src/ui/` tem summary, ribbon, seletor, timeline, motion e demo (DEV-only `?demo=`).
  Mapa com densidade `summary|detailed`; hero compacta via `body[data-state]`.
- Motion: tokens em `src/styles/motion.css`, só transform/opacity/numbers, sempre
  com saída em reduced-motion. E2E valida primeira dobra em 1280x900.

## Git

- Commits em PT, curtos, na master. Nada de push/PR sem pedido.
- Não versionar: `.opencode/` (skills da IDE do usuário), `**/__pycache__/`,
  `e2e/evidencias/` (regenerar com `npm run test:e2e`). Um objetivo por commit.

## Deploy (Cloudflare Workers + Static Assets)

- Config: `wrangler.jsonc` (`clima-de-estrada`, `./dist`, SPA fallback,
  `run_worker_first: ["/api/*"]`). Frontend 100% client-side; Worker só tem
  `GET /api/health` (ver `worker/`).
- Scripts: `npm run deploy` (build + publica), `npm run cf:dev` (ambiente CF local).
- Deploy automático via Workers Builds ligado ao GitHub (configurar no dashboard).
- Nunca commitar `.dev.vars` nem tokens. Nunca fazer deploy sem pedido explícito.
