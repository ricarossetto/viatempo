# Como contribuir com o ViaTempo

Curto e prático. ViaTempo é um app client-side pequeno; mantenha assim.

*[Read in English](./CONTRIBUTING.md)*

## Preparar o ambiente

```bash
npm install
npm run dev
```

## Fluxo de trabalho

1. Crie uma branch focada para cada mudança.
2. Mantenha a mudança pequena e revisável.
3. Rode as verificações abaixo antes de abrir um PR.

## Verificações

```bash
npm run build        # precisa passar
npm run test:routing
npm run test:journey
npm run test:e2e      # exige npm run dev rodando
```

Além disso, quando a mudança toca a UI:

- Teste em largura mobile (390px) — sem rolagem horizontal da página.
- Navegação por teclado funciona, foco continua visível.
- `prefers-reduced-motion` continua entregando o estado final na hora.
- Screenshots para mudanças visuais.

## Regras

- Sem APIs pagas ou API keys sem discussão prévia (ver stack gratuita no README).
- Sem backend novo, banco de dados ou login sem discussão prévia.
- Atualize os testes quando o comportamento mudar.
- Textos da UI ficam em pt-BR, sentence case, voz ativa.
- Condição meteorológica ≠ hazard: nunca pinte severidade só pela condição.

## Segurança

Não publique segredos, tokens ou credenciais em issues ou PRs. Ver [SECURITY.pt-BR.md](./SECURITY.pt-BR.md).
