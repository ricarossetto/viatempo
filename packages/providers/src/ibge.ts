import { fetchJson } from "./http.js";
import { MemoryCache } from "./cache.js";

/** Tabela de contingência (cidades cobertas pelos testes + golden route). */
const KNOWN_IBGE: Record<string, string> = {
  "ijui-rs": "4310207",
  "porto alegre-rs": "4314902",
  "cruz alta-rs": "4306106",
  "soledade-rs": "4320800",
  "sao paulo-sp": "3550308",
  "rio de janeiro-rj": "3304557",
  "belo horizonte-mg": "3106200",
  "brasilia-df": "5300108",
  "curitiba-pr": "4106902",
  "campinas-sp": "3509502",
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const ibgeCache = new MemoryCache<string>(30 * 24 * 3600 * 1000);
export function ibgeCacheStats() {
  return ibgeCache.stats;
}

/** Resolve código IBGE por "Cidade, UF". Tenta tabela local e depois API do IBGE. */
export async function resolveIbge(city: string, uf: string): Promise<string | null> {
  const key = `${norm(city)}-${norm(uf)}`;
  const hit = ibgeCache.get(`ibge:${key}`);
  if (hit) return hit.value;
  const known = KNOWN_IBGE[key];
  if (known) {
    ibgeCache.set(`ibge:${key}`, known);
    return known;
  }
  try {
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf.toUpperCase())}/municipios`;
    const list = await fetchJson<{ id: number; nome: string }[]>(url, { timeoutMs: 8000, retries: 1 });
    const found = list.find((m) => norm(m.nome) === norm(city));
    if (found) {
      ibgeCache.set(`ibge:${key}`, String(found.id));
      return String(found.id);
    }
    return null;
  } catch {
    return null;
  }
}
