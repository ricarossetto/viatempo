# Clima de estrada

Previsão do tempo trecho a trecho da sua viagem de carro: origem, destino e hora
de saída. Grátis, sem cadastro, sem chave. Dados: OSRM (rota), Open-Meteo (clima),
OpenStreetMap (mapa).

## Rodar local

```bash
npm install
npm run dev        # http://localhost:5173/
```

## Testes

```bash
npm run build        # tsc + vite build (precisa passar)
npm run test:routing # parser OSRM, sem rede
npm run test:e2e      # Playwright + Chromium (exige npm run dev rodando)
```

## Deploy

Arquitetura: **Cloudflare Workers + Static Assets** num único deploy. O frontend
Vite (`dist/`) é servido como asset estático (grátis, ilimitado); o Worker atende
só `/api/*` e hoje expõe apenas `GET /api/health`. O app segue 100% client-side.

```bash
npm run deploy     # build + publica frontend e Worker
npm run cf:dev     # build + ambiente Cloudflare local
```

Deploy automático: conectar o repositório GitHub em Workers Builds (dashboard
Cloudflare → Workers & Pages → conectar Git). Cada push na branch de produção
gera build + deploy; branches geram previews. Ver `wrangler.jsonc`.

Domínio customizado (ex. `clima.atrium.adv.br`): no Worker, aba Domains → Add
Custom Domain. A Cloudflare cria DNS e certificado sozinha se a zona já está nela.

Rollback: dashboard → Workers & Pages → seu Worker → Deployments → promover a
versão anterior (Rollback). Não existe rollback próprio no repo.

Secrets (quando houver): `wrangler secret put NOME`. Nunca commitar `.dev.vars`
nem tokens (ver `.gitignore`).

Free tier aplicável (doc oficial, 09/2026): Worker 100.000 req/dia; assets
estáticos grátis e ilimitados; 20.000 arquivos de assets por versão (este projeto
gera menos de 50). Nada aqui gera cobrança.
