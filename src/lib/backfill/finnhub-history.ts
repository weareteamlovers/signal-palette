// Step 5 / backfill: historical company news from Finnhub (free tier ≈ last 1
// year). Queries in ~30-day windows because a single wide call caps its result
// count; throttles to stay under the 60-calls/min free limit; dedupes by
// normalized title and returns oldest-first. Server-only (FINNHUB_API_KEY).

import type { Article } from "@/lib/news/types";

const ENDPOINT = "https://finnhub.io/api/v1/company-news";
const DAY_MS = 24 * 60 * 60 * 1000;

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWindow(
  ticker: string,
  fromMs: number,
  toMs: number,
  token: string,
): Promise<Article[]> {
  const url = `${ENDPOINT}?symbol=${encodeURIComponent(ticker)}&from=${ymd(fromMs)}&to=${ymd(toMs)}&token=${token}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const body = (await res.json()) as FinnhubItem[];
    if (!Array.isArray(body)) return [];
    const out: Article[] = [];
    for (const it of body) {
      const ms = typeof it.datetime === "number" ? it.datetime * 1000 : NaN;
      const title = (it.headline ?? "").trim();
      if (Number.isNaN(ms) || !title || !it.url) continue;
      out.push({
        title,
        summary: it.summary?.trim() || undefined,
        url: it.url,
        source: it.source?.trim() || "Finnhub",
        publishedAt: new Date(ms).toISOString(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** ~`days` of company news for a US ticker, deduped + oldest-first. [] without
 *  a key. `throttleMs` between window calls keeps it under 60/min. */
export async function fetchFinnhubHistory(
  ticker: string,
  days: number,
  throttleMs = 1100,
): Promise<Article[]> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return [];
  const now = Date.now();
  const all: Article[] = [];
  for (let w = now - days * DAY_MS; w < now; w += 30 * DAY_MS) {
    const end = Math.min(w + 30 * DAY_MS, now);
    all.push(...(await fetchWindow(ticker, w, end, token)));
    await sleep(throttleMs);
  }
  const seen = new Set<string>();
  const deduped: Article[] = [];
  for (const a of all) {
    const k = a.title.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    deduped.push(a);
  }
  deduped.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  return deduped;
}
