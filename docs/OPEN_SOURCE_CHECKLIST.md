# Open-source checklist (next mission)

Publishing `viatempo` publicly. Do not start before explicit user approval.

## Repository

- [ ] Create public repo `viatempo` on GitHub (no repo exists yet)
- [ ] `git remote add origin <url>` (no remote configured yet)
- [ ] First push (default branch as created)
- [ ] About → description: `Open-source road-trip weather planner that matches forecasts to your ETA along the route. TypeScript, Leaflet, OSRM, Open-Meteo and OpenStreetMap. No API keys.`
- [ ] Topics: `weather` `weather-app` `road-trip` `route-planner` `route-weather` `open-meteo` `openstreetmap` `osrm` `leaflet` `typescript` `vite` `cloudflare-workers` `geospatial` `maps` `travel`
- [ ] Social preview: `docs/assets/social-preview.png`
- [ ] Enable Issues (templates already in `.github/`)
- [ ] Confirm LICENSE renders as MIT

## Hosting

- [ ] Connect repo in Workers Builds (production on master)
- [ ] Confirm preview deployments for branches
- [ ] Production on master confirmed working
- [ ] Custom domain decision (`clima.atrium.adv.br` or other) — separate mission, needs approval

## Cleanup

- [ ] Decide future removal of legacy Worker `clima-de-estrada` (keep online until then)
- [ ] Re-point Live Demo links if the canonical URL changes
