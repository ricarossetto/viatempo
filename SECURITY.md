# Security Policy

ViaTempo is a static client-side app with no user accounts, no database and
no secret handling. The attack surface is small by design; help keep it that way.

*[Ler em português](./SECURITY.pt-BR.md)*

## Reporting a vulnerability

Use **GitHub private vulnerability reporting**: open the repository's
**Security** tab → **Report a vulnerability** (enable it first in
Settings → Code security if needed). Do not open a public issue
for anything involving credentials, user data or account impact.

For non-sensitive bugs, open a regular public issue instead.

## Ground rules

- Never commit tokens, API keys or `.dev.vars` files.
- Never paste secrets into issues, PRs or screenshots.
- The app must keep working without any secret in the frontend.
