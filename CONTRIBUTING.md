# Contributing to ViaTempo

Short and practical. ViaTempo is a small client-side app; keep it that way.

*[Ler em português](./CONTRIBUTING.pt-BR.md)*

## Setup

```bash
npm install
npm run dev
```

## Workflow

1. Create a focused branch for one change.
2. Keep the change small and reviewable.
3. Run the checks below before opening a PR.

## Checks

```bash
npm run build        # must pass
npm run test:routing
npm run test:journey
npm run test:e2e      # needs npm run dev running
```

Plus, when the change touches UI:

- Test on mobile width (390px) — no horizontal page overflow.
- Keyboard navigation works, focus stays visible.
- `prefers-reduced-motion` still yields the final state instantly.
- Screenshots for visual changes.

## Rules

- No paid APIs or API keys without prior discussion (see free public-data stack in README).
- No new backend, database or login without prior discussion.
- Update tests when behavior changes.
- UI copy stays in pt-BR, sentence case, active voice.
- Weather condition ≠ hazard: never paint severity from condition alone.

## Security

Do not post secrets, tokens or credentials in issues or PRs. See [SECURITY.md](./SECURITY.md).
