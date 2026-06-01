// Shared single-stock compute path (Step 4c). Used by /api/analyze (on-demand,
// read-through cached) and /api/refresh (scheduled cache warming). Server-only.

import { fetchArticles } from "@/lib/news";
import { analyzeStock, classifyArticles, RECENCY_DAYS } from "@/lib/openai";

// Opt-in news-adapter pipeline (real articles → GPT classify, no web_search).
// Off → legacy web_search path.
export const USE_NEWS_ADAPTERS = process.env.USE_NEWS_ADAPTERS === "true";

// Always compute/cache the full set; clients trim for mobile.
export const CACHE_MAX_ISSUES = 20;

export async function computeStock(stockName: string, maxIssues = CACHE_MAX_ISSUES) {
  if (USE_NEWS_ADAPTERS) {
    const articles = await fetchArticles(stockName, RECENCY_DAYS);
    return classifyArticles(stockName, articles, maxIssues);
  }
  return analyzeStock(stockName, maxIssues);
}
