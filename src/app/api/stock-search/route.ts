// Step 4e: stock search proxy. Browser → here → Naver autocomplete (server,
// no CORS). Persists results to stock_meta so the news router can route any
// added stock. Falls back to the static catalog when Naver fails/empty.

import { NextResponse } from "next/server";
import { STOCK_CATALOG, type StockMeta } from "@/data/stock-catalog";
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

  // Grow the catalog: remember what we found so news routing knows the
  // market/ticker once the stock is added. Awaited so it lands on serverless.
  await writeStockMeta(results);

  return NextResponse.json({ results });
}
