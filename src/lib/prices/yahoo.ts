// Low-level Yahoo Finance client (Step 5 / Phase 0). Raw fetch, no API key,
// graceful: every function resolves to []/null on any failure so the price
// layer degrades instead of throwing (matches the news adapters' style).
//
// Endpoints (no crumb/cookie needed):
//   - chart  query1 /v8/finance/chart/{symbol}   → daily candles
//   - search query2 /v1/finance/search?q=…        → symbol + sector/industry
// Yahoo rejects bare requests, so every call sends a browser-like User-Agent.
// NOTE: Yahoo search rejects Korean-name queries ("Invalid Search Query") —
// callers pass an ASCII query (US ticker, or the KR 6-digit code).

import type { Candle } from "./types";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
};

interface ChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: { close?: (number | null)[] }[];
    adjclose?: { adjclose?: (number | null)[] }[];
  };
}

/** Daily candles for [fromMs, toMs], ascending by date. Rows without a numeric
 *  close are dropped; adjClose falls back to close when absent. [] on failure. */
export async function fetchDailyCandles(
  symbol: string,
  fromMs: number,
  toMs: number,
): Promise<Candle[]> {
  const p1 = Math.floor(fromMs / 1000);
  const p2 = Math.floor(toMs / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?period1=${p1}&period2=${p2}&interval=1d`;
  try {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      chart?: { result?: ChartResult[] | null };
    };
    const r = body.chart?.result?.[0];
    const ts = r?.timestamp;
    if (!ts) return [];
    const close = r?.indicators?.quote?.[0]?.close ?? [];
    const adj = r?.indicators?.adjclose?.[0]?.adjclose ?? [];
    const out: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = close[i];
      if (typeof c !== "number") continue;
      const a = adj[i];
      out.push({
        date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
        close: c,
        adjClose: typeof a === "number" ? a : c,
      });
    }
    out.sort((x, y) => x.date.localeCompare(y.date));
    return out;
  } catch {
    return [];
  }
}

interface SearchQuote {
  symbol?: string;
  quoteType?: string;
  sector?: string;
  industry?: string;
}

/** Yahoo search → the best EQUITY quote (symbol + sector/industry), or null.
 *  Pass an ASCII query: US ticker or KR 6-digit code. */
export async function searchEquity(query: string): Promise<SearchQuote | null> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    query,
  )}&quotesCount=6&newsCount=0`;
  try {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { quotes?: SearchQuote[] };
    return (body.quotes ?? []).find((q) => q.quoteType === "EQUITY") ?? null;
  } catch {
    return null;
  }
}
