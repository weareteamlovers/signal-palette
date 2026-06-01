// Finnhub company-news adapter (Step 4c-3). Primary US source — queries by
// ticker (from STOCK_CATALOG). English articles; the GPT classify step
// translates/summarizes to Korean. Requires FINNHUB_API_KEY + a ticker;
// returns [] otherwise so the router falls back to Google RSS.
//
// Yahoo Finance is intentionally deferred: it needs a RapidAPI subscription
// (no key yet) and the endpoint contract varies by provider — not guessed here.

import type { Article, AdapterContext, NewsAdapter } from "./types";

const ENDPOINT = "https://finnhub.io/api/v1/company-news";

interface FinnhubItem {
  datetime: number; // unix seconds
  headline: string;
  summary?: string;
  source?: string;
  url: string;
}

function ymd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Parse a Finnhub company-news array into recent Articles. Exported for tests. */
export function parseFinnhub(
  items: FinnhubItem[],
  recencyDays: number,
  nowMs: number,
): Article[] {
  const cutoff = nowMs - recencyDays * 24 * 60 * 60 * 1000;
  const out: Article[] = [];
  for (const it of items ?? []) {
    const ms = typeof it.datetime === "number" ? it.datetime * 1000 : NaN;
    if (Number.isNaN(ms) || ms < cutoff) continue;
    const title = (it.headline ?? "").trim();
    if (!title || !it.url) continue;
    const summary = it.summary?.trim();
    out.push({
      title,
      summary: summary && summary !== title ? summary : undefined,
      url: it.url,
      source: it.source?.trim() || "Finnhub",
      publishedAt: new Date(ms).toISOString(),
    });
  }
  return out;
}

export const finnhubAdapter: NewsAdapter = {
  id: "finnhub",
  async fetch(ctx: AdapterContext): Promise<Article[]> {
    const token = process.env.FINNHUB_API_KEY;
    if (!token || !ctx.ticker) return [];

    const now = Date.now();
    const from = ymd(now - ctx.recencyDays * 24 * 60 * 60 * 1000);
    const to = ymd(now);
    const url = `${ENDPOINT}?symbol=${encodeURIComponent(ctx.ticker)}&from=${from}&to=${to}&token=${token}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return [];
      const body = (await res.json()) as FinnhubItem[];
      if (!Array.isArray(body)) return [];
      return parseFinnhub(body, ctx.recencyDays, now);
    } catch {
      return [];
    }
  },
};
