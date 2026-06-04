// Resolve a portfolio stock → Yahoo symbol + sector/industry (Step 5 / Phase 0).
//   - US: Yahoo search by ticker (returns sector/industry directly).
//   - KR: Naver autocomplete (Korean name → 6-digit code + KOSPI/KOSDAQ) →
//         Yahoo symbol {code}.KS|.KQ, then Yahoo search by code for sector.
// The Naver hop exists because Yahoo rejects Korean-name search. Results are
// cached in-process (symbols/sectors are slow-moving). null when unresolvable.

import type { Market } from "@/data/stock-catalog";
import { searchEquity } from "./yahoo";

interface NaverItem {
  code: string;
  name: string;
  typeCode: string; // "KOSPI" | "KOSDAQ" | …
  nationCode: string; // "KOR" | "USA" | …
  category: string; // "stock" | …
}

export interface ResolvedSymbol {
  symbol: string;
  sector?: string;
  industry?: string;
}

const TTL_MS = 12 * 60 * 60 * 1000; // 12h
const cache = new Map<string, { at: number; value: ResolvedSymbol | null }>();

/** KR: Korean name → Yahoo symbol ({code}.KS|.KQ) via Naver autocomplete. */
async function krSymbolFromNaver(name: string): Promise<string | null> {
  const url = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(name)}&target=stock`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Referer: "https://m.stock.naver.com/",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { items?: NaverItem[] };
    const hit = (body.items ?? []).find(
      (it) => it.category === "stock" && it.nationCode === "KOR" && !!it.code,
    );
    if (!hit) return null;
    return `${hit.code}${hit.typeCode === "KOSDAQ" ? ".KQ" : ".KS"}`;
  } catch {
    return null;
  }
}

async function resolve(
  name: string,
  market: Market,
  ticker?: string,
): Promise<ResolvedSymbol | null> {
  if (market === "US") {
    const eq = await searchEquity(ticker ?? name);
    if (eq?.symbol)
      return { symbol: eq.symbol, sector: eq.sector, industry: eq.industry };
    return ticker ? { symbol: ticker } : null;
  }
  // KR: Naver gives the symbol; Yahoo search by code gives the sector.
  const symbol = await krSymbolFromNaver(name);
  if (!symbol) return null;
  const eq = await searchEquity(symbol.split(".")[0]);
  return { symbol, sector: eq?.sector, industry: eq?.industry };
}

/** Cached resolve (12h TTL). */
export async function resolveSymbol(
  name: string,
  market: Market,
  ticker?: string,
): Promise<ResolvedSymbol | null> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await resolve(name, market, ticker);
  cache.set(name, { at: Date.now(), value });
  return value;
}
