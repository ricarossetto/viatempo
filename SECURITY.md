# Security Policy

ViaTempo is a static client-side app with no user accounts, no database and
no secret handling. The attack surface is small by design; help keep it that way.

## Reporting a vulnerability

A private security channel will be configured when the public GitHub
repository exists (GitHub private vulnerability reporting).

Until then:

- For non-sensitive bugs, open a public issue.
- For anything involving credentials, user data or account impact, **do not**
  publish details in an issue. Wait for the private channel documented here.

## Ground rules

- Never commit tokens, API keys or `.dev.vars` files.
- Never paste secrets into issues, PRs or screenshots.
- The app must keep working without any secret in the frontend.
