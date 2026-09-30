# Política de Segurança

ViaTempo é um app estático client-side, sem contas de usuário, sem banco de
dados e sem manuseio de segredos. A superfície de ataque é pequena por
construção; ajude a manter assim.

*[Read in English](./SECURITY.md)*

## Como reportar uma vulnerabilidade

Use o **relato privado de vulnerabilidades do GitHub**: abra a aba
**Security** do repositório → **Report a vulnerability** (ative antes em
Settings → Code security, se preciso). Não abra issue
pública para nada envolvendo credenciais, dados de usuário ou impacto em contas.

Para bugs não sensíveis, abra uma issue pública normal.

## Regras básicas

- Nunca commite tokens, API keys ou arquivos `.dev.vars`.
- Nunca cole segredos em issues, PRs ou screenshots.
- O app precisa continuar funcionando sem nenhum segredo no frontend.
