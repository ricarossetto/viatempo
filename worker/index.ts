// Backend mínimo e propositalmente pequeno: hoje só healthcheck.
// O app segue 100% client-side (OSRM/Open-Meteo direto do browser).
// Futuros endpoints (/api/routes, /api/weather) entram aqui quando houver
// vantagem concreta (cache central, rate limit, observabilidade).
// Regras: só GET, só paths /api/* conhecidos, sem proxy aberto, sem segredos.
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'GET') {
      return json({ ok: false, error: 'method_not_allowed' }, 405);
    }
    if (url.pathname === '/api/health') {
      return json({ ok: true });
    }
    return json({ ok: false, error: 'not_found' }, 404);
  },
};
