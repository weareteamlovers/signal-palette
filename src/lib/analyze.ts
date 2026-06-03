// Shared single-stock compute path (Step 4c). Used by /api/analyze (on-demand,
// read-through cached) and /api/refresh (scheduled cache warming). Server-only.

import { fetchArticles } from "@/lib/news";
import { analyzeStock, classifyAndMerge, classifyArticles, RECENCY_DAYS } from "@/lib/openai";
import { readCachedAnalysis } from "@/lib/supabase/analysis-cache";

// Opt-in news-adapter pipeline (real articles → GPT classify, no web_search).
// Off → legacy web_search path.
export const USE_NEWS_ADAPTERS = process.env.USE_NEWS_ADAPTERS === "true";

// Always compute/cache the full set; clients trim for mobile.
export const CACHE_MAX_ISSUES = 20;

/** On-demand compute for a single stock (no accumulation) — the /api/analyze
 *  cold path. Fresh classification of recent articles, or legacy web_search. */
export async function computeStock(stockName: string, maxIssues = CACHE_MAX_ISSUES) {
  if (USE_NEWS_ADAPTERS) {
    const articles = await fetchArticles(stockName, RECENCY_DAYS);
    return classifyArticles(stockName, articles, maxIssues);
  }
  return analyzeStock(stockName, maxIssues);
}

/** Scheduled refresh (Step 4d) — accumulates onto the stored issues: reads the
 *  existing cached set, classifies new articles + flags resolved, merges with
 *  21-day retention + 20-cap. Falls back to a plain compute on the legacy path
 *  (web_search has no article list to accumulate from). */
export async function refreshStock(stockName: string, maxIssues = CACHE_MAX_ISSUES) {
  if (!USE_NEWS_ADAPTERS) return analyzeStock(stockName, maxIssues);
  const articles = await fetchArticles(stockName, RECENCY_DAYS);
  const existing = await readCachedAnalysis(stockName, Number.POSITIVE_INFINITY);
  return classifyAndMerge(stockName, articles, existing?.issues ?? [], maxIssues);
}
