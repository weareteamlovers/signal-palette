// Step 4e: stock search proxy. Browser → here → Naver autocomplete (server,
// no CORS). Persists results to stock_meta so the news router can route any
// added stock. Falls back to the static catalog when Naver fails/empty.

import { after, NextResponse } from "next/server";
import { metaByTicker, STOCK_CATALOG, type StockMeta } from "@/data/stock-catalog";
import { searchStocks } from "@/lib/stock-search";
import { writeStockMeta } from "@/lib/supabase/analysis-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Run in Seoul — Naver autocomplete can geo-block non-KR cloud IPs, and our
// Supabase (stock_meta) is in Seoul too. (Vercel Pro.)
export const preferredRegion = "icn1";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json({ results: [] });

  let results = await searchStocks(q);
  if (results.length === 0) {
    const ql = q.toLowerCase();
    results = STOCK_CATALOG.filter((s) => s.name.toLowerCase().includes(ql)).map(
      (s): StockMeta => ({ name: s.name, market: s.market, ticker: s.ticker }),
    );
  }

  // #4: prefer our curated Korean name when the ticker is in the catalog
  // (e.g. PWR → "콴타 서비시스" instead of Naver's "콴타 서비스").
  results = results.map((r) => {
    const cat = r.ticker ? metaByTicker(r.ticker) : undefined;
    return cat ? { ...r, name: cat.name } : r;
  });

  // #1: don't block the response on the cache write — run it after responding
  // (still within the function lifetime via after()).
  after(() => writeStockMeta(results));

  return NextResponse.json({ results });
}
