// News source router (Step 4c-4). Picks adapters by market, fans out in
// parallel, and merges + dedupes the results. Each adapter self-guards on
// missing keys (returns []), so an unconfigured source just drops out.

import { metaOf } from "@/data/stock-catalog";
import { readStockMeta } from "@/lib/supabase/analysis-cache";
import { finnhubAdapter } from "./finnhub";
import { googleNewsAdapter } from "./google-rss";
import { naverAdapter } from "./naver";
import type { Article, AdapterContext, Market, NewsAdapter } from "./types";

export type { Article } from "./types";

const ADAPTERS_BY_MARKET: Record<Market, readonly NewsAdapter[]> = {
  // Korean: Naver (primary) + Google RSS (supplement).
  KR: [naverAdapter, googleNewsAdapter],
  // US: Finnhub (primary, by ticker) + Google RSS. Yahoo deferred.
  US: [finnhubAdapter, googleNewsAdapter],
};

const MAX_ARTICLES = 40;

function normTitle(s: string): string {
  return s.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

/** Drop duplicate articles across sources: same URL or same normalized title.
 *  First occurrence wins; primary-source adapters are listed first. */
function dedupeArticles(articles: Article[]): Article[] {
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const out: Article[] = [];
  for (const a of articles) {
    const t = normTitle(a.title);
    if (a.url && seenUrl.has(a.url)) continue;
    if (t && seenTitle.has(t)) continue;
    if (a.url) seenUrl.add(a.url);
    if (t) seenTitle.add(t);
    out.push(a);
  }
  return out;
}

/** Resolve a stock's market/ticker: static catalog first (sync, the default
 *  40), then the search-populated stock_meta table (Step 4e), then KR default
 *  (Naver+Google by Korean name still works for any name). */
async function resolveMeta(
  name: string,
): Promise<{ market: Market; ticker?: string }> {
  const cat = metaOf(name);
  if (cat) return { market: cat.market, ticker: cat.ticker };
  const stored = await readStockMeta(name);
  if (stored) return stored;
  return { market: "KR" };
}

/** Fetch + merge recent articles for a stock from all configured sources for
 *  its market. Newest first; capped at MAX_ARTICLES. Never throws — a failed
 *  source contributes nothing. */
export async function fetchArticles(
  stockName: string,
  recencyDays: number,
): Promise<Article[]> {
  const { market, ticker } = await resolveMeta(stockName);
  const ctx: AdapterContext = {
    name: stockName,
    market,
    ticker,
    recencyDays,
  };

  const settled = await Promise.allSettled(
    ADAPTERS_BY_MARKET[market].map((a) => a.fetch(ctx)),
  );
  const all = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));

  const deduped = dedupeArticles(all);
  deduped.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)); // newest first
  return deduped.slice(0, MAX_ARTICLES);
}
