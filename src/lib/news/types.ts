// Server-only news-pipeline domain types (Step 4c). Adapters fetch real
// articles from credible sources; GPT later classifies them into Issues
// (replacing the unreliable web_search flow). Do NOT import from a client
// component — adapters use server-side secrets (API keys).

import type { Market } from "@/data/stock-catalog";

export type { Market };

/** A single news article from any source, normalized to a common shape. */
export interface Article {
  title: string;
  /** Short snippet/description when the source provides one. */
  summary?: string;
  url: string;
  /** Publisher name, e.g. "연합뉴스", "Reuters". */
  source: string;
  /** ISO 8601 UTC publish time. */
  publishedAt: string;
}

/** What an adapter needs to query for one stock. */
export interface AdapterContext {
  /** Korean display name (project rule) — the query term for KR/RSS sources. */
  name: string;
  market: Market;
  /** US trading symbol — present for US stocks (Finnhub/Yahoo). */
  ticker?: string;
  /** Recency window in days; adapters drop anything older. */
  recencyDays: number;
}

export interface NewsAdapter {
  readonly id: string;
  /** Fetch recent articles for a stock. Resolves to [] on any failure — the
   *  router aggregates whatever succeeds rather than letting one bad source
   *  break the pipeline. */
  fetch(ctx: AdapterContext): Promise<Article[]>;
}
