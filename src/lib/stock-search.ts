// Step 4e: stock symbol search via Naver autocomplete (covers KR + US with
// Korean display names, market, and ticker in one call). Server-only — called
// by /api/stock-search (browser can't hit Naver directly: CORS).

import type { Market, StockMeta } from "@/data/stock-catalog";

const ENDPOINT = "https://ac.stock.naver.com/ac";

interface NaverItem {
  code: string;
  name: string;
  nationCode: string; // "KOR" | "USA" | "JPN" | …
  category: string; // "stock" | …
}

function marketOfNation(nation: string): Market | null {
  if (nation === "KOR") return "KR";
  if (nation === "USA") return "US";
  return null; // only KR/US supported
}

/** Search stocks by Korean or English query. Returns Korean display names with
 *  market + (US) ticker. [] on failure so the route can fall back to the
 *  static catalog. */
export async function searchStocks(query: string): Promise<StockMeta[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&target=stock`;
  try {
    const res = await fetch(url, {
      // Browser-like headers — ac.stock.naver.com (unofficial) can reject bare
      // requests. Combined with the route's Seoul region, this keeps it from
      // blocking non-KR cloud IPs.
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Referer: "https://m.stock.naver.com/",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { items?: NaverItem[] };
    const out: StockMeta[] = [];
    const seen = new Set<string>();
    for (const it of body.items ?? []) {
      if (it.category !== "stock") continue;
      const market = marketOfNation(it.nationCode);
      if (!market) continue;
      const name = (it.name ?? "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      // US: Naver `code` is the plain ticker (NVDA, AAPL). KR routes by name.
      out.push(market === "US" ? { name, market, ticker: it.code } : { name, market });
    }
    return out;
  } catch {
    return [];
  }
}
