/** HTTP com timeout + retry limitado. */
export async function fetchJson<T>(url: string, opts: { timeoutMs?: number; retries?: number; headers?: Record<string, string> } = {}): Promise<T> {
  const { timeoutMs = 8000, retries = 1, headers = {} } = opts;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "ViaTempo/1.0 (contato: viatempo)", Accept: "application/json", ...headers },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

export async function fetchText(url: string, timeoutMs = 8000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "ViaTempo/1.0 (contato: viatempo)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}
